# AGENTS.md
This file provides guidance to OpenAI Codex when working with code in this repository.

## Overview
This is a personal website, finally located at https://kuropen.org/, built with Astro.
It is a Japanese-language website featuring a blog, portfolio, and about page.

## Technology Stack
- Astro 7.x
- TypeScript with strict mode disabled (uses Astro's base config)
- tailwindcss with Typography plugin

## Restriction on source code editing
Agents must **NOT** rewrite any original text by the author included in `*.astro` files, unless:
- there are some typographical error and permitted by the author in advance
- the agent is processing a translation request by the author
- adding or moving tag is needed when the agent is processing a feature request by author

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
