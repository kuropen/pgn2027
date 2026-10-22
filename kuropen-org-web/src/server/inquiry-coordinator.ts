import { DurableObject } from 'cloudflare:workers';
import { categories, digest, validateInquiry } from './inquiry';

type Challenge = { id: string; email: string; expires: number; attempts: number; busy?: boolean; complete?: boolean };
type Mail = { to: string; subject: string; text: string; replyTo?: string };

export class InquiryCoordinator extends DurableObject<Env> {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    }

    private read<T>(key: string): T | undefined {
        const row = this.ctx.storage.sql.exec<{ value: string }>('SELECT value FROM state WHERE key = ?', key).toArray()[0];
        return row ? JSON.parse(row.value) : undefined;
    }

    private write(key: string, value: unknown) {
        this.ctx.storage.sql.exec('INSERT OR REPLACE INTO state VALUES (?, ?)', key, JSON.stringify(value));
    }

    async rate(key: string, maximum: number, seconds: number) {
        const now = Date.now();
        const old = this.read<{ count: number; expires: number }>(key);
        const counter = old && old.expires > now ? old : { count: 0, expires: now + seconds * 1000 };
        if (counter.count >= maximum) return false;
        counter.count++;
        this.write(key, counter);
        await this.ctx.storage.setAlarm(now + 3600000);
        return true;
    }

    async view() {
        const challenge = this.read<Challenge>('challenge');
        return challenge && !challenge.complete && challenge.expires > Date.now() ? { email: challenge.email } : null;
    }

    async issue(email: string) {
        if (this.read<Mail[]>('outbox')?.length) return 'お問い合わせは受付済みです。新しいフォームを開いてください。';
        const previous = this.read<Challenge>('challenge');
        if (previous?.complete) return 'お問い合わせは受付済みです。新しいフォームを開いてください。';
        if (previous?.busy) return '処理中です。しばらくしてからお試しください。';
        const id = crypto.randomUUID();
        const challenge: Challenge = { id, email, expires: Date.now() + 600000, attempts: 0, busy: true };
        this.write('challenge', challenge);
        await this.ctx.storage.setAlarm(Date.now() + 3600000);
        try {
            const random = new Uint32Array(1);
            // Rejection sampling keeps every six-digit code equally likely.
            do { crypto.getRandomValues(random); } while (random[0] >= 4294800000);
            const code = String(100000 + random[0] % 900000);
            await this.env.INQUIRY_CODES.put(id, await digest(`${id}:${code}`), { expirationTtl: 600 });
            await this.send({ to: email, subject: '【Kuropen.org inquiry】確認コード', text: `確認コード: ${code}\n\n有効期限は発行から10分です。フォームに戻り、確認コードとお問い合わせ内容を入力してください。\n心当たりのない場合、このメールは破棄してください。` });
            if (previous) await this.env.INQUIRY_CODES.delete(previous.id);
            challenge.busy = false;
            this.write('challenge', challenge);
            return null;
        } catch {
            this.ctx.storage.sql.exec('DELETE FROM state WHERE key = ?', 'challenge');
            await this.env.INQUIRY_CODES.delete(id);
            console.error(JSON.stringify({ event: 'inquiry_code_send_failed' }));
            return '確認コードを送信できませんでした。しばらくしてから再度お試しください。';
        }
    }

    async reset() {
        const challenge = this.read<Challenge>('challenge');
        if (challenge?.busy) return;
        this.ctx.storage.sql.exec('DELETE FROM state WHERE key = ?', 'challenge');
        if (challenge) await this.env.INQUIRY_CODES.delete(challenge.id);
    }

    async submit(code: string, category: string, body: string) {
        const invalid = validateInquiry(code, category, body);
        if (invalid) return invalid;
        const challenge = this.read<Challenge>('challenge');
        if (!challenge || challenge.complete || challenge.expires <= Date.now() || challenge.attempts >= 5) {
            return '確認コードが期限切れ、または試行回数の上限に達しました。コードを再発行してください。';
        }
        if (challenge.busy) return '処理中です。しばらくしてからお試しください。';
        challenge.busy = true;
        challenge.attempts++;
        this.write('challenge', challenge);
        try {
            const expected = await this.env.INQUIRY_CODES.get(challenge.id);
            const actual = await digest(`${challenge.id}:${code}`);
            // Compare equal-length digests without a content-dependent early exit.
            let difference = expected?.length === actual.length ? 0 : 1;
            for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ (expected?.charCodeAt(i) || 0);
            if (difference !== 0) return '確認コードが一致しません。5回間違えると再発行が必要です。';
            const selected = categories[category as keyof typeof categories];
            const reference = crypto.randomUUID();
            const text = `受付番号: ${reference}\n返信先: ${challenge.email}\n種別: ${selected.label}\n\n${body}`;
            // Commit both messages and consume the challenge together before external delivery.
            this.ctx.storage.transactionSync(() => {
                this.write('outbox', [
                    { to: selected.recipient, subject: `【Kuropen.org inquiry】${selected.label}`, text, replyTo: challenge.email },
                    { to: challenge.email, subject: '【Kuropen.org inquiry】お問い合わせを受け付けました', text: `お問い合わせありがとうございます。以下の内容で受け付けました。\n\n${text}` },
                ]);
                challenge.complete = true;
                this.write('challenge', challenge);
            });
            await this.ctx.storage.setAlarm(Date.now() + 1000);
            return null;
        } finally {
            challenge.busy = false;
            this.write('challenge', challenge);
        }
    }

    private async send(mail: Mail) {
        const html = `<pre>${mail.text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)}</pre>`;
        await this.env.EMAIL.send({ from: this.env.INQUIRY_FROM, ...mail, html });
    }

    async alarm() {
        const messages = this.read<Mail[]>('outbox') || [];
        try {
            while (messages.length) {
                await this.send(messages[0]);
                messages.shift();
                this.write('outbox', messages);
            }
        } catch {
            console.error(JSON.stringify({ event: 'inquiry_delivery_retry' }));
            await this.ctx.storage.setAlarm(Date.now() + 60000);
            return;
        }
        const challenge = this.read<Challenge>('challenge');
        if (challenge) await this.env.INQUIRY_CODES.delete(challenge.id);
        this.ctx.storage.sql.exec('DELETE FROM state');
        await this.ctx.storage.deleteAlarm();
    }
}
