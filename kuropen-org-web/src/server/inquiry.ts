export const categories = {
    fediverse: { label: 'Fediverseサーバー（MICROPEN）に関する問い合わせ', recipient: 'fedi-master@mi.kuropen.org' },
    other: { label: 'その他のKuropenへの問い合わせ', recipient: 'webmaster@kuropen.org' },
};

export async function digest(value: string) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateInquiry(code: string, category: string, body: string) {
    if (!/^[0-9]{6}$/.test(code)) return '確認コードは半角数字6桁で入力してください。';
    if (!Object.hasOwn(categories, category)) return '問い合わせ種別を選択してください。';
    if (!body.trim() || Array.from(body).length > 10000) return '本文は1〜10,000文字で入力してください。';
    return null;
}

export async function verifyTurnstile(request: Request, token: string, action: string, env: Env) {
    if (!token || token.length > 2048 || !env.TURNSTILE_SECRET_KEY) return false;
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') || '' }),
        signal: AbortSignal.timeout(10000),
    });
    const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
    return response.ok && result.success === true && result.action === action
        && env.TURNSTILE_HOSTNAMES.split(',').map(host => host.trim()).includes(result.hostname || '');
}
