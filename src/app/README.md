# `src/app` — Application Shell (Phase 1 boundary)

Phase 1 defers the application shell. This folder is a placeholder so the source layout mirrors the architecture boundary: **simulation owns truth; renderer shows motion; persistence stores durable records; sync moves operations; UI configures and inspects state.**

Phase 3+ will populate this with the React + Vite app shell, routes, and view composition. Until then, `src/app` must not be imported by `src/simulation`, `src/domain`, or `src/content`.
