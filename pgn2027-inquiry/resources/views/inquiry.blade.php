<!doctype html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Kuropen.org inquiry</title>
    <link rel="stylesheet" href="{{ asset('inquiry.css') }}">
</head>
<body>
<main>
    <header><a href="{{ route('inquiry') }}" class="brand">KUROPEN.ORG <span>CONTACT</span></a></header>
    <div class="intro"><p class="eyebrow">お問い合わせ</p><h1>Kuropen.org inquiry</h1><p>MICROPENに関すること、その他のご連絡はこちらから。</p></div>
    @if(session('complete'))
        <section class="card"><div class="success-icon" aria-hidden="true">✓</div><h2>お問い合わせを受け付けました</h2><p>ご入力いただいたメールアドレスへ確認メールをお送りします。</p><p>メールが届かない場合は、迷惑メールフォルダーもご確認ください。</p><a class="button" href="{{ route('inquiry') }}">新しいお問い合わせ</a></section>
    @else
        <ol class="steps" aria-label="入力の流れ"><li class="{{ !$challenge ? 'active' : '' }}">01 <span>メールアドレス</span></li><li class="{{ $challenge ? 'active' : '' }}">02 <span>確認・お問い合わせ</span></li></ol>
        <section class="card">
            @if(session('status'))<div class="notice" role="status">{{ session('status') }}</div>@endif
            @if($errors->any())<div class="errors" role="alert"><p>入力内容をご確認ください。</p><ul>@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul></div>@endif
            @if(!$challenge)
                <h2>返信先を確認します</h2><p class="description">いたずら防止のため、最初にメールアドレスを確認します。<br>入力したアドレスに6桁の確認コードをお送りします。</p>
                <form method="post" action="{{ route('inquiry.code') }}">@csrf
                    <label for="email">返信先メールアドレス <span class="required">必須</span></label>
                    <input id="email" type="email" name="email" value="{{ old('email') }}" autocomplete="email" placeholder="you@example.com" maxlength="254" required aria-describedby="email-help">
                    <p id="email-help" class="hint">受信できるメールアドレスを入力してください。</p>
                    <button type="submit">確認コードを送信 <span aria-hidden="true">→</span></button>
                </form>
            @else
                <h2>お問い合わせ内容を入力</h2><p class="description"><strong>{{ $challenge->email }}</strong> 宛ての確認コードを入力してください。有効期限は発行から10分です。</p>
                <form method="post" action="{{ route('inquiry.submit') }}">@csrf
                    <label for="code">確認コード <span class="required">必須</span></label><input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" required>
                    <label for="category">問い合わせ種別 <span class="required">必須</span></label><select id="category" name="category" required><option value="">選択してください</option>@foreach($categories as $key => $category)<option value="{{ $key }}" @selected(old('category') === $key)>{{ $category['label'] }}</option>@endforeach</select>
                    <label for="body">お問い合わせ本文 <span class="required">必須</span></label><textarea id="body" name="body" rows="8" maxlength="10000" required aria-describedby="body-help">{{ old('body') }}</textarea><p id="body-help" class="hint">10,000文字以内。パスワードなどの機密情報は入力しないでください。</p>
                    <button type="submit">お問い合わせを送信 <span aria-hidden="true">→</span></button>
                </form>
                <form method="post" action="{{ route('inquiry.reset') }}" class="reset">@csrf<button class="text-button" type="submit">メールアドレスの変更・コードの再発行</button><p class="hint">入力中の本文は消去されます。再発行後は古いコードを使用できません。</p></form>
            @endif
        </section>
        <p class="privacy">メールアドレスとお問い合わせ内容は、対応および確認メールの送信に使用します。</p>
    @endif
    <footer>Kuropen.org</footer>
</main>
</body>
</html>
