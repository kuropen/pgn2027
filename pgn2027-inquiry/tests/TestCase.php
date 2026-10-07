<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function fakeTurnstile(string $action): void
    {
        config(['services.turnstile.secret' => 'test-secret', 'services.turnstile.sitekey' => 'test-sitekey', 'services.turnstile.hostnames' => ['localhost']]);
        Http::preventStrayRequests();
        Http::fake(['https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
            'success' => true, 'action' => $action, 'hostname' => 'localhost',
        ])]);
    }
}
