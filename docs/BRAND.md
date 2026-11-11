# Brand direction

Status: **Thinktype is the shipping name.** Fastfingaz is the recommended rename, but no domain was
purchased, no repository was renamed and no store listing was changed. A rename needs explicit
approval.

## What happened to Fastfingaz

`docs/NAMES.md` screened the candidates. Fastfingaz passed on the surfaces the product actually needs:
`.com`, `.dev`, npm and the `loftwah/fastfingaz` repository. The vanity `github.com/fastfingaz`
handle is taken by someone else; the project does not need it. The name was recommended, not
executed, because the live extension, site, share cards, store copy and releases all still say
Thinktype.

## The idea

Fastfingaz is a **studio instrument for original words**, packaged like a 1990s white-label 12-inch.

The reference is the **format**, not the costume:

- **New York underground:** white labels, catalog numbers, Xerox flyers, run-out etchings, A-side /
  B-side, promo stamps, hand-written tracklists, sampler pads.
- **West Coast:** flat chrome, sun-faded paper, studio VU meters, deep black, a clean low-end.
- **The product:** an anodised black instrument that measures the speed of a thought. The sleeve is
  the marketing; the HUD is the hardware.

Not the reference:

- No graffiti lettering, boomboxes, gold chains, palm trees, guns, bling or fake streetwear.
- No “yo”, “phat”, “fresh”, “dope”, “hustle”, “grind” or invented slang.
- No 3D chrome type, gradients, glows or neon.
- No generic AI skulls, cyberpunk grids or “music visualizer” clutter.

The insider signal is a **catalog number and a run-out groove**, not a costume.

## Marks

Three studies live in `docs/brand/concepts/`:

| Mark | File | Use |
| --- | --- | --- |
| **Pixel F** (recommended) | `icon-pixel-f.svg` | Primary app icon, favicon, toolbar, store icon. Keeps the current pixel-grid language and survives 16px. |
| **Four fingers** | `icon-four-fingers.svg` | Secondary mark / cadence motif. Four fingers and a VU meter; reads as an equalizer at small sizes. |
| **White label** | `icon-white-label.svg` | Sleeve art, OG image and merch. The inner detail collapses at 16px; do not use it as the toolbar icon. |

The board is `docs/brand/concepts/board.png`; the HTML source is `demo/brand-board.html`.

The wordmark is `FASTFINGAZ` in **Geist Pixel** with `Geist Mono` for catalog data and `Geist` for
body copy. The pixel face is the sampler-pad link; it is already bundled and does not add a novelty
graffiti font.

## Palette

- **Anodised black** `#0b0b0a` / housing `#111110`
- **Signal orange** `#ff4d00`
- **Newsprint cream** `#f2efe6` / deep `#e8e3d7`
- **Flat chrome** `#c8c4b8`
- Hairlines `#2a2824` on ink, `#d5cfc1` on paper

No gold. No gradients. No glow. Chrome is a flat fill, not a 3D treatment.

## Type and layout

- Wordmark: `FASTFINGAZ`, Geist Pixel, tight tracking, all caps.
- Catalog/data: Geist Mono, tabular numerals, 8–10px labels.
- Body: Geist, 12–16px.
- Layout: 12-inch sleeve grid; square cover, center label, A-side / B-side, catalog `FF-001`.
- Receipts and share cards stay paper; the extension and HUD stay black instruments.

## Voice

Liner notes, not a persona.

- “SIDE A / COMPOSITION. SIDE B / TRANSCRIPTION.”
- “FF-001 / 120 WPM / STEREO.”
- “RUN-OUT: THINK FAST / TYPE SLOW.”
- “PROMO ONLY. NO SERVER.”
- “ORIGINAL WORDS. NO SAMPLES.”

Short, deadpan, technical. The joke is in the format, not in trying to sound like a rapper.

## Rename path (only after approval)

1. Confirm the name and the domain purchase.
2. Rename `package.json`, `wxt.config.ts` manifest `name` / `short_name` / `description`.
3. Rename the repository to `loftwah/fastfingaz`; keep redirects from the old URL.
4. Point `fastfingaz.com` at Cloudflare Pages; keep `thinktype.loftwah.com` as a 301.
5. Update `shared/constants.ts` (`SITE_HOST`, `SITE_URL`, `GITHUB_URL`, `RELEASES_URL`).
6. Update the HUD wordmark, popup, options, receipt, share cards, OG art and store copy.
7. Regenerate favicons (16/32/48/128), maskable 192/512, Apple touch icon, OG 1200×630, GitHub
   1280×640, store 1280×800 and promo 440×280.
8. Update the Chrome Web Store listing and the Discord showcase.

## Decision

Approve **Fastfingaz** and the white-label direction, or keep **Thinktype** and apply the same
visual language to the existing name. The icon and site work can proceed either way; the rename
cannot.

No domain, trademark, repository or store change happens without that approval.
