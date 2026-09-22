# Kuropen.org inquiry

## Notes

This system is prototyped by OpenAI Codex, GPT-6.0 Astra.

## Overview

This is a inquiry form, finally located at https://inquiry.kuropen.org/.

To avoid abuse of E-Mail address (both the site administrator and someone who discloses for public interest), this system verifies the user's address first sending one-time PIN.

## Technology Stack
- Laravel 13
- Docker
- Railway (for production environment)

## Request and email delivery flow

The chart shows the production configuration: Laravel Octane with FrankenPHP, PostgreSQL for verification and encrypted outgoing mail, and Redis for sessions, rate limiting, and delivery jobs. An accepted inquiry is saved for delivery; it does not mean both emails have already been delivered.

```mermaid
flowchart TD
    subgraph FORM["Inquiry form"]
        A["Enter reply email address"] --> B{"Valid address and within sending limits?"}
        B -->|No| C["Show an error; correct input or wait"]
        C --> A
        B -->|Yes| D["Generate a six-digit code; replace the previous challenge<br/>Save its hash, expiry, and encrypted verification email in one DB transaction"]
        D --> E["Bind the challenge ID to the Redis session<br/>Show the inquiry form"]
        E --> F["Read the verification email<br/>Enter code, category, and message"]
        F --> G{"Valid input and within request limits?"}
        G -->|No| H["Show an error; preserve category and message where applicable"]
        H --> F
        G -->|Yes| I{"Session-bound challenge exists,<br/>less than 10 minutes old,<br/>and fewer than 5 failed attempts?"}
        I -->|No| J["Reject; require a new code"]
        I -->|Yes| K{"Code matches the stored hash?"}
        K -->|No| L["Increment failed attempts and reject<br/>After 5 failures, require a new code"]
        L --> F
        J --> R["Reset: delete challenge and clear session binding"]
        E -->|Change address or request a new code| R
        R --> A
        K -->|Yes| M{"Inquiry category"}
        M -->|MICROPEN / Fediverse| N["Select the configured server administrator"]
        M -->|Other| O["Select the configured general contact"]
        N --> P["In one DB transaction:<br/>save two encrypted outgoing emails and consume the code"]
        O --> P
        P --> Q["Clear the session binding<br/>Show the acceptance page"]
    end

    subgraph DELIVERY["Shared asynchronous email delivery"]
        OUT[("PostgreSQL encrypted outbox")]
        OUT --> T["Scheduler polls every 10 seconds"]
        T --> U["Enqueue delivery IDs in Redis"]
        U --> V["Worker locks the outbox record"]
        V --> W{"Record still exists?"}
        W -->|No| X["Skip an already completed delivery"]
        W -->|Yes| Y["Decrypt and send via Mailgun"]
        Y --> Z{"Send succeeded?"}
        Z -->|Yes| DONE["Delete the outbox record"]
        Z -->|No| RETRY["Keep the record and retry with backoff<br/>Up to 5 attempts per job"]
        RETRY -->|Attempts remain| V
        RETRY -->|Attempts exhausted| FAILED["Mark failed; stop automatic relay<br/>Operator investigates and retries"]
    end

    D -.->|Verification email to the reply address| OUT
    P -.->|Inquiry to the selected recipient and receipt to the verified address| OUT
```

If either form transaction fails, its database changes are rolled back and the form reports an error. Redis enqueue failures leave outgoing mail available for the next scheduler run. Pending deliveries enqueued more than an hour ago can be enqueued again; completed records are skipped. Delivery acknowledgments can still be lost, so an external email provider may receive a duplicate.

The local default uses the database queue and logs emails instead of using the production outbox/Redis/Mailgun path. Scheduled maintenance removes expired challenges hourly and prunes failed queue jobs older than seven days daily.

