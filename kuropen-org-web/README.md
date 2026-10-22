# Astro Starter Kit: Basics

## Inquiry form

`/inquiry` uses the Email Sending Workers API, `INQUIRY_CODES` KV, and an
`INQUIRY` Durable Object for single-use verification, rate limits, and a durable
mail outbox. KV stores only salted verification-code hashes, expiring after ten
minutes. The coordinator enforces five attempts and serializes consumption.
Delivery uses alarms with retries; as with any mail outbox, a crash after the
provider accepts a message but before recording success can cause a duplicate.

Before deployment:

- Enable Cloudflare Email Sending for `kuropen.org` and verify that the configured
  sender `inquiry@kuropen.org` can send transactional mail to public recipients.
- Set `TURNSTILE_SITE_KEY` and `TURNSTILE_HOSTNAMES` in `wrangler.jsonc`, and store
  `TURNSTILE_SECRET_KEY` as a Worker secret. Permit the production hostname in
  the Turnstile widget. The form stays disabled until keys are configured.
- KV is automatically provisioned on deployment; to use an existing namespace,
  add its `id` to the `INQUIRY_CODES` binding. Keep the Durable Object migration.
- Category destinations are defined in `src/server/inquiry.ts`.

For local development, copy `.dev.vars.example` to `.dev.vars` (preserve any
existing values), then use `npm run dev -- --background`. The example contains
Cloudflare's public Turnstile testing keys, for local use only. Email is simulated
locally; do not enable remote bindings for test runs. Run `npm test`,
`npm run generate-types`, and `npm run build` to validate changes.

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
