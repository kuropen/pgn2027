<?php

namespace App\Console\Commands;

use App\Jobs\DeliverInquiryMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RelayInquiryMail extends Command
{
    protected $signature = 'inquiry:relay';

    protected $description = 'Publish pending inquiry mail deliveries to Redis';

    public function handle(): int
    {
        $ids = DB::table('inquiry_outbox')
            ->whereNull('failed_at')
            ->where(fn ($query) => $query->whereNull('enqueued_at')->orWhere('enqueued_at', '<', now()->subHour()))
            ->orderBy('created_at')->limit(100)->pluck('id');

        foreach ($ids as $id) {
            DB::transaction(function () use ($id) {
                $query = DB::table('inquiry_outbox')->where('id', $id);
                $record = (clone $query)->lockForUpdate()->first();
                if (! $record || $record->failed_at || ($record->enqueued_at && now()->subHour()->lessThan($record->enqueued_at))) {
                    return;
                }

                // A duplicate Redis job is safe: delivery locks and consumes this row.
                DeliverInquiryMail::dispatch($id)->beforeCommit();
                $query->update(['enqueued_at' => now()]);
            });
        }

        return self::SUCCESS;
    }
}
