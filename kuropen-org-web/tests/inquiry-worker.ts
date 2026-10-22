import { WorkerEntrypoint } from 'cloudflare:workers';
import { InquiryCoordinator } from '../src/server/inquiry-coordinator';

// This harness uses only local Miniflare bindings; it never sends real email.
export class TestCoordinator extends InquiryCoordinator {
    async expire() {
        const row = this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM state WHERE key = 'challenge'").one();
        const challenge = JSON.parse(row.value);
        challenge.expires = 0;
        this.ctx.storage.sql.exec("UPDATE state SET value = ? WHERE key = 'challenge'", JSON.stringify(challenge));
    }
    async drain() { await this.alarm(); }
}

export class MockEmail extends WorkerEntrypoint {
    async send(message: { to: string; subject: string; text: string }) {
        const env = this.env as { MAIL: KVNamespace };
        if (await env.MAIL.get('fail') === 'yes') throw new Error('simulated provider failure');
        const key = message.subject.includes('確認コード') ? `code:${message.to}` : `mail:${message.to}`;
        await env.MAIL.put(key, JSON.stringify(message));
        return { messageId: crypto.randomUUID() };
    }
}

export default {
    async fetch(request: Request, env: { INQUIRY: DurableObjectNamespace<TestCoordinator> }) {
        const { name, method, args = [] } = await request.json() as { name: string; method: string; args: string[] };
        const stub = env.INQUIRY.getByName(name);
        let result;
        switch (method) {
            case 'issue': result = await stub.issue(args[0]); break;
            case 'submit': result = await stub.submit(args[0], args[1], args[2]); break;
            case 'view': result = await stub.view(); break;
            case 'reset': result = await stub.reset(); break;
            case 'expire': result = await stub.expire(); break;
            case 'drain': result = await stub.drain(); break;
            case 'rate': result = await stub.rate('code', 3, 3600); break;
            default: throw new Error('Unknown method');
        }
        return Response.json(result ?? null);
    },
};
