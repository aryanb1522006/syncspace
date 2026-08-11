# SyncSpace Join-first immersive prototype

This is a separate, local-only frontend experiment. It does not import, replace, or modify the
production SyncSpace client or server.

The landing page now focuses on discovering and joining projects. Posting an idea remains available,
but it is presented as the secondary path rather than marketing the account model itself.

## View locally

```powershell
cd "C:\Users\Aryan\Documents\Codex\2026-08-10\bu\outputs\syncspace\prototypes\unified-account-immersive-v2"
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:4175/`.

## Working prototype features

- Join-first landing headline and navigation.
- `Sign up now` opens a local demo-profile flow.
- Five project examples: GreenGrid, StudyCircle, Campus Mobility, OpenLab, and LocalLens.
- Floating Three.js project clusters with moving signals flowing toward Join.
- Pointer-responsive spatial depth and scroll-linked convergence.
- Anime.js entrance and scroll-reveal motion.
- Both Join and Post actions after the demo profile is opened.
- Accepted-team-only contact email visibility.

## Verify

```powershell
npm.cmd test
npm.cmd run build
```

## Key files

- `index.html` — Join-first landing page, demo signup, and compact workspace.
- `src/constellation-scene.js` — floating projects, signal paths, particles, and pointer response.
- `src/main.js` — Anime.js motion and local-only mock workflows.
- `src/immersive-base.css` — shared immersive visual foundation.
- `src/join-first.css` — Join-first typography, project labels, and visual polish.
- `tests/` — access-control and UI structure regression tests.
- `visual-reference/join-first-hero-concept.png` — concept used for the revision.

## Safety boundary

This prototype is not connected to Render, Supabase, Appwrite, or the live SyncSpace API. Signup,
posting, and applications remain browser-only demonstrations. All displayed emails are demo data.
