<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class InquiryMail extends Mailable implements ShouldBeEncrypted
{
    use Queueable;

    public int $tries = 5;

    public function __construct(public string $mailSubject, public string $messageText, public ?string $replyAddress = null)
    {
        $this->onConnection('inquiry');
    }

    public function backoff(): array
    {
        return [60, 300, 900, 1800];
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->mailSubject, replyTo: $this->replyAddress ? [new Address($this->replyAddress)] : []);
    }

    public function content(): Content
    {
        return new Content(text: 'mail.inquiry');
    }
}
