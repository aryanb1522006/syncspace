# SyncSpace unified-account UI experiment

This is a standalone test website. It does not import, replace, or modify the production SyncSpace
client or server.

It demonstrates:

- one mock login followed by both `Post a project` and `Join a project` options;
- a landing-page-focused visual direction using Three.js for the account orbit;
- Anime.js entrance and transition motion;
- accepted team members seeing one another’s email address;
- pending applicants being excluded by the shared contact-access model;
- deliberately shallow, local-only post and join interactions.

## Run locally

```powershell
cd "C:\Users\Aryan\Documents\Codex\2026-08-10\bu\outputs\syncspace\prototypes\unified-account-concept"
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite. Use the prefilled mock login. No real credentials are sent.

## Run test code

```powershell
npm.cmd test
npm.cmd run build
```

The tests cover the centralized account capabilities, accepted-team email visibility, pending-user
denial, requested animation dependencies, reduced-motion support, and the no-production-write
boundary.

## Key files

- `index.html` — landing page, mock sign-in, and compact unified workspace.
- `src/orbit-scene.js` — Three.js account orbit.
- `src/main.js` — Anime.js motion and local prototype interactions.
- `src/access-model.js` — framework-independent capability and email-visibility rules.
- `tests/` — executable test code.
- `docs/UI_IDEAS_AND_RULES.md` — recommended product changes and production security rule.
- `visual-reference/` — generated concept images used for visual QA only.

## Important boundary

This prototype is not wired to Render, Supabase, Appwrite, or the live SyncSpace API. The post form
saves no data, the join buttons send no application, and the example emails are demo data.
