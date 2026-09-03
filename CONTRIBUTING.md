# Contributing to @openfulldive/plugin-roadmap

Thanks for your interest. This is the Roadmap plugin for OpenFullDive. Most
contributions here are **roadmap content** — new tracks, sections, topics, and
resources — plus fixes to the explorer UI and the search provider.

## Ground rules

- **Content is reviewed, not just merged.** The trust chain is: public PR →
  review → official release → the host pins an exact version. A roadmap is
  guidance for contributors, so accuracy and clear sourcing matter.
- **Reference OpenFullDive capabilities by stable slug, never an internal id.**
  Roadmap is not an alternate evidence ledger — a sourced technical claim links
  to real evidence through the host, it does not restate it here.
- **No dependency on anything private.** The plugin must build and test with only
  what it declares — no host alias (`@/…`), no database, no job queue, no auth
  internals. `no-private-deps.test.ts` enforces this; do not work around it.
- **Behaviour parity before redesign.** The explorer's existing behaviour —
  master roadmap, field detail, track search, tabs, progress, favourites, share,
  continue, mobile, missing-roadmap state, legacy `?track=` aliases — is the
  baseline. Change behaviour deliberately, with tests, not by accident.

## Developing

```sh
npm install
npm run typecheck
npm test          # content integrity, search, manifest, and no-private-deps
```

- Content lives in `src/content/`; the UI in `src/ui/`; the search provider in
  `src/search.ts`; the manifest in `src/manifest.ts`.
- Add or update tests for any content or behaviour change. New content must keep
  the integrity checks green — unique ids, valid category/level, resolving
  related ids, non-empty titles and topics.

## Submitting

- One purpose per PR; keep the diff focused.
- By contributing you agree your contribution is licensed under Apache-2.0.

## Security

Please do not open a public issue for a security concern — see
[SECURITY.md](./SECURITY.md).
