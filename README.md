# mongoDB-build-fest

## Layout

- `web/` — Next.js frontend (staff dashboard + patient enrollment UI). Run with `npm --prefix web run dev`.
- `app/` — Python backend.

The frontend lives under `web/` specifically so its Next.js `app/` router directory doesn't collide with the backend's root-level `app/` package.
