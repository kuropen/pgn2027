<?php

namespace Tests\Feature;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TurnstileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.turnstile.secret' => 'test-secret', 'services.turnstile.sitekey' => 'public-sitekey', 'services.turnstile.hostnames' => ['localhost']]);
    }

    /** @return array<string, array{string}> */
    public static function protectedRoutes(): array
    {
        return ['code' => ['/code'], 'inquiry' => ['/inquiry']];
    }

    #[DataProvider('protectedRoutes')]
    public function test_returns_403_without_token_before_changing_state(string $path): void
    {
        Http::preventStrayRequests();
        Mail::fake();
        $this->challenge();

        $this->post($path, ['email' => 'visitor@example.com', 'code' => '123456', 'category' => 'other', 'body' => 'Inquiry'])->assertForbidden();

        $this->assertDatabaseCount('inquiry_challenges', 1);
        $this->assertDatabaseCount('jobs', 0);
        $this->assertDatabaseCount('inquiry_outbox', 0);
        Mail::assertNothingQueued();
        Http::assertNothingSent();
    }

    /** @return array<string, array{mixed}> */
    public static function invalidTokens(): array
    {
        return ['empty' => [''], 'array' => [['token']], 'too long' => [str_repeat('a', 2049)]];
    }

    #[DataProvider('invalidTokens')]
    public function test_returns_403_for_invalid_token_without_contacting_cloudflare(mixed $token): void
    {
        Http::preventStrayRequests();
        $this->challenge();

        $this->post('/inquiry', $this->payload($token))->assertForbidden();

        $this->assertDatabaseCount('inquiry_challenges', 1);
        Http::assertNothingSent();
    }

    /** @return array<string, array{mixed, int}> */
    public static function rejectedResponses(): array
    {
        return [
            'failed challenge' => [['success' => false, 'action' => 'inquiry_submit', 'hostname' => 'localhost'], 200],
            'non boolean success' => [['success' => 'true', 'action' => 'inquiry_submit', 'hostname' => 'localhost'], 200],
            'wrong action' => [['success' => true, 'action' => 'inquiry_code', 'hostname' => 'localhost'], 200],
            'wrong hostname' => [['success' => true, 'action' => 'inquiry_submit', 'hostname' => 'attacker.example'], 200],
            'missing fields' => [['success' => true], 200],
            'non json' => ['not JSON', 200],
            'scalar json' => ['true', 200],
            'upstream error' => [['success' => true, 'action' => 'inquiry_submit', 'hostname' => 'localhost'], 503],
        ];
    }

    #[DataProvider('rejectedResponses')]
    public function test_returns_403_for_unverified_response_and_preserves_challenge(mixed $body, int $status): void
    {
        Http::preventStrayRequests();
        Http::fake(['https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response($body, $status)]);
        $this->challenge();

        $this->post('/inquiry', $this->payload('test-token'))->assertForbidden();

        $this->assertDatabaseCount('inquiry_challenges', 1);
        Http::assertSentCount(1);
    }

    public function test_returns_403_on_connection_failure_and_preserves_challenge(): void
    {
        Http::preventStrayRequests();
        Http::fake(['https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::failedConnection()]);
        $this->challenge();

        $this->post('/inquiry', $this->payload('test-token'))->assertForbidden();

        $this->assertDatabaseCount('inquiry_challenges', 1);
    }

    /** @return array<string, array{string, mixed}> */
    public static function missingConfiguration(): array
    {
        return ['missing secret' => ['secret', null], 'blank secret' => ['secret', ' '], 'no hostnames' => ['hostnames', []]];
    }

    #[DataProvider('missingConfiguration')]
    public function test_returns_403_when_configuration_is_missing(string $key, mixed $value): void
    {
        Http::preventStrayRequests();
        config(['services.turnstile.'.$key => $value]);

        $this->post('/inquiry', $this->payload('test-token'))->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_production_rejects_localhost_even_if_misconfigured(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        $this->withoutMiddleware(PreventRequestForgery::class);
        config(['services.turnstile.hostnames' => ['inquiry.kuropen.org', 'localhost', '127.0.0.1']]);
        Http::preventStrayRequests();
        Http::fake(['https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
            'success' => true, 'action' => 'inquiry_submit', 'hostname' => 'localhost',
        ])]);

        $this->post('/inquiry', $this->payload('test-token'))->assertForbidden();

        Http::assertSentCount(1);
    }

    public function test_canonical_verification_allows_inquiry_and_rejects_replayed_token(): void
    {
        Mail::fake();
        Http::preventStrayRequests();
        Http::fake(['https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::sequence()
            ->push(['success' => true, 'action' => 'inquiry_submit', 'hostname' => 'localhost'])
            ->push(['success' => false, 'error-codes' => ['timeout-or-duplicate']])]);
        $this->challenge();

        $this->post('/inquiry', $this->payload('single-use-token'))->assertRedirect('/')->assertSessionMissing('challenge_id');

        $this->assertDatabaseCount('inquiry_challenges', 0);
        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
            && $request->method() === 'POST'
            && $request->hasHeader('Content-Type', 'application/x-www-form-urlencoded')
            && $request['secret'] === 'test-secret'
            && $request['response'] === 'single-use-token'
            && $request['remoteip'] === '127.0.0.1');

        $this->challenge();
        $this->post('/inquiry', $this->payload('single-use-token'))->assertForbidden();
        $this->assertDatabaseCount('inquiry_challenges', 1);
        Http::assertSentCount(2);
        Mail::assertQueuedCount(2);
    }

    public function test_widget_actions_match_each_visible_form_and_secret_is_not_exposed(): void
    {
        $this->get('/')->assertSee('data-action="inquiry_code"', false)
            ->assertSee('data-sitekey="public-sitekey"', false)->assertDontSee('test-secret');

        $this->challenge();
        $this->get('/')->assertSee('data-action="inquiry_submit"', false)
            ->assertDontSee('data-action="inquiry_reset"', false)->assertDontSee('test-secret');
    }

    public function test_returns_403_for_replay_even_when_siteverify_returns_success_twice(): void
    {
        Mail::fake();
        $this->fakeTurnstile('inquiry_submit');
        $this->challenge();

        $this->post('/inquiry', $this->payload('single-use-token'))->assertRedirect('/');
        $this->assertDatabaseCount('inquiry_challenges', 0);

        $this->challenge();
        $this->post('/inquiry', $this->payload('single-use-token'))->assertForbidden();
        $this->assertDatabaseCount('inquiry_challenges', 1);
        Http::assertSentCount(2);
        Mail::assertQueuedCount(2);
    }

    /** @return array{code: string, category: string, body: string, cf-turnstile-response: mixed} */
    private function payload(mixed $token): array
    {
        return ['code' => '123456', 'category' => 'other', 'body' => 'Test inquiry', 'cf-turnstile-response' => $token];
    }

    private function challenge(): void
    {
        DB::table('inquiry_challenges')->insert([
            'id' => 'turnstile-challenge', 'email' => 'visitor@example.com',
            'code_hash' => Hash::make('123456'), 'expires_at' => now()->addMinutes(10), 'attempts' => 0,
        ]);
        $this->withSession(['challenge_id' => 'turnstile-challenge']);
    }
}
