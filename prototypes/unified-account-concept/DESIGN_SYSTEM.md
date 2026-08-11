# Unified account concept — design system

## Visual direction

The prototype keeps SyncSpace recognizable while making the landing page more decisive. The
signature idea is one account at the center of a simple orbit: `Post`, `Join`, and `Collaborate`.
The layout uses open white space, strong type, hairline borders, and a small number of large
interactive surfaces.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#10231f` | Text, primary actions, workspace sidebar |
| Lime | `#d5ff55` | Post path, selected navigation, primary highlights |
| Mint | `#c7f2dd` | Join/team context and supporting surfaces |
| Lavender | `#d9d4ff` | Join path and collaborator identity |
| Coral | `#ff806b` | Keyboard focus ring |
| White | `#ffffff` | Exact page and panel background |
| Hairline | `#17302a` | Primary borders |

- Typeface: `Inter`, `Segoe UI Variable`, `Segoe UI`, then system sans-serif.
- Hero: heavy grotesk, tight tracking, `0.94` line height.
- UI controls: 650–800 weight with explicit sizes; no browser-default button text.
- Corners: 12px controls, 20px routes/panels, 28px section frame.
- Motion: 180ms hover response; 550–900ms entrance animation; reduced-motion fallback.
- Container model: open sections, one framed action switchboard, one contact rail. No card grid.

## Allowed first-viewport copy

- SyncSpace
- How it works
- Contact privacy
- Sign in
- One account. Build something—or join what’s already moving.
- Post your idea, discover the right project, and meet your team without switching roles.
- Explore projects
- Post a project

## Visual references

- `visual-reference/landing-concept.png`
- `visual-reference/account-concept.png`

The raster files are implementation references only. All shipped interface text, controls, the
orbit, and icons are code-native.
