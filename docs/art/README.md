# Placeholder artwork

Everything here is generated from the real components or drawn from the real brand tokens. It is
intended to be replaced once the final look is settled — the card renderer in
`src/shared/share-card.ts` stays the source of truth for share cards.

| File | Size | Purpose | How it was made |
| --- | --- | --- | --- |
| `hero.png` | 1280×960 | README hero | Screenshot of `demo/preview.html` |
| `hud.png` | ~300×162 @2x | HUD close-up | Screenshot of `demo/hud.html` |
| `share-card.png` | 1200×630 | Share card example | Screenshot of `demo/card.html` |
| `social-preview.png` | 1280×640 | GitHub social preview | **To supply** (see below) |
| `icon.svg` | 128 | Source mark | Hand-authored |

## Regenerate the screenshots

```bash
npm run demo
# then capture:
#   http://localhost:4173/demo/preview.html  -> hero.png (1280×960)
#   http://localhost:4173/demo/hud.html      -> the .hud element, 2x
#   http://localhost:4173/demo/card.html     -> the #card-stage element (1200×630)
```

The sample data lives in `demo/preview.ts`. Change it there, not in the images.

## GitHub social preview

GitHub does not accept social preview images through its API. To set it:

1. Create a 1280×640 PNG (the hero composition cropped/reflowed works).
2. Repository → **Settings** → **Social preview** → **Upload an image**.

## Icons

`src/assets/icon.svg` is the source. `npm run icons` regenerates 16/32/48/128 PNGs with `sharp`.
Keep the T legible at 16px; do not add detail below that size.

## What to replace first

1. The hero headline treatment and background texture.
2. The share card's footer URL / branding once a domain exists.
3. The GitHub social preview.
4. Any real screenshots of the popup and options page (currently only the HUD and card are shown).
