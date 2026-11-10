# Agent notes

This repository is a Chrome MV3 extension built with WXT, TypeScript and vanilla DOM/CSS.

## Chrome Web Store

Whenever you create or change the extension, create or update `CHROMEWEBSTORE.md`. Use the
`chrome-extensions` skill (installed under `.agents/skills/chrome-extensions`) for the required
sections, permission justifications and store limits. Every entry in `manifest` `permissions` and
`host_permissions` needs a specific, plain-English justification there.

## Non-negotiables

- **No network code.** No fetch, remote fonts, analytics or telemetry.
- **Prompt text is opt-in.** Never store or log composer text unless `settings.storeText` is true.
- **No new permissions** without a justification in `CHROMEWEBSTORE.md`.
- **Never intercept typing.** Listeners are passive; never `preventDefault` or replay keystrokes.
- **The visual world is fixed.** Read `DESIGN.md` before UI work: paper documents, a black LCD HUD,
  signal orange, Geist Sans/Mono/Pixel. No gradients, glass, glows, lime or violet.

## Checks

```bash
npm run check       # typecheck, tests, production build
npm run unpacked    # copy the build to the visible unpacked/ folder
npm run demo        # visual preview at localhost:4173
```

## Browser testing

`opencode.jsonc` configures the Chrome DevTools MCP with the extension tools:

- Enable remote debugging at `chrome://inspect/#remote-debugging` in the Chrome profile you want
  the agent to use.
- Restart OpenCode after adding the MCP server. The agent can then install, reload and inspect the
  extension (popup, service worker, content script) in that Chrome profile.
- The `chrome-extensions` skill can be restored with `npx skills experimental_install` (it is
  installed locally under `.agents/skills/chrome-extensions`, which is gitignored).
