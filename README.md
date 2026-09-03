# @openfulldive/plugin-roadmap

The Roadmap plugin for OpenFullDive — contributor roadmaps toward the eight
full-dive capabilities. It is the reference plugin for the [build-time extension
platform](https://github.com/OpenFullDive/plugin-sdk): the host installs it as
an exactly version-pinned package, and it contributes a navigation entry, the
`/roadmap` UI, a search category, and per-user progress storage.

> **Status: `0.x` alpha**, tracking `@openfulldive/plugin-api@0.1`. Pin an exact
> version.

## What it owns, and what the host owns

- **This plugin owns** the roadmap content, the `RoadmapExplorer` component, and
  the search provider.
- **The host owns** the routes (`/roadmap`, `/roadmap/[slug]`), the actor and
  authorization, and the storage — the plugin never touches the database, a
  session, or a Server Action. Per-user state moves through a **storage bridge**
  the host passes into the component.

## Entry points

The client component, the search provider, and the safe metadata are separate
entry points, so the host never pulls a client component or a provider into the
wrong bundle:

```ts
import { roadmapManifest, legacyTrackAliases } from "@openfulldive/plugin-roadmap";        // metadata + content
import RoadmapExplorer, { type RoadmapStorage } from "@openfulldive/plugin-roadmap/ui";     // client component
import { searchRoadmap } from "@openfulldive/plugin-roadmap/server";                        // search provider
```

## Rendering the UI (host side)

```tsx
<RoadmapExplorer
  slug={slug}
  isSignedIn={Boolean(actor)}
  storage={{
    getState: () => getRoadmapState(),          // host Server Action / bridge
    setState: (key, value) => setRoadmapState(key, value),
  }}
/>
```

Signed out, or with no `storage`, the component falls back to `localStorage` on
its own — anonymous use stays fully functional.

## Consuming as source

This package ships TypeScript source and lists `react`, `react-dom`, and `next`
as **peer** dependencies (to avoid a duplicate React bundle). A Next.js host adds
it to `transpilePackages`:

```ts
// next.config.ts
transpilePackages: ["@openfulldive/plugin-roadmap"],
```

## Development

```sh
npm install
npm run typecheck
npm test          # content integrity, search, manifest, and no-private-deps checks
```

## License

Apache-2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) — the OpenFullDive
name and marks are reserved (Apache §6) and not granted by this license.
