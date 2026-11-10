# Placeholder artwork

Everything here is a real capture of the built UI with sample data. It is placeholder brand material
— replace it once the final campaign art is settled. The receipt renderer in
`shared/share-card.ts` stays the source of truth for cards; do not replace it with a static image.

| File | Size | Purpose | How it was made |
| --- | --- | --- | --- |
| `hero.png` | 1280×960 | README hero | `demo/preview.html` at 1280×960 |
| `hud.png` | 640×354 | HUD close-up | real extension on ChatGPT, 2× capture |
| `share-card.png` | 1200×630 | Share receipt | `demo/card.html`, `#card-stage` |
| `popup.png` | 380×600 | History popup | built extension, seeded sample data |
| `popup-detail.png` | 380×600 | Session detail | built extension, seeded sample data |
| `options.png` | 900×1202 | Settings sheet | built extension |
| `social-preview.png` | 1280×640 | GitHub social preview | **To supply** (see below) |
| `icon.svg` | 128 | Source mark | hand-authored pixel T |

## Regenerate

```bash
npm run demo
# http://localhost:4173/preview.html  -> hero.png (1280×960)
# http://localhost:4173/card.html     -> #card-stage (1200×630)
# http://localhost:4173/hud.html      -> .hud element (or capture the real extension)
```

Sample data lives in `demo/preview.ts`. Change it there, not in the images.

The HUD close-up in this folder was captured from the real extension on ChatGPT, so it shows a real
typing burst. If you regenerate it from `demo/hud.html`, keep the dark device on a plain background.

## GitHub social preview

GitHub does not accept social preview images through its API. To set it:

1. Create a 1280×640 PNG (a reflow of the hero works).
2. Repository → **Settings** → **Social preview** → **Upload an image**.

## Icons

`assets/icon.svg` is the source: a pixel T in signal orange on anodised black. `npm run icons`
regenerates `public/icon/{16,32,48,128}.png` with `sharp`. Keep the T legible at 16px; do not add
detail below that size.

## Fonts

Geist Sans, Geist Mono and Geist Pixel Square are self-hosted in `public/fonts/` under the SIL Open
Font License (`OFL.txt`). Do not swap in a remote font or a lookalike; the type is the identity.

## What to replace first

1. The hero composition and its headline treatment.
2. The GitHub social preview.
3. Real popup and options captures (run the built extension, seed a few sessions).
4. Any final campaign art; keep the paper / ink / orange / pixel-T system intact.
