<?php

namespace App\Http\Controllers;

use App\Mail\InquiryMail;
use App\Mail\QueueInquiryMail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class InquiryController extends Controller
{
    public function index(Request $request): View
    {
        $challenge = DB::table('inquiry_challenges')->find($request->session()->get('challenge_id'));

        return view('inquiry', ['challenge' => $challenge, 'categories' => config('inquiry.categories')]);
    }

    public function code(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'string', 'email:rfc', 'max:254']], [
            'email.required' => '返信先のメールアドレスを入力してください。',
            'email.email' => '有効なメールアドレスを入力してください。',
            'email.max' => 'メールアドレスは254文字以内で入力してください。',
        ]);
        $email = trim($data['email']);
        $key = 'inquiry-email:'.hash('sha256', Str::lower($email));
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return back()->withErrors(['email' => 'このメールアドレスへの送信回数が上限に達しました。1時間ほど待ってからお試しください。']);
        }
        RateLimiter::hit($key, 3600);
        $id = (string) Str::uuid();
        $code = (string) random_int(100000, 999999);
        try {
            DB::transaction(function () use ($request, $email, $id, $code) {
                DB::table('inquiry_challenges')->where('id', $request->session()->get('challenge_id'))->delete();
                DB::table('inquiry_challenges')->insert([
                    'id' => $id, 'email' => $email, 'code_hash' => Hash::make($code),
                    'expires_at' => now()->addMinutes(10), 'attempts' => 0,
                ]);
                QueueInquiryMail::queue($email, (new InquiryMail('【Kuropen.org inquiry】確認コード',
                    "確認コード: {$code}\n\n有効期限は発行から10分です。フォームに戻り、確認コードとお問い合わせ内容を入力してください。\n心当たりのない場合、このメールは破棄してください。"
                ))->beforeCommit());
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['email' => '確認コードの送信を受け付けられませんでした。しばらくしてから再度お試しください。']);
        }
        $request->session()->put('challenge_id', $id);

        return redirect()->route('inquiry')->with('status', '確認コードの送信を受け付けました。メールをご確認ください。');
    }

    public function submit(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'regex:/\A[0-9]{6}\z/'],
            'category' => ['required', Rule::in(array_keys(config('inquiry.categories')))],
            'body' => ['required', 'string', 'max:10000'],
        ], [
            'code.required' => '確認コードを入力してください。', 'code.regex' => '確認コードは半角数字6桁で入力してください。',
            'category.required' => '問い合わせ種別を選択してください。', 'category.in' => '問い合わせ種別を選び直してください。',
            'body.required' => 'お問い合わせ本文を入力してください。', 'body.max' => '本文は10,000文字以内で入力してください。',
        ]);
        try {
            $error = DB::transaction(function () use ($request, $data) {
                $query = DB::table('inquiry_challenges')->where('id', $request->session()->get('challenge_id'));
                $challenge = (clone $query)->lockForUpdate()->first();
                if (! $challenge || now()->greaterThanOrEqualTo($challenge->expires_at) || $challenge->attempts >= 5) {
                    return '確認コードが期限切れ、または試行回数の上限に達しました。コードを再発行してください。';
                }
                if (! Hash::check($data['code'], $challenge->code_hash)) {
                    $query->increment('attempts');

                    return '確認コードが一致しません。5回間違えると再発行が必要です。';
                }
                $category = config('inquiry.categories.'.$data['category']);
                $reference = (string) Str::uuid();
                $text = "受付番号: {$reference}\n返信先: {$challenge->email}\n種別: {$category['label']}\n\n{$data['body']}";
                QueueInquiryMail::queue($category['recipient'], (new InquiryMail('【Kuropen.org inquiry】'.$category['label'], $text, $challenge->email))->beforeCommit());
                QueueInquiryMail::queue($challenge->email, (new InquiryMail('【Kuropen.org inquiry】お問い合わせを受け付けました', "お問い合わせありがとうございます。以下の内容で受け付けました。\n\n".$text))->beforeCommit());
                $query->delete();

                return null;
            });
        } catch (\Throwable $e) {
            report($e);
            $error = 'お問い合わせを受け付けられませんでした。しばらくしてから再度お試しください。';
        }
        if ($error) {
            return back()->withErrors(['code' => $error])->withInput($request->only('category', 'body'));
        }
        $request->session()->forget('challenge_id');

        return redirect()->route('inquiry')->with('complete', true);
    }

    public function reset(Request $request): RedirectResponse
    {
        DB::table('inquiry_challenges')->where('id', $request->session()->pull('challenge_id'))->delete();

        return redirect()->route('inquiry');
    }
}
