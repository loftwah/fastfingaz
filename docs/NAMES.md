# Name and domain check

Checked 11 November 2026. **Fastfingaz was approved and shipped in v0.4.0 the same day.** Execution
is recorded in issue #6 and `docs/RENAME.md`. No domain, trademark, GitHub organisation or npm package was purchased or
registered during this screening. This is a screening pass, not legal clearance.

Method:

- `.com` availability from Verisign RDAP.
- `.dev` availability from Google Registry RDAP.
- GitHub from the repository URL under `loftwah/` (404 = the repo name is free). The top-level
  vanity handle is noted separately; the product does not need it.
- npm from the public registry (404 = the package name is free).
- A basic USPTO trademark search was attempted, but the query interface returned an empty result set
  for every term, including known names, so it is **inconclusive**. A formal clearance search is
  required before any purchase.
- Prices are not quoted because Cloudflare Registrar bills at cost and premium names can differ.
  Check the registrar checkout before buying.

| Name | .com | .dev | GitHub | npm | One-line reason | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| **Thinktype** (previous) | Registered | Registered | Taken | Free | The previous name; descriptive of the product. | Both domains taken; GitHub handle is someone else's. |
| **Fastfingaz** (approved) | Free | Free | Repo free* | Free | Fast fingers; memorable, unique and says what it measures. | The vanity `github.com/fastfingaz` handle is taken; the repo is `loftwah/fastfingaz`. Slangier tone. |
| **Inkmeter** | Registered | Free | Repo free | Free | The user's preferred spelling of ink + meter. | `.com` is taken, so it is not free on everything. |
| **Typeometer** | Free | Free | Free | Free | A meter for type; reads as a field instrument, not a SaaS. | 10 characters; pronunciation and spelling need a beat; may be premium at the registrar. |
| **Typmeter** | Free | Free | Free | Free | Shortest candidate; "type meter" without the extra vowel. | Looks like a typo of "type meter"; less dignified in prose. |
| **Inkometer** | Free | Free | Free | Free | Ink + meter; fits the paper/ink world exactly. | The ink association may read as a tattoo or printing tool, not ChatGPT. |
| **Inkmetre** | Free | Free | Free | Free | British spelling of the same idea; more ownable visually. | Spelling confusion outside the UK; same ink association. |
| **Cadenz** | Registered | Registered | Taken | Free | A clipped cadence; short and instrument-like. | Both domains taken; existing uses; harder to defend. |
| **Thinkmark** | Registered | Free | Taken | Free | Think + mark; a baseline stamp. | `.com` and GitHub taken; generic compound. |
| **Quillex** | Registered | Free | Taken | Free | Quill + ex; a coined writing mark. | `.com` and GitHub taken; less literal. |
| **Typeproof** | Registered | Free | Free | Taken | Type + proof; a printed record. | `.com` and npm taken; sounds like a proofing tool. |
| **Mindink** | Registered | Free | Taken | Free | Mind + ink; the thought-to-paper idea. | `.com` and GitHub taken; existing uses. |

\* `loftwah/fastfingaz` is free; the top-level `github.com/fastfingaz` handle is taken by someone
else and is not needed to host the repository.

## Recommendation

1. **Fastfingaz** — free on `.com`, `.dev`, npm and the `loftwah/fastfingaz` repository. It is
   unique, memorable and says what the product measures. The only compromise is the vanity GitHub
   handle and a more playful tone.
2. **Inkometer** — all four surfaces free, including the top-level GitHub handle. The all-free
   version of Inkmeter, with an instrument spelling. The ink association is narrower than the
   product.
3. **Inkmetre** — all four surfaces free, and the closest literal spelling to Inkmeter. The
   British spelling is a search and spelling risk.

**Inkmeter.com is taken**, so Inkmeter fails the “free on everything” test. **Fastfingaz** passes it
on every surface the product actually needs.

**Approved and shipped 11 November 2026: Fastfingaz.** The extension, site, store copy and cards now
use **Fastfingaz** at **fastfingaz.loftwah.com**. No external domain is planned;
`thinktype.loftwah.com` 301s to the new host. See `docs/RENAME.md` and issue #6 for the migration
record.

## What the rename touched

- `package.json`, `wxt.config.ts`, manifest `name`/`short_name`/`description`.
- Wordmark and copy in the HUD, popup, options, receipt, share cards and site.
- `shared/constants.ts` (`SITE_HOST`, `SITE_URL`, `GITHUB_URL`, `RELEASES_URL`).
- `CHROMEWEBSTORE.md`, `README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/*`.
- GitHub repository name and release assets; old URLs should redirect.
- Domains and DNS; the Chrome Web Store listing; the Discord showcase.
