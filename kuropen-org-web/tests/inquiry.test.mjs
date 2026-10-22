import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, kCurrentWorker, convertV4MiniflareOptions } from 'miniflare';
import { validateInquiry, verifyTurnstile } from '../src/server/inquiry.ts';

test('validates inquiry fields and rejects malformed input', () => {
    assert.equal(validateInquiry('123456', 'other', 'Hello'), null);
    for (const code of ['12345', '１２３４５６', '123456\n']) assert.ok(validateInquiry(code, 'other', 'Hello'));
    for (const category of ['unknown', '__proto__', 'constructor']) assert.ok(validateInquiry('123456', category, 'Hello'));
    assert.ok(validateInquiry('123456', 'other', ' '));
    assert.ok(validateInquiry('123456', 'other', 'a'.repeat(10001)));
});

test('Turnstile checks success, action and hostname and fails closed', async () => {
    const original = globalThis.fetch;
    const env = { TURNSTILE_SECRET_KEY: 'test', TURNSTILE_HOSTNAMES: 'kuropen.org' };
    const request = new Request('https://kuropen.org/inquiry');
    try {
        for (const [payload, expected] of [
            [{ success: true, action: 'inquiry_code', hostname: 'kuropen.org' }, true],
            [{ success: false, action: 'inquiry_code', hostname: 'kuropen.org' }, false],
            [{ success: true, action: 'inquiry_submit', hostname: 'kuropen.org' }, false],
            [{ success: true, action: 'inquiry_code', hostname: 'attacker.example' }, false],
        ]) {
            globalThis.fetch = async () => Response.json(payload);
            assert.equal(await verifyTurnstile(request, 'token', 'inquiry_code', env), expected);
        }
        assert.equal(await verifyTurnstile(request, '', 'inquiry_code', env), false);
        assert.equal(await verifyTurnstile(request, 'token', 'inquiry_code', {}), false);
    } finally { globalThis.fetch = original; }
});

test('Workers runtime: codes, five attempts, expiry, reset, concurrent consumption and outbox retries', async () => {
    const bundle = await build({ entryPoints: ['tests/inquiry-worker.ts'], bundle: true, write: false, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'] });
    const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{ name: 'test',
        modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-21',
        durableObjects: { INQUIRY: { className: 'TestCoordinator', useSQLite: true } },
        kvNamespaces: ['INQUIRY_CODES', 'MAIL'],
        serviceBindings: { EMAIL: { name: kCurrentWorker, entrypoint: 'MockEmail' } },
        bindings: { INQUIRY_FROM: 'inquiry@example.com' },
    }] }));
    try {
        const mail = await mf.getKVNamespace('MAIL');
        const codes = await mf.getKVNamespace('INQUIRY_CODES');
        const call = async (name, method, ...args) => {
            const response = await mf.dispatchFetch('http://test/', { method: 'POST', body: JSON.stringify({ name, method, args }) });
            assert.equal(response.status, 200, await response.clone().text());
            return response.json();
        };
        const issue = async name => {
            const email = `${name}@example.com`;
            assert.equal(await call(name, 'issue', email), null);
            const message = JSON.parse(await mail.get(`code:${email}`));
            const code = message.text.match(/\d{6}/)[0];
            return { email, code };
        };
        const first = await issue('first');
        assert.deepEqual(await call('first', 'view'), { email: first.email });
        const stored = await codes.list();
        assert.ok(stored.keys.length);
        assert.match(await codes.get(stored.keys[0].name), /^[a-f0-9]{64}$/);
        const results = await Promise.all([call('first', 'submit', first.code, 'fediverse', '<script>test</script>'), call('first', 'submit', first.code, 'other', 'Duplicate')]);
        assert.equal(results.filter(value => value === null).length, 1);
        await mail.put('fail', 'yes');
        await call('first', 'drain');
        assert.equal(await mail.get('mail:fedi-master@mi.kuropen.org'), null);
        await mail.put('fail', 'no');
        await call('first', 'drain');
        const received = JSON.parse(await mail.get('mail:fedi-master@mi.kuropen.org'));
        assert.equal(received.replyTo, first.email);
        assert.ok(received.html.includes('&lt;script&gt;'));
        assert.ok(await mail.get(`mail:${first.email}`));
        assert.ok(await call('first', 'submit', first.code, 'other', 'Replay'));
        const locked = await issue('locked');
        const wrong = locked.code === '100000' ? '100001' : '100000';
        for (let i = 0; i < 5; i++) assert.ok(await call('locked', 'submit', wrong, 'other', 'Hello'));
        assert.ok(await call('locked', 'submit', locked.code, 'other', 'Hello'));
        const expired = await issue('expired');
        await call('expired', 'expire');
        assert.ok(await call('expired', 'submit', expired.code, 'other', 'Hello'));
        const reset = await issue('reset');
        await call('reset', 'reset');
        assert.equal(await call('reset', 'view'), null);
        assert.ok(await call('reset', 'submit', reset.code, 'other', 'Hello'));
        for (let i = 0; i < 3; i++) assert.equal(await call('rate', 'rate'), true);
        assert.equal(await call('rate', 'rate'), false);
        await mail.put('fail', 'yes');
        assert.ok(await call('failed', 'issue', 'failed@example.com'));
        assert.equal(await call('failed', 'view'), null);
    } finally { await mf.dispose(); }
});
