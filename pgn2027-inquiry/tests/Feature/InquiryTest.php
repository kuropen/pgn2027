<?php

namespace Tests\Feature;

use App\Mail\InquiryMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class InquiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_mail_text_preserves_special_characters(): void
    {
        $mail = new InquiryMail('test', 'A & B <tag> "quoted"');
        $this->assertSame('A & B <tag> "quoted"', trim($mail->render()));
    }

    public function test_queue_failure_rolls_back_both_mails_and_keeps_code(): void
    {
        $this->challenge();
        DB::unprepared("CREATE TRIGGER fail_second_job BEFORE INSERT ON jobs WHEN (SELECT COUNT(*) FROM jobs) = 1 BEGIN SELECT RAISE(ABORT, 'test queue failure'); END");
        $this->post('/inquiry', $this->payload())->assertSessionHasErrors('code');
        $this->assertDatabaseCount('jobs', 0);
        $this->assertDatabaseCount('inquiry_challenges', 1);
        DB::unprepared('DROP TRIGGER fail_second_job');
        $this->post('/inquiry', $this->payload())->assertSessionHas('complete');
        $this->assertDatabaseCount('jobs', 2);
    }

    public function test_code_is_bound_to_issuing_session(): void
    {
        Mail::fake();
        $this->challenge();
        $this->withSession(['challenge_id' => 'another-session'])->post('/inquiry', $this->payload())->assertSessionHasErrors('code');
        Mail::assertNothingQueued();
    }

    private function challenge(array $overrides = []): void
    {
        DB::table('inquiry_challenges')->insert(array_merge([
            'id' => 'test-challenge', 'email' => 'visitor@example.com',
            'code_hash' => Hash::make('123456'), 'expires_at' => now()->addMinutes(10), 'attempts' => 0,
        ], $overrides));
        $this->withSession(['challenge_id' => 'test-challenge']);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge(['code' => '123456', 'category' => 'fediverse', 'body' => 'テストのお問い合わせです。'], $overrides);
    }

    public function test_form_is_displayed(): void
    {
        $this->get('/')->assertOk()->assertSee('Kuropen.org inquiry')->assertSee('返信先メールアドレス');
    }

    public function test_code_is_queued_and_only_hash_is_saved(): void
    {
        Mail::fake();
        $this->post('/code', ['email' => 'visitor@example.com'])->assertRedirect('/')->assertSessionHas('challenge_id');
        $row = DB::table('inquiry_challenges')->first();
        Mail::assertQueued(InquiryMail::class, function ($mail) use ($row) {
            preg_match('/確認コード: ([0-9]{6})/', $mail->messageText, $matches);

            return $mail->hasTo('visitor@example.com') && Hash::check($matches[1], $row->code_hash);
        });
    }

    public function test_valid_code_routes_both_categories_and_cannot_be_reused(): void
    {
        foreach (['fediverse' => 'fedi-master@mi.kuropen.org', 'other' => 'webmaster@kuropen.org'] as $category => $recipient) {
            Mail::fake();
            $this->challenge();
            $this->post('/inquiry', $this->payload(['category' => $category, 'email' => 'attacker@example.com', 'recipient' => 'attacker@example.com']))->assertSessionHas('complete');
            Mail::assertQueued(InquiryMail::class, fn ($mail) => $mail->hasTo($recipient) && $mail->replyAddress === 'visitor@example.com');
            Mail::assertQueued(InquiryMail::class, fn ($mail) => $mail->hasTo('visitor@example.com'));
            Mail::assertQueuedCount(2);
            $this->withSession(['challenge_id' => 'test-challenge'])->post('/inquiry', $this->payload())->assertSessionHasErrors('code');
            Mail::assertQueuedCount(2);
        }
    }

    public function test_wrong_codes_lock_after_five_attempts(): void
    {
        Mail::fake();
        $this->challenge();
        for ($i = 0; $i < 5; $i++) {
            $this->post('/inquiry', $this->payload(['code' => '999999']))->assertSessionHasErrors('code');
        }
        $this->post('/inquiry', $this->payload())->assertSessionHasErrors('code');
        $this->assertDatabaseHas('inquiry_challenges', ['attempts' => 5]);
        Mail::assertNothingQueued();
    }

    public function test_expired_or_missing_code_cannot_send(): void
    {
        Mail::fake();
        $this->post('/inquiry', $this->payload())->assertSessionHasErrors('code');
        $this->challenge(['expires_at' => now()->subSecond()]);
        $this->post('/inquiry', $this->payload())->assertSessionHasErrors('code');
        Mail::assertNothingQueued();
    }

    public function test_invalid_category_and_empty_body_are_rejected(): void
    {
        Mail::fake();
        $this->challenge();
        $this->post('/inquiry', $this->payload(['category' => 'arbitrary', 'body' => '  ']))->assertSessionHasErrors(['category', 'body']);
        Mail::assertNothingQueued();
    }

    public function test_reset_invalidates_previous_code(): void
    {
        $this->challenge();
        $this->post('/reset')->assertRedirect('/')->assertSessionMissing('challenge_id');
        $this->assertDatabaseCount('inquiry_challenges', 0);
    }

    public function test_code_requests_are_rate_limited(): void
    {
        Mail::fake();
        $this->post('/code', ['email' => 'visitor@example.com'])->assertRedirect();
        $this->post('/code', ['email' => 'visitor@example.com'])->assertStatus(429);
        Mail::assertQueuedCount(1);
    }

    public function test_database_queue_is_atomic_and_encrypted(): void
    {
        config(['queue.default' => 'database']);
        $this->challenge();
        $this->post('/inquiry', $this->payload())->assertSessionHas('complete');
        $this->assertDatabaseCount('jobs', 2);
        $this->assertDatabaseCount('inquiry_challenges', 0);
        foreach (DB::table('jobs')->get() as $job) {
            $this->assertStringNotContainsString('visitor@example.com', $job->payload);
            $this->assertStringNotContainsString('テストのお問い合わせ', $job->payload);
        }
    }
}
