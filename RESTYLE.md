# VA-Lingo visual restyle (mhchow-aligned)

Restyled `index.html` to match the school gift-redemption (mhchow) primary-school visual language. Functionality unchanged.

## Tokens adopted

| Token | Value | Role |
|-------|-------|------|
| `--accent` | `#ff6b9d` | Primary pink |
| `--accent-dark` | `#e8437a` | Bubbly titles / emphasis |
| `--purple` | `#5b3a8c` | Secondary accents |
| `--soft` | `#ffe3ef` | Soft fills / blanks |
| `--text` | `#3b2a55` | Body text |
| `--muted` | `#7a6a8a` | Secondary text |
| `--line` | `#ffd6e8` | Borders |
| `--bg` | `#fff7fb` | Page background |
| `--radius` | `22px` | Card corners |
| `--shadow` | `0 12px 28px rgba(255,107,157,.16)` | Soft pink elevation |
| `--ok` | `#1abc9c` | Completed step pills |

Tailwind `va.*` aliases remapped: `va-blue` → accent-dark, `va-gold` → accent, `va-light` → soft, plus `va-purple` / `va-line` / `va-bg` / `va-ok`.

## Typography

- Google Fonts: **Yusei Magic** + **ZCOOL KuaiLe** (+ Noto Sans TC)
- Titles / comic labels: ZCOOL KuaiLe (`.comic`, `.title-bubble`)
- Body: Yusei Magic / rounded CJK stack

## Components

- **Buttons:** pill (`border-radius: 999px`); primary = `linear-gradient(90deg, #ff6b9d, #ff8e53)` + yellow under-shadow `0 3px 0 #ffd36b`
- **Cards / panels:** white, ~18–22px radius, pink border + soft pink shadow
- **Chips:** soft pink/lavender pills; hover uses accent + yellow under-shadow
- **Step pills:** active = accent gradient; completed (prior steps) = teal/ok `#1abc9c` tint
- **Header:** white/pink glassy bar with bubbly `#e8437a` title (not corporate academy blue)
- **Background:** `#fff7fb` + lightweight SVG scene (smiling sun, clouds, balloons, art palette/brushes) — no mhchow base64 JPEG

## Kept working

KS1/KS2, scaffold levels, three source tabs, five steps, pins, vocab chips, idea bank, localStorage, print export, masterwork SVG, peer gallery, self upload, zh-HK copy. Touch targets remain ≥44px.
