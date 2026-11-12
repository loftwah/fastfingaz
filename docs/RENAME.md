# Fastfingaz rename runbook

Approved 11 November 2026 and **executed in v0.4.0** the same day. The target name is
**Fastfingaz**. The product moved in one clean release; this runbook is kept as the migration
record. Tracked in issue #6.

Read `docs/BRAND.md`, `docs/NAMES.md` and `docs/brand/concepts/README.md` before starting.

## Decisions

- Name: **Fastfingaz**
- Primary mark: **Pixel F** (`docs/brand/concepts/icon-pixel-f.svg`)
- Secondary: **Four Fingers** (`icon-four-fingers.svg`)
- Sleeve/OG: **White Label** (`icon-white-label.svg`)
- Wordmark: `FASTFINGAZ` in Geist Pixel
- Palette: anodised black, signal orange, newsprint cream, flat chrome
- Release: **0.4.0**
- Domain: `fastfingaz.loftwah.com`. The owner declined the separate `.com`; no domain was bought.

## Non-negotiables

- No network code in the extension. No new permissions.
- Prompt text stays opt-in (`settings.storeText`).
- Never intercept or replay typing.
- Keep the dark instrument, paper receipt, share cards and the four HUD sizes.
- Old URLs must redirect; do not break installed users or shared links.

## Order of work

### 0. Snapshot

```bash
git status
git log --oneline -3
gh release list --repo loftwah/thinktype
```

Create a branch:

```bash
git switch -c fastfingaz-rename
```

### 1. Code and manifest

Update:

- `package.json` name/version → `fastfingaz`, `0.4.0`; refresh the lockfile.
- `wxt.config.ts` manifest `name`, `short_name`, `description`.
- `shared/constants.ts`: `SITE_HOST`, `SITE_URL`, `GITHUB_URL`, `RELEASES_URL`.
- `entrypoints/*` and `content/*` visible words: HUD wordmark, popup, options, receipt, share card,
  aria labels, titles.
- `demo/*` mock names and wordmarks.
- `README.md`, `PRODUCT.md`, `DESIGN.md`, `CHROMEWEBSTORE.md`, `docs/ROADMAP.md`, `docs/METRICS.md`,
  `docs/PRIVACY.md`, `docs/art/README.md`, `docs/brand/*`.

Keep the historical `docs/RELEASE_NOTES_0.3.*.md` as Thinktype history; do not rewrite history.

Search for leftovers:

```bash
rg -n "Thinktype|thinktype" --glob '!node_modules' --glob '!.output' --glob '!unpacked' --glob '!site/dist'
```

### 2. Icons and art

Use the staged Pixel F assets in `docs/brand/concepts/`:

- `public/icon/16.png`, `32.png`, `48.png`, `128.png`
- `site/icon-128.png`, `icon-192.png`, `icon-512.png`
- `site/favicon.svg`
- Apple touch 180px and maskable 192/512 (safe zone: keep the black rounded square, no text)
- `site/manifest.webmanifest` icons

Regenerate:

- `demo/artboards.html` OG/GitHub/X/Instagram/story art
- `demo/store-popup.html` and `demo/store-popup.html` popup frame
- `demo/cards.html` share card footer/name if it uses the site URL
- `docs/art/*` final captures

The final art must be code/vector-rendered. Do not depend on an image model.

### 3. Site

- `site/index.html`, `metrics.html`, `privacy.html`, `changelog.html`, `404.html`:
  titles, descriptions, OG/Twitter, JSON-LD names/URLs, visible wordmark, footer. — done
- `site/sitemap.xml`, `site/robots.txt`, `site/manifest.webmanifest`, canonical URLs.
- Add a 301 from `https://thinktype.loftwah.com/*` to `https://fastfingaz.loftwah.com/*` at
  Cloudflare.
- Version the CSS query string (e.g. `?v=0.4.0`) so the old immutable cache cannot stick.
- Keep the FAQ; update the “Does it work outside ChatGPT?” answer only if that feature ships.

### 4. GitHub

```bash
gh repo rename fastfingaz --repo loftwah/thinktype   # executed
git remote set-url origin https://github.com/loftwah/fastfingaz.git
```

GitHub redirects the old repository URL. Verify old release asset URLs still resolve. Update
`GITHUB_URL` and `RELEASES_URL`; rebuild.

### 5. Cloudflare Pages and domain

- **No `.com` purchase.** The live host is `fastfingaz.loftwah.com`; do not add domain spend.
- The existing `thinktype` Pages project keeps the custom domain and certificates.
- Deploy to `fastfingaz.loftwah.com`; keep `thinktype.loftwah.com` as a 301.
- Configure the old `thinktype.loftwah.com` 301 to the new host (Cloudflare Redirect Rule or a
  small Pages project). Test with `curl -I`.

### 6. Chrome Web Store

The store listing is not submitted yet, so this is copy and art only:

- `CHROMEWEBSTORE.md`: name, description, feature list, version history.
- 128px icon, 1280×800 screenshots, 440×280 promo tile.
- Permissions table unchanged: `storage`, `clipboardWrite`, ChatGPT hosts only.
- Re-read `CHROMEWEBSTORE.md` against the `chrome-extensions` skill before submission.

### 7. Release

```bash
npm run check
npm run unpacked
npm run zip
gh release create v0.4.0 .output/fastfingaz-0.4.0-chrome.zip \
  --title "Fastfingaz v0.4.0 — the rename" \
  --notes-file docs/RELEASE_NOTES_0.4.0.md
npm run site:build
set -a; . ./.env; set +a
npx --yes wrangler@latest pages deploy site/dist --project-name fastfingaz --branch main
git add -A
git commit -m "feat: rename to Fastfingaz"
git push origin main
git tag -f v0.4.0 "$(git rev-parse HEAD)"
git push origin v0.4.0 --force
```

If the Pages project keeps the name `thinktype`, deploy there and attach the new custom domain;
do not create a second project unless the old one cannot host the domain.

### 8. Verification

- `npm run check` green; 47 tests still pass.
- `unpacked/manifest.json` name/version.
- `curl -I` old domain → 301 → new domain.
- All site pages 200, canonical self-references, sitemap URLs, OG image, schema parse.
- 390px mobile: no horizontal scroll.
- Favicons at 16/32/48/128/180/192/512.
- Popup/HUD wordmark and share card footer.
- Search for leftovers; historical release notes are allowed.
- GitHub release asset downloads from both old and new URLs.
- Chrome Web Store copy and screenshots.

## Rollback

If the rename cannot complete cleanly, keep the code on `fastfingaz-rename`, leave the live
Thinktype deployment untouched, and report the blocker. Do not ship a half-renamed extension.
