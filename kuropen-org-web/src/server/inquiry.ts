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

export async function verifyHCaptcha(request: Request, token: string, env: Env) {
    if (!token || token.length > 16384 || !env.HCAPTCHA_SECRET_KEY?.trim()
        || !env.HCAPTCHA_SITE_KEY?.trim() || !env.HCAPTCHA_HOSTNAMES?.trim()) return false;
    try {
        const response = await fetch('https://api.hcaptcha.com/siteverify', {
            method: 'POST',
            body: new URLSearchParams({ secret: env.HCAPTCHA_SECRET_KEY, sitekey: env.HCAPTCHA_SITE_KEY,
                response: token, remoteip: request.headers.get('CF-Connecting-IP') || '' }),
            signal: AbortSignal.timeout(10000),
        });
        const result = await response.json() as { success?: boolean; hostname?: string } | null;
        return response.ok && result?.success === true
            && env.HCAPTCHA_HOSTNAMES.split(',').map(host => host.trim()).includes(result.hostname || '');
    } catch {
        return false;
    }
}
