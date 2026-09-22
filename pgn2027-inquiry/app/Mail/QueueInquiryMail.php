<?php

namespace App\Mail;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class QueueInquiryMail
{
    public static function queue(string $recipient, InquiryMail $mail): void
    {
        if (config('queue.connections.inquiry.driver') !== 'redis') {
            Mail::to($recipient)->queue($mail->beforeCommit());

            return;
        }

        DB::table('inquiry_outbox')->insert([
            'id' => (string) Str::uuid(),
            'payload' => Crypt::encryptString(json_encode([
                'recipient' => $recipient,
                'subject' => $mail->mailSubject,
                'body' => $mail->messageText,
                'reply_to' => $mail->replyAddress,
            ], JSON_THROW_ON_ERROR)),
            'created_at' => now(),
        ]);
    }
}
