# Twogether design rules

<!-- ryux-context:start -->
- Character: calm, warm, personal app for two people. Feels like a real phone app, not a template.
- Starting point: the look merged in PR #30 (warm neutrals, rose accent, line icons), improved step by step.
- Motion: calm. Short fades and springs, nothing over 300 ms in everyday controls.
<!-- ryux-context:end -->

## Counts (checked on every screen)

| Rule | Count |
| --- | --- |
| Accent hue (`--accent`) | 1, only for the primary action, completion marks and data marks |
| Grey family | 1 (`--bg-*`, `--text-*`) |
| Icon set | 1 (lucide line icons in a neutral `IconTile`) |
| Emoji in interface chrome | 0 (emoji chosen by the user, like moods or challenge icons, are content and stay) |
| Gradients | 0, except bank card colours in Dompet (brand reason) and the logo mark |
| Focal point on Beranda | 1, the "Sudah bersama" card in flat accent |

## Patterns

- Lists, not bento grids: one card with hairline separators (`divide-[color:var(--hairline)]`).
- Exception: Jelajah shows the couple's spaces as an app-icon grid (4 per row, grouped by bundle, with search) so 30+ spaces fit without endless scrolling. "Susun" switches back to the draggable list.
- Motion: pages push in from the right and go back from the left (swipe from the left edge goes back); sheets close by dragging their top bar; Beranda has pull-to-refresh.
- No cards inside cards: a stat inside a card is a row or a divided column, never a filled box.
- Active tab and selected segment use ink (`text-text-1`, `bg-bg-elev2`), not the accent.
- Hero cards (`.hero-soft`) are plain surfaces; per-space colours set inline are ignored.
- Data colours (category chart series, period/fertile days in Siklus) may use more hues because they encode data.
- Charts live inside the menu their data belongs to (`TrendCard`), never on a separate charts page.
