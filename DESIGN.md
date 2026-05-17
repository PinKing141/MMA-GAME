# OCTAGON · Design System

> **OCTAGON is a championship-night editorial broadcast. Every screen is a poster. Every panel is a graphic package. Every decision is a moment.**

If a new screen doesn't feel like it could be a slide on a UFC 300 broadcast or a page in a Sports Illustrated feature, it doesn't belong. That's the test. Apply it ruthlessly.

---

## The Style: Fight Card Editorial

Editorial fight-poster meets broadcast HUD. The visual language of a Dana White press conference shot for *The New Yorker*. Magazine layout with sports-broadcast information density. Dark, dramatic, deliberate, and grown-up.

Not "video game UI." Not "neon cyberpunk." Not "gritty street fight." The look of a championship night — high production, high stakes, high seriousness.

---

## Source of truth

All design tokens and reusable component classes live in:

```
src/octagon-design.css
```

Every HTML scene imports it. Scene-specific stylesheets layer on top, but they MUST NOT redefine the canonical tokens (`--red-bright`, `--gold`, `--text`, etc.).

If you find yourself overriding a token, stop and either (a) extend the system in `octagon-design.css`, or (b) reconsider the new design.

---

## The Four Pillars

### 1. Color palette

Backgrounds — never pure `#000000`:

| Token | Value | Use |
|---|---|---|
| `--bg-grad-top` | `#0a0a0e` | page background, top of radial gradients |
| `--surface` | `#14141a` | cards, panels |
| `--surface-2` | `#1c1c24` | input fields, headers |
| `--surface-3` | `#25252e` | raised elements |
| `--surface-4` | `#2f2f3a` | top elevation |

Borders:

| Token | Value | Use |
|---|---|---|
| `--border` | `#2a2a34` | default |
| `--border-strong` | `#3a3a46` | hover / focus |

Text — warm whites, not pure white:

| Token | Value | Use |
|---|---|---|
| `--text` | `#f1ede6` | primary (slight cream tone) |
| `--text-muted` | `#8a8a94` | secondary |
| `--text-dim` | `#54545e` | labels, eyebrow detail |

Accent colors — each has a specific meaning. Never use them randomly:

| Token | Value | Meaning |
|---|---|---|
| `--red-bright` | `#e21d36` | danger, player's corner, hostile actions, fight outcomes |
| `--blue-bright` | `#2563eb` | opponent's corner, defensive actions |
| `--gold` / `--gold-bright` | `#d4af37` / `#f0c850` | value, prestige, championships, money, agency |
| `--green` | `#16a34a` | success, "on weight", easy matchups |

**Critical rule:** never introduce a fifth accent color. No orange, purple, pink, cyan. Convey new information with intensity (bright gold vs dim gold) or pairing (gold + red), not new hues. Restraint is the design.

### 2. Type system

| Font | Use |
|---|---|
| **Anton** | display — headlines, names, big numbers, button labels |
| **Manrope** | body — descriptions, prose |
| **JetBrains Mono** | labels, codes, timestamps, broadcast lower-third data |
| **Playfair Display (italic)** | quotes, editorial headlines, contracts — sparingly |

Hierarchy:

| Role | Style |
|---|---|
| Eyebrow | mono, 9–10px, 2–3px letter-spacing, red or gold, UPPERCASE |
| Display headline | Anton, 40–80px, tight line-height |
| Subtitle | Manrope, 15–16px, muted color |
| Section header | Anton, 18–22px, 1–2px letter-spacing |
| Body | Manrope, 13–14px, line-height 1.5–1.6 |
| Label | mono, 9–10px, UPPERCASE, dim |
| Value | Anton or mono bold |

**Critical rule:** label → mono UPPERCASE with letter-spacing. Value → Anton. Prose → Manrope. Don't mix.

### 3. Layout grammar

- **3px top accent stripe** on every card / panel / surface. Red for fighter, gold for prestige, white/border for neutral.
- **Corner pill / metadata row** top-right of cards: mono label + value (`OVR 76`, `#14 · WW`).
- **Bottom-of-card stat strip:** mono labels above Anton values, separated by a thin border.
- **Eyebrow → headline → subtitle stack** opens every scene.
- **Generous negative space.** Don't cram. Dense info inside cards, lots of black around them.

Every new scene starts with: `broadcast-bar → eyebrow → scene-title → scene-subtitle → content (with 3px accent stripes on cards) → optional action bar`.

### 4. Atmospheric layer

- **Radial gradient backgrounds** — never flat black. `radial-gradient(ellipse at top, var(--bg-grad-top), #000)`.
- **Subtle scanlines** — `repeating-linear-gradient(0deg, rgba(255,255,255,0.01) 0 1px, transparent 1px 3px)` overlay on body.
- **Tier-tinted radial glows** behind portraits, belts, championship art.
- **Hover glow shadow** — `box-shadow: 0 20px 60px -20px var(--tier-glow)` on interactive cards.

**Critical rule:** no flat backgrounds. Every surface has gradient, scanlines, radial glow, or all three.

---

## Reusable classes

Defined in `src/octagon-design.css`:

- `.broadcast-bar` — top page bar (logo, build tag, phase, save tools)
- `.eyebrow` — mono uppercase label with leading dash
- `.scene-title` — Anton display headline
- `.scene-subtitle` — Manrope body subtitle
- `.btn`, `.btn.ghost`, `.btn.gold`, `.btn.small` — buttons
- `.editorial-card` — base card with optional `--accent-red`, `--accent-gold`, `--accent-neutral` 3px top stripe
- `.stat-pill`, `.fighter-pill` — corner pills
- `.bottom-stat-strip` — bottom-of-card mono-label / Anton-value row
- `.continue-bar` — action footer

If you need something new, add it here first.

---

## When in doubt

1. Read this file.
2. If the answer isn't here, look at how the press conference (`new stufff/interview.html`) or weigh-in (`new stufff/weigh-in.html`) screens solved it.
3. If still unclear, add the rule here before shipping the screen.
