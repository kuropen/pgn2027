<?php

namespace Tests\Feature;

use App\Jobs\DeliverInquiryMail;
use App\Mail\InquiryMail;
use App\Mail\QueueInquiryMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class InquiryOutboxTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['queue.connections.inquiry.driver' => 'redis']);
    }

    public function test_fresh_session_can_view_and_reset_without_an_empty_uuid_query(): void
    {
        DB::listen(function ($query) {
            if (str_contains($query->sql, 'inquiry_challenges')) {
                $this->assertNotContains('', $query->bindings);
            }
        });
        $this->get('/')->assertOk();
        $this->post('/reset')->assertRedirect('/');
    }

    private function record(): string
    {
        QueueInquiryMail::queue('visitor@example.com', new InquiryMail('Subject', 'Private message'));

        return DB::table('inquiry_outbox')->value('id');
    }

    public function test_payload_is_encrypted_and_delivery_is_not_started_before_commit(): void
    {
        Queue::fake();
        DB::beginTransaction();
        $id = $this->record();
        $payload = DB::table('inquiry_outbox')->where('id', $id)->value('payload');
        $this->assertStringNotContainsString('visitor@example.com', $payload);
        $this->assertStringContainsString('visitor@example.com', Crypt::decryptString($payload));
        Queue::assertNothingPushed();
        DB::rollBack();
        $this->assertDatabaseCount('inquiry_outbox', 0);
    }

    public function test_relay_enqueues_once_until_lease_expires(): void
    {
        Queue::fake();
        $id = $this->record();
        $this->artisan('inquiry:relay')->assertSuccessful();
        $this->artisan('inquiry:relay')->assertSuccessful();
        Queue::assertPushed(DeliverInquiryMail::class, fn ($job) => $job->outboxId === $id && $job->connection === 'inquiry');
        Queue::assertPushed(DeliverInquiryMail::class, 1);
        DB::table('inquiry_outbox')->update(['enqueued_at' => now()->subHours(2)]);
        $this->artisan('inquiry:relay')->assertSuccessful();
        Queue::assertPushed(DeliverInquiryMail::class, 2);
    }

    public function test_duplicate_job_does_not_send_duplicate_mail(): void
    {
        Mail::fake();
        $job = new DeliverInquiryMail($this->record());
        $job->handle();
        $job->handle();
        Mail::assertSent(InquiryMail::class, fn ($mail) => $mail->hasTo('visitor@example.com'));
        Mail::assertSentCount(1);
        $this->assertDatabaseCount('inquiry_outbox', 0);
    }

    public function test_failed_delivery_retains_payload_for_manual_retry(): void
    {
        Queue::fake();
        $id = $this->record();
        $job = new DeliverInquiryMail($id);
        $job->failed(new \RuntimeException('Mail unavailable'));
        $this->artisan('inquiry:relay')->assertSuccessful();
        Queue::assertNothingPushed();
        $this->assertDatabaseCount('inquiry_outbox', 1);
        Mail::fake();
        $job->handle();
        Mail::assertSentCount(1);
    }

    public function test_redis_outage_does_not_discard_outbox(): void
    {
        $id = $this->record();
        Queue::shouldReceive('connection')->andThrow(new \RuntimeException('Redis unavailable'));
        try {
            $this->artisan('inquiry:relay')->run();
            $this->fail('Relay should report the connection failure.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Redis unavailable', $exception->getMessage());
        }
        $this->assertDatabaseHas('inquiry_outbox', ['id' => $id, 'enqueued_at' => null]);
    }

    public function test_verified_inquiry_records_both_deliveries_atomically(): void
    {
        Queue::fake();
        DB::table('inquiry_challenges')->insert([
            'id' => 'challenge', 'email' => 'visitor@example.com',
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10), 'attempts' => 0,
        ]);
        $this->withSession(['challenge_id' => 'challenge'])->post('/inquiry', [
            'code' => '123456', 'category' => 'other', 'body' => 'Test inquiry',
        ])->assertSessionHas('complete');
        $this->assertDatabaseCount('inquiry_outbox', 2);
        $this->assertDatabaseCount('inquiry_challenges', 0);
        Queue::assertNothingPushed();
    }
}
