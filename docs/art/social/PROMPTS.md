# Social and store art

All marketing text and UI are rendered in HTML/CSS or Canvas. No text was baked into a generated
image.

## Editorial artwork

Generated with the built-in ImageGen tool on 12 November 2026. These are campaign artwork
options with blank areas for separately typeset copy. They depict fictional objects and
contain no sample readings, user data or product screenshots.

| Asset | Dimensions |
| --- | --- |
| [field-instrument.webp](editorial/field-instrument.webp) | 1536×1024 |
| [receipt-study.webp](editorial/receipt-study.webp) | 1254×1254 |
| [keyboard-study.webp](editorial/keyboard-study.webp) | 1024×1536 |

### Exact generation prompts

**field-instrument**

> Landscape 3:2 editorial product photograph for Fastfingaz, a local-first typing measurement tool. A compact unbranded matte anodised-black field instrument with a blank black LCD and one tiny signal-orange physical indicator sits next to a folded blank warm-paper receipt, on an uncoated warm paper tabletop. Camera at a low three-quarter angle, object grouped on right, generous clean area on left for separately typeset copy. Tactile industrial design, dry soft daylight, restrained art direction. Palette strictly warm ivory #f2efe6, ink #0b0b0a, tiny signal orange #ff4d00. No text, marks, numbers, charts, logos, people, glow, glass effects or gradients.

**receipt-study**

> Square editorial still life for Fastfingaz, a typing instrument for ChatGPT. Top-down photograph of three small blank warm-ivory thermal receipt strips, arranged like a precise field notebook on a matte black workbench. One small signal-orange registration tab at the edge of a sheet. Distinct silhouettes, slight perforation at the paper edges, flat tonal fields, subtle natural uncoated fiber texture. Keep central paper blank for real programmatic typesetting. Warm paper #f2efe6, ink #0b0b0a, orange #ff4d00 only. No text, logos, numbers, metrics, gradients, glass or glow.

**keyboard-study**

> Portrait editorial macro photograph for Fastfingaz social campaigns. A small crop of blank matte black mechanical keyboard keycaps at the very bottom of a warm ivory work surface, with a single orange keycap among them. Use strong vertical framing and leave upper half as empty tactile warm paper for separately typeset copy. Restrained studio daylight, sharp industrial edges, graphic composition, warm paper #f2efe6 and ink #0b0b0a, single orange #ff4d00 accent. No text, legends, people, logos, glows, gradients or glass. This is an editorial image, not a product interface screenshot.

## Assets

| Asset | Dimensions | Source | Status |
| --- | --- | --- | --- |
| `og-1200x630.png` | 1200×630 | `demo/artboards.html?board=og` | Ready; sample reading |
| `x-1200x675.png` | 1200×675 | `demo/artboards.html?board=x` | Ready; sample reading |
| `github-1280x640.png` | 1280×640 | `demo/artboards.html?board=github` | Ready; sample reading |
| `instagram-1080x1080.png` | 1080×1080 | `demo/artboards.html?board=instagram` | Ready; sample reading |
| `story-1080x1920.png` | 1080×1920 | `demo/artboards.html?board=story` | Ready; sample reading |
| `docs/art/store-1280x800.png` | 1280×800 | `demo/gallery.html?state=typing&sidebar=0&label=0` | Ready; sample composition |
| `docs/art/promo-440x280.png` | 440×280 | `demo/artboards.html?board=promo` | Ready; sample reading |

The values shown on the cards are sample data (62 think / 78 flow / 96 peak / 74 best / 68 average).
They are labelled `SAMPLE READING / NOT A BENCHMARK` on the artboards. They are not user data and not
a performance claim.

## How to re-render

```bash
npm run demo
# then open:
# http://localhost:4173/artboards.html?board=og
# http://localhost:4173/artboards.html?board=x
# http://localhost:4173/artboards.html?board=github
# http://localhost:4173/artboards.html?board=instagram
# http://localhost:4173/artboards.html?board=story
# http://localhost:4173/artboards.html?board=promo
```

Set the browser viewport to the asset dimensions exactly and capture the viewport.

The extension share cards are rendered separately:

```bash
# http://localhost:4173/cards.html?format=landscape
# http://localhost:4173/cards.html?format=square
# http://localhost:4173/cards.html?format=story
# http://localhost:4173/cards.html?format=landscape&stress=1   # 3-digit WPM, 4-digit words
# http://localhost:4173/cards.html?format=landscape&empty=1   # dashes for no baseline
```

The final card PNGs are in `docs/art/share/` at 1200×630, 1080×1080 and 1080×1920. They are drawn on
Canvas at exact social dimensions, not stretched.

## Store screenshot note

`docs/art/store-1280x800.png` is a designed sample composition using the real HUD and a mock
conversation. It is not a capture of a real ChatGPT account. Replace it with real captures before
submitting to the Chrome Web Store.
