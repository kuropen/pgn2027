<?php

namespace App\Jobs;

use App\Mail\InquiryMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Throwable;

class DeliverInquiryMail implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 60;

    public function __construct(public string $outboxId)
    {
        $this->onConnection('inquiry');
    }

    public function backoff(): array
    {
        return [60, 300, 900, 1800];
    }

    public function handle(): void
    {
        DB::transaction(function () {
            $query = DB::table('inquiry_outbox')->where('id', $this->outboxId);
            $record = (clone $query)->lockForUpdate()->first();
            if (! $record) {
                return;
            }

            $payload = json_decode(Crypt::decryptString($record->payload), true, flags: JSON_THROW_ON_ERROR);
            Mail::to($payload['recipient'])->send(new InquiryMail(
                $payload['subject'], $payload['body'], $payload['reply_to']
            ));
            $query->delete();
        });
    }

    public function failed(?Throwable $exception): void
    {
        DB::table('inquiry_outbox')->where('id', $this->outboxId)->update(['failed_at' => now()]);
    }
}
