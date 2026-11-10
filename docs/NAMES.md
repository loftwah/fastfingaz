# Name and domain check

Checked 11 November 2026. No domain, trademark, GitHub organisation or npm package was purchased or
registered. This is a screening pass, not legal clearance.

Method:

- `.com` availability from Verisign RDAP.
- `.dev` availability from Google Registry RDAP.
- GitHub from the public profile URL (404 = the handle is free).
- npm from the public registry (404 = the package name is free).
- A basic USPTO trademark search was attempted, but the query interface returned an empty result set
  for every term, including known names, so it is **inconclusive**. A formal clearance search is
  required before any purchase.
- Prices are not quoted because Cloudflare Registrar bills at cost and premium names can differ.
  Check the registrar checkout before buying.

| Name | .com | .dev | GitHub | npm | One-line reason | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| **Thinktype** (current) | Registered | Registered | Taken | Free | The current name; descriptive of the product. | Both domains taken; a rename would need a coordinated migration; GitHub handle is someone else's. |
| **Typeometer** | Free | Free | Free | Free | A meter for type; reads as a field instrument, not a SaaS. | 10 characters; pronunciation and spelling need a beat; may be premium at the registrar. |
| **Typmeter** | Free | Free | Free | Free | Shortest candidate; "type meter" without the extra vowel. | Looks like a typo of "type meter"; less dignified in prose. |
| **Inkometer** | Free | Free | Free | Free | Ink + meter; fits the paper/ink world exactly. | The ink association may read as a tattoo or printing tool, not ChatGPT. |
| **Inkmetre** | Free | Free | Free | Free | British spelling of the same idea; more ownable visually. | Spelling confusion outside the UK; same ink association. |
| **Cadenz** | Registered | Registered | Taken | Free | A clipped cadence; short and instrument-like. | Both domains taken; existing uses; harder to defend. |
| **Thinkmark** | Registered | Free | Taken | Free | Think + mark; a baseline stamp. | `.com` and GitHub taken; generic compound. |
| **Quillex** | Registered | Free | Taken | Free | Quill + ex; a coined writing mark. | `.com` and GitHub taken; less literal. |
| **Typeproof** | Registered | Free | Free | Taken | Type + proof; a printed record. | `.com` and npm taken; sounds like a proofing tool. |
| **Mindink** | Registered | Free | Taken | Free | Mind + ink; the thought-to-paper idea. | `.com` and GitHub taken; existing uses. |

## Recommendation

1. **Typeometer** — the best balance of availability, meaning and fit with the field-instrument
   world. Both domains and both developer handles are free.
2. **Typmeter** — the easiest to say and type, with both domains free. The missing “e” is the risk.
3. **Inkometer** — the strongest visual fit with paper and ink, with both domains free. The meaning
   is narrower than the product.

**No rename without approval.** The live site, extension, store listing and cards all use
**Thinktype** at **thinktype.loftwah.com** for now. If a new name is approved, do one coordinated
rename: product name, manifest name, package name, repository and redirects, store listing, site,
domain, OG art, card footer and docs.

## What a rename would touch

- `package.json`, `wxt.config.ts`, manifest `name`/`short_name`/`description`.
- Wordmark and copy in the HUD, popup, options, receipt, share cards and site.
- `shared/constants.ts` (`SITE_HOST`, `SITE_URL`, `GITHUB_URL`, `RELEASES_URL`).
- `CHROMEWEBSTORE.md`, `README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/*`.
- GitHub repository name and release assets; old URLs should redirect.
- Domains and DNS; the Chrome Web Store listing; the Discord showcase.
