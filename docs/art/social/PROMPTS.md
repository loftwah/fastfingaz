# Social and store art

All marketing text and UI are rendered in HTML/CSS or Canvas. No text was baked into a generated
image.

## Image generation status

A paper-texture background was attempted with the image model on 11 November 2026, but the request
failed (`Insufficient balance`). No generated imagery is used in the final assets. The artboards use
the flat warm paper ground from the design system; that is the intended world, not a placeholder for
a photo.

If generated artwork is added later:

1. Save the exact prompt next to the asset in this folder.
2. Render all text in HTML or Canvas on top of it.
3. Keep the paper / ink / signal-orange palette and do not introduce gradients, glass, glows, lime or
   violet.
4. Note whether the asset is a placeholder.

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
