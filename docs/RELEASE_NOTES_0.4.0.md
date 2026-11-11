# Fastfingaz v0.4.0 — the rename

Same instrument, new label. Thinktype is now **Fastfingaz**, shipping as 0.4.0.

## The rename

- The extension, manifest, popup, settings page, HUD, receipts, share cards and site all read
  **Fastfingaz**.
- Wordmark: `FASTFINGAZ` in Geist Pixel. Catalog marks use `FF-` instead of `TT-`.
- The share-card footer prints `FASTFINGAZ.LOFTAH.COM`.
- Local history survives: the internal `tt:` storage keys were deliberately kept so an installed
  0.3.x user keeps their baseline, best and session list.
- No new permissions, no network code. Prompt text is still opt-in. Typing is still passive.

## Pixel F

The new icon set is the approved **Pixel F** mark: a black rounded square with the orange pixel F.

- Extension icons: 16, 32, 48 and 128.
- Site and manifest: 128, 192 and 512, plus 192/512 maskable.
- Apple touch icon: 180.
- Favicon: SVG.

The vector is the source of truth; no image model was used.

## Site and links

- New canonical host: **https://fastfingaz.loftwah.com**
- `https://thinktype.loftwah.com` 301s to the new host.
- The GitHub repository is now **loftwah/fastfingaz**. GitHub redirects the old repository and
  release URLs.
- Site titles, descriptions, canonicals, OG/Twitter tags, JSON-LD, sitemap, robots and web manifest
  use the new name and host.

## Unchanged

- The dark bottom-anchored instrument, the four HUD sizes (Auto, Mini, Small, Medium, Large), the
  paper receipt, and the three share formats (1200×630, 1080×1080, 1080×1920).
- 47 tests. Typecheck, build and site build are green.

## Install

Use the `unpacked` folder at the same path, or the zip below. Reload Fastfingaz in
`chrome://extensions`, then refresh ChatGPT. The version should read **0.4.0**.

Full method: https://fastfingaz.loftwah.com/metrics
Privacy: https://fastfingaz.loftwah.com/privacy
