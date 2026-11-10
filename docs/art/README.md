# Art and captures

Everything here is rendered from the built UI or the same HTML/CSS components with sample data. The
values are examples, not user data and not a benchmark. The receipt renderer in
`shared/share-card.ts` stays the source of truth for share cards; do not replace it with a static
image.

| File | Size | Purpose | How it was made |
| --- | --- | --- | --- |
| `hud-2048.png` | 2048×1152 | Full 300px HUD, right gutter | `demo/gallery.html?state=typing&sidebar=0&wide=1` |
| `hud-1728.png` | 1728×851 | Full 286px HUD, right gutter | `demo/gallery.html?state=typing&sidebar=1` |
| `hud-1440.png` | 1440×900 | Slim 142px HUD, right gutter | `demo/gallery.html?state=typing&sidebar=1` |
| `hud-1280.png` | 1280×800 | Medium 232px HUD, right gutter | `demo/gallery.html?state=typing&sidebar=0` |
| `hud-idle.png` | 2048×1152 | Idle LAST / BEST / AVG | `demo/gallery.html?state=idle` |
| `hud-empty.png` | 2048×1152 | No-reading dashes | `demo/gallery.html?state=empty` |
| `hud-draft.png` | 1440×900 | Draft state | `demo/gallery.html?state=draft` |
| `hud-thinking.png` | 1440×900 | Held THINKING state | `demo/gallery.html?state=thinking` |
| `hud-receipt.png` | 2048×1152 | Printed receipt + NEW BEST | `demo/gallery.html?state=receipt` |
| `hud-share.png` | 2048×1152 | Share sheet | `demo/gallery.html?state=share` |
| `popup-main.png` | 380×600 | Popup history and baseline | `demo/popup-harness.html` |
| `popup-detail.png` | 380×600 | Popup receipt detail + formats | `demo/popup-harness.html` |
| `share/thinktype-landscape.png` | 1200×630 | Landscape receipt | `demo/cards.html?format=landscape` |
| `share/thinktype-square.png` | 1080×1080 | Square receipt | `demo/cards.html?format=square` |
| `share/thinktype-story.png` | 1080×1920 | Story receipt | `demo/cards.html?format=story` |
| `social/og-1200x630.png` | 1200×630 | Site OG image | `demo/artboards.html?board=og` |
| `social/x-1200x675.png` | 1200×675 | X / wide social | `demo/artboards.html?board=x` |
| `social/github-1280x640.png` | 1280×640 | GitHub social preview | `demo/artboards.html?board=github` |
| `social/instagram-1080x1080.png` | 1080×1080 | Instagram | `demo/artboards.html?board=instagram` |
| `social/story-1080x1920.png` | 1080×1920 | Story / Reels | `demo/artboards.html?board=story` |
| `store-1280x800.png` | 1280×800 | Chrome Web Store screenshot 1 | `demo/gallery.html?state=typing&sidebar=0&label=0` |
| `store-popup-1280x800.png` | 1280×800 | Chrome Web Store screenshot 2 | `demo/store-popup.html` |
| `promo-440x280.png` | 440×280 | Store promo tile | `demo/artboards.html?board=promo` |
| `site-hero-1440.png` | 1440×900 | Site hero | live site at 1440×900 |
| `site-formats-1440.png` | 1440×900 | Site receipt formats | live site at 1440×900 |
| `site-mobile-390.png` | 390×844 | Site mobile | live site at 390×844 |
| `source/hud-typing*.png` | 300×505 / 600×1010 | HUD source for the site | `demo/gallery.html`, element screenshot |

## Regenerate

```bash
npm run demo
```

Then open `gallery.html`, `cards.html`, `artboards.html` or `popup-harness.html` at
`http://localhost:4173` and capture at the exact dimensions in the table. The query parameters are
documented in `AGENTS.md` and `docs/art/social/PROMPTS.md`.

Sample data lives in `demo/gallery.ts`, `demo/cards.ts` and `demo/popup-harness.html`. Change it
there, not in the images.

## Chrome Web Store

`store-1280x800.png` is a designed sample composition, not a capture of a real account. Store
screenshots 2–5 still need real captures: the receipt close-up, the popup, the three share formats and
the draft/settings state. See `CHROMEWEBSTORE.md`.

## GitHub social preview

GitHub does not accept social preview images through its API. To set it:

1. Use `docs/art/social/github-1280x640.png`.
2. Repository → **Settings** → **Social preview** → **Upload an image**.

## Icons

`assets/icon.svg` is the source: a pixel T in signal orange. `npm run icons` regenerates
`public/icon/{16,32,48,128}.png` with `sharp`. Keep the T legible at 16px; do not add detail below
that size.

## Fonts

Geist Sans, Geist Mono and Geist Pixel Square are self-hosted in `public/fonts/` under the SIL Open
Font License (`OFL.txt`). Do not swap in a remote font or a lookalike; the type is the identity.

## Image generation

The social art has no generated imagery. A paper-texture background was attempted with the image model
but the request failed (insufficient balance); the flat paper ground is the intended world. If
generated artwork is added later, save the prompt in `docs/art/social/PROMPTS.md` and render all text
in HTML or Canvas, never in the generated image.
