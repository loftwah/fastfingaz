# Agent notes

This repository is a Chrome MV3 extension built with WXT, TypeScript and vanilla DOM/CSS.

## Chrome Web Store

Whenever you create or change the extension, create or update `CHROMEWEBSTORE.md`. Use the
`chrome-extensions` skill (installed under `.agents/skills/chrome-extensions`) for the required
sections, permission justifications and store limits. Every entry in `manifest` `permissions` and
`host_permissions` needs a specific, plain-English justification there.

## Non-negotiables

- **No network code in the extension.** No fetch, remote fonts, analytics or telemetry. The marketing
  site may use static assets only; do not add a backend unless a task explicitly requires it.
- **Secrets stay in `.env`.** Never print, commit or paste `.env`; use `.env.example` for names only.
- **Prompt text is opt-in.** Never store or log composer text unless `settings.storeText` is true.
- **No new permissions** without a justification in `CHROMEWEBSTORE.md`.
- **Never intercept typing.** Listeners are passive; never `preventDefault` or replay keystrokes.
- **The visual world is fixed.** Read `DESIGN.md` before UI work: paper documents, a black LCD HUD,
  signal orange, Geist Sans/Mono/Pixel. No gradients, glass, glows, lime or violet.

## Checks

```bash
npm run check        # typecheck, tests, production build
npm run unpacked     # copy the build to the visible unpacked/ folder
npm run demo         # visual preview at localhost:4173
npm run site:build   # build site/dist with fonts, art and icons
PORT=4319 npm run site:serve   # serve the static site locally
npm run site:deploy  # build and deploy to Cloudflare Pages
```

## Cloudflare

- Pages project: `thinktype`, production branch `main`.
- Live domain: https://thinktype.loftwah.com (CNAME to `thinktype-7sb.pages.dev`, DNS-only).
- Cloudflare credentials live in `.env`; never print or commit them. Use `set -a; . ./.env; set +a`
  in a shell command so the token is never echoed.
- No R2 bucket is used. The Pages assets are enough.

## Visual previews and art

- `demo/gallery.html` mounts the real HUD over a mock conversation. Query parameters:
  `state=typing|thinking|draft|idle|empty|receipt|receipt-draft|share`, `sidebar=0|1`, `wide=1`,
  `label=0`.
- `demo/artboards.html?board=og|x|github|instagram|story|promo` renders the marketing artboards at
  the exact asset sizes.
- `demo/cards.html?format=landscape|square|story` renders the share cards; add `stress=1` or
  `empty=1` to check long values and missing baselines.
- Save final art in `docs/art/social`, `docs/art/share` and `docs/art/`; note the source and the
  sample-data status in `docs/art/social/PROMPTS.md`.

## Browser testing

`opencode.jsonc` configures the Chrome DevTools MCP with the extension tools:

- Enable remote debugging at `chrome://inspect/#remote-debugging` in the Chrome profile you want
  the agent to use.
- Restart OpenCode after adding the MCP server. The agent can then install, reload and inspect the
  extension (popup, service worker, content script) in that Chrome profile.
- The `chrome-extensions` skill can be restored with `npx skills experimental_install` (it is
  installed locally under `.agents/skills/chrome-extensions`, which is gitignored).
