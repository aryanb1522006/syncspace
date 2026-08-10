# SyncSpace visual implementation spec

This spec was extracted from the three accepted concept images in `docs/design/` before React implementation.

## Color lock

| Token | Value | Role |
|---|---:|---|
| Canvas | `#ffffff` | True-white page and app background |
| Ink | `#12231f` | Headings, outlines, primary text |
| Muted | `#64706d` | Secondary text |
| Line | `#d9dfdc` | Dividers and control borders |
| Chartreuse | `#d8ff62` | Primary actions and score emphasis |
| Chartreuse strong | `#b8e61d` | Progress fills and focus rings |
| Mint | `#bcebd4` | Success, skill, selected navigation |
| Lavender | `#dcd7ff` | Secondary project/category accent |
| Coral | `#ff7d66` | Warnings and tertiary accents |
| Soft | `#f6f8f7` | Hover and low-contrast surfaces |

The concepts use a true white background. No cream, gray wash, dark mode, glass blur, or content overlay is permitted.

## Typography

- Manrope variable family, with system sans-serif fallback.
- Display: 56–68px / 0.98, weight 800 on landing; 42px / 1.08 in app headers.
- Section: 28–36px / 1.15, weight 750–800.
- Body: 15–18px / 1.55, weight 400–500.
- App controls: 13–15px / 1.2, weight 600–700; never browser-default control type.

## Layout and containers

- Landing: 32px page gutter, max width 1400px; asymmetrical 46/54 hero split.
- App: 224px fixed sidebar, flexible content, optional 264px right rail.
- Lists and boards use open rows, separators, and rails. Cards are reserved for recommendation expansion and focused utility modules.
- Desktop target is 1440×1000; app remains usable at 1280px. Below 900px, sidebar becomes a top/bottom mobile navigation and right rails join the content flow.

## Components

- Primary button: chartreuse fill, ink border, 10–12px radius, firm 700 weight.
- Secondary button: white fill, ink border; text link is underlined only on hover/focus.
- Project row: thin outline, 14px radius, horizontal anatomy; expanded breakdown separated by a single line.
- Match ring: code-native conic progress ring with centered score.
- Orbit mark: small code-native circular brand/skill motif; no rasterized UI.
- Sidebar: open white rail with one mint/chartreuse selected row.
- Task board: three open columns with colored top rules and tactile rows; no heavy kanban cards.
- Icons: Lucide outline family at 18–22px, stroke 1.8–2, currentColor.

## Allowed first-viewport copy

Landing and dashboard visible copy is limited to the text specified in the concept prompts and user brief. No eyebrow, kicker, badge, pricing claim, testimonial, or invented metric is added.

## Motion

- 160–220ms hover/expand transitions.
- A subtle orbit drift may appear behind the landing recommendation preview.
- All motion stops under `prefers-reduced-motion`.
