# Twogether design rules

<!-- ryux-context:start -->
- Design Read: Private relationship hub for couples, rendered in a warm-paper editorial utility style, dial `ENERGY 2 / RHYTHM 2 / MOTION 2`.
- Character: calm, warm, personal app for two people. Feels like a real phone app, not a template.
- Starting point: the look merged in PR #30 (warm neutrals, rose accent, line icons), refined with purposeful motion and calm density.
- Motion (`MOTION 2`): interactive springs (`layoutId` on BottomNav, Sidebar, SectionTabs, and segmented tabs), viewport reveals on Beranda cards and Jelajah spaces, `AnimatePresence` enter/exit transitions on sheets/banners/popovers, GPU `scaleX`/`scaleY` meter fills, `CountUp` springs on totals, and global `<MotionConfig reducedMotion="user">`.
- Copy budget: headings, banners, and empty-state guidance stay scannable (2-5 words on labels/greetings; one short line per hint, progressive disclosure on secondary actions), zero decorative emoji in chrome, zero em dashes (`R-02`).
<!-- ryux-context:end -->

## Counts (checked on every screen)

| Rule | Count |
| --- | --- |
| Accent hue (`--accent`) | 1 core accent (`--accent`) only for primary CTA, completion marks, and data emphasis |
| Grey family | 1 (`--bg-*`, `--text-*`) |
| Tint tokens | Semantic `--tint-*` CSS tokens for spaces, categories, and reminders (`RX-DS-03` free outside bank brands) |
| Icon set | 1 (lucide line icons in neutral/tinted `IconTile`) |
| Emoji in interface chrome | 0 (emoji chosen by the user, like moods, memories, or TilePicker faces, are content and stay) |
| Glassmorphism (`backdrop-filter`) | At most 2 active surfaces: bottom nav pill (`.app-nav`) and active sheet/modal scrim (`.backdrop-in`); sticky header stays solid |
| Gradients | 0, except bank card colours in Dompet (brand reason) and the app logo mark |
| Focal point on Beranda | 1, the "Sudah bersama" (`hari-kita`) hero card anchored first in the feed |

## Radius & Patterns

- Radius hierarchy: pill (`999px`) for primary CTAs (`.btn-accent`) and active tab/filter pills; medium (`var(--r-md)` / `14px`) for secondary action buttons, inputs, and action rows; large (`var(--r-lg)` / `20px`) for surface cards and `26px` for modal bottom sheets.
- Lists, not bento grids: one card with hairline separators (`divide-[color:var(--hairline)]`).
- Exception: Jelajah shows the couple's spaces as an app-icon grid (4 per row, grouped by bundle, with search) so 30+ spaces fit without endless scrolling. "Susun" switches back to the draggable list.
- Motion: pages push in from the right and go back from the left (swipe from the left edge goes back); sheets drag or spring-exit cleanly; Beranda has pull-to-refresh.
- No cards inside cards: a stat inside a card is a row or a divided column, never a filled box.
- Active tab and selected choice chips use ink (`text-bg-app`, `bg-text-1`), reserving `--accent` for the primary CTA.
- Hero cards (`.hero-soft`) are plain surfaces; per-space colours set inline are ignored.
- Data colours (category chart series, period/fertile days in Siklus) use `--tint-*` tokens because they encode data.
- Charts live inside the menu their data belongs to (`TrendCard`), never on a separate charts page.

