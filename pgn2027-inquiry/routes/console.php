<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Schedule::call(fn () => DB::table('inquiry_challenges')->where('expires_at', '<', now())->delete())->hourly();
Schedule::command('queue:prune-failed --hours=168')->daily();

Schedule::command('inquiry:relay')->everyTenSeconds()->withoutOverlapping();
