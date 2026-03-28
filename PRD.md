# PRD: CleanJSON Web — JSON Formatter & Validator

## Overview

**Service Name:** CleanJSON Web
**Short Title:** JSON Formatter
**One-liner:** A zero-cost, SEO-optimized, ad-monetized JSON formatter and validator that runs entirely in the browser.

Developers worldwide paste messy JSON and need it formatted, validated, and error-highlighted instantly. This tool captures that global developer traffic with zero backend cost, strong SEO, responsive design, and built-in monetization from day one.

---

## Architecture Principles

- **Zero backend.** Everything runs client-side in the browser. No server, no database, no hosting cost beyond static file serving.
- **Zero cost to operate.** Use free-tier hosting (Vercel or Netlify), free analytics (visitor counter via localStorage + Google Sheets), free data collection (Google Apps Script webhook).
- **Monetize immediately.** Adsterra ad units integrated from launch. Google Adsense as secondary/future channel.
- **SEO-first.** Semantic HTML, meta tags, Open Graph, structured data (JSON-LD), fast load times, accessible markup.
- **Responsive.** Works flawlessly on mobile, tablet, and desktop.

---

## Harness Design — Agent Structure

This project uses the Claude Code harness pattern. The following files govern autonomous development:

### Required Files (created by Initializer Agent)

1. **`feature_list.json`** — ordered list of features with status tracking
2. **`claude-progress.txt`** — human-readable log of what's done, what's next, blockers
3. **`init.sh`** — how to start the dev server locally (`npx serve .` or equivalent)

### Session Start Routine (every session)

```
1. Read claude-progress.txt → understand current state
2. Read feature_list.json → identify next unfinished feature
3. Run local server / verify build works
4. Implement ONE feature fully (code + test)
5. Git commit with descriptive message
6. Update claude-progress.txt
7. Update feature_list.json (mark feature complete)
8. If milestone reached → git push
9. Move to next feature or end session
```

### Git & Deployment Rules

- **Create the GitHub repo using `gh` CLI** at project start:
  ```bash
  gh repo create cleanjson-web --public --source=. --remote=origin --push
  ```
- **Git push at every major milestone** (not every commit — push when a milestone is complete).
- **Deploy to Vercel or Netlify via CLI** so the live URL does not expose your GitHub username:
  ```bash
  # Vercel
  npx vercel --prod --yes
  # OR Netlify
  npx netlify deploy --prod --dir=.
  ```
- Use the Vercel/Netlify URL as the public-facing link. Never share the raw GitHub URL publicly.
- **When blocked, always try CLI automation first.** Do not pause for manual steps if a CLI tool can solve it.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Vanilla HTML/CSS/JS (single page) | Zero build step, zero cost, fastest load |
| JSON Engine | [jsonlint](https://github.com/zaach/jsonlint) or custom parser | Client-side validation + formatting |
| Hosting | Vercel or Netlify (free tier) | Free, global CDN, custom domain support |
| Data Collection | Google Sheets via Apps Script webhook | Free, no database needed |
| Ads | Adsterra (primary), Google Adsense (secondary) | Adsterra approves faster, pays per impression |
| Analytics | Custom visitor counter (localStorage + Sheets) | Zero cost |
| Version Control | GitHub (via `gh` CLI) | Free |

---

## Feature List (ordered by implementation priority)

### Milestone 1 — Core MVP

1. **Project scaffolding**
   - Create `index.html`, `style.css`, `app.js`
   - Initialize git, create GitHub repo via `gh` CLI
   - Create `feature_list.json`, `claude-progress.txt`, `init.sh`

2. **JSON input/output editor**
   - Left panel: raw JSON textarea (input)
   - Right panel: formatted JSON output (read-only, syntax-highlighted)
   - "Format" button, "Clear" button, "Copy" button
   - Support paste, drag-drop, and keyboard shortcut (Ctrl+Shift+F)

3. **JSON validation with error reporting**
   - Validate on button click and optionally on paste
   - Show line number + descriptive error message
   - Highlight the error line in the input panel

4. **Soft color theme**
   - Background: soft warm neutral (e.g., `#F7F5F2` or `#FAFAF8`) — NOT pure white
   - Subtle card shadows, rounded corners
   - Syntax highlighting with muted, developer-friendly palette
   - Dark mode toggle (optional, but design the light theme to feel gentle)

5. **Responsive layout**
   - Desktop: side-by-side panels
   - Tablet: stacked or adjustable split
   - Mobile: tabbed view (Input / Output tabs)
   - All buttons and text comfortably tappable on mobile

**→ Milestone 1 complete: `git push` + deploy to Vercel/Netlify**

### Milestone 2 — SEO & Monetization

6. **SEO optimization**
   - Semantic HTML5 (`<main>`, `<section>`, `<header>`, `<footer>`)
   - `<title>`: "JSON Formatter & Validator — Free Online Tool | CleanJSON"
   - Meta description, keywords, canonical URL
   - Open Graph + Twitter Card meta tags
   - JSON-LD structured data (`WebApplication` schema)
   - `robots.txt` and `sitemap.xml`
   - Fast load time (target < 1s FCP on Lighthouse)
   - `<h1>` tag with primary keyword, natural `<h2>`/`<h3>` structure
   - Alt text on all images/icons

7. **Adsterra ad integration**
   - Reserve ad slots in the layout that do NOT disrupt the core UX:
     - Top banner (728x90 leaderboard or responsive)
     - Sidebar ad (300x250) on desktop — below the fold or beside output
     - Bottom sticky banner on mobile
   - Adsterra integration steps:
     1. Sign up at adsterra.com
     2. Create ad units (banner, native, popunder — start with banner)
     3. Copy the provided `<script>` tag / ad unit key
     4. Paste into designated ad container `<div>` elements
   - **Code must include placeholder `<div>` containers with clear comments like `<!-- ADSTERRA: paste banner code here -->` and `id="adsterra-banner-top"` so the key can be dropped in instantly.**
   - Adsterra pays per impression (CPM), so even low traffic earns revenue.
   - Additionally, consider Adsterra popunder or social bar for higher CPM if appropriate.

8. **Google Adsense preparation (secondary)**
   - Add `ads.txt` file for Adsense publisher ID (fill in later)
   - Reserve one additional ad slot for Adsense auto-ads `<script>` tag
   - Comment: `<!-- GOOGLE ADSENSE: paste auto-ads script here -->`

**→ Milestone 2 complete: `git push` + redeploy**

### Milestone 3 — Data Collection & Analytics

9. **Visitor counter**
   - Track "Today's Visitors" and "Total Visitors"
   - Display in footer or a subtle corner badge — must NOT disrupt the main UX
   - Use a lightweight approach:
     - Option A: Google Sheets as backend via Apps Script (POST on page load, GET count)
     - Option B: Free counter API (e.g., countapi.xyz or similar)
   - Show numbers with a small icon (e.g., 👥 Today: 42 | Total: 1,280)

10. **Google Sheets webhook for input data collection**
    - When user clicks "Format" button, silently POST the following to a Google Apps Script webhook:
      - Timestamp
      - Input JSON length (character count) — NOT the actual JSON content (privacy)
      - Validation result (valid / invalid)
      - Error type (if invalid)
      - User agent (browser info)
    - **Google Apps Script setup (automate via `gcloud` CLI where possible):**
      1. Create a Google Sheet
      2. Open Apps Script editor (Extensions → Apps Script)
      3. Deploy as web app with `doPost(e)` function
      4. Copy the web app URL
      5. Paste into `app.js` as the webhook endpoint
    - **The PRD must include the full Apps Script code** so Claude Code can output it:
      ```javascript
      function doPost(e) {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var data = JSON.parse(e.postData.contents);
        sheet.appendRow([
          new Date(),
          data.inputLength,
          data.isValid,
          data.errorType || '',
          data.userAgent || ''
        ]);
        return ContentService
          .createTextOutput(JSON.stringify({status: 'ok'}))
          .setMimeType(ContentService.MimeType.JSON);
      }
      ```
    - The POST request in `app.js` must be fire-and-forget (no blocking the UI):
      ```javascript
      fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {}); // silent fail
      ```

**→ Milestone 3 complete: `git push` + redeploy**

### Milestone 4 — Polish & Extra Features

11. **Additional JSON tools**
    - Minify JSON (collapse whitespace)
    - JSON → string escape / unescape
    - Tree view (collapsible node tree)
    - JSON path finder (click a node → show its JSON path)

12. **Quality of life**
    - Line numbers in input textarea
    - Auto-detect and format on paste (toggleable)
    - Keyboard shortcuts panel
    - "Share formatted JSON" — generate a shareable URL with encoded JSON (base64 in hash)
    - Download formatted JSON as `.json` file

13. **Performance & accessibility**
    - Lighthouse score > 95 on all categories
    - ARIA labels on all interactive elements
    - Keyboard navigation support
    - `<noscript>` fallback message
    - Lazy-load ad scripts

**→ Milestone 4 complete: `git push` + redeploy (final)**

---

## Design Spec

### Color Palette (Soft Theme)

```
--bg-primary:       #F5F3EF       (warm cream)
--bg-secondary:     #EDEAE4       (soft sand)
--bg-card:          #FFFFFF        (white cards on cream)
--text-primary:     #2C2C2C        (near-black, not harsh)
--text-secondary:   #6B6B6B        (muted gray)
--accent:           #4A90D9        (calm blue)
--accent-hover:     #3A7BC8
--success:          #5CB85C        (soft green)
--error:            #D9534F        (soft red)
--border:           #E0DDD7        (subtle warm border)
--syntax-key:       #6B4C9A        (muted purple)
--syntax-string:    #2E7D32        (muted green)
--syntax-number:    #C55A11        (muted orange)
--syntax-bool:      #1565C0        (muted blue)
--syntax-null:      #9E9E9E        (gray)
```

### Typography

- Headings: `'DM Sans'` or `'Plus Jakarta Sans'` (Google Fonts, free)
- Code/JSON: `'JetBrains Mono'` or `'Fira Code'` (Google Fonts, free)
- Body: Same as headings for consistency

### Layout

```
┌─────────────────────────────────────────────────┐
│  [Logo] CleanJSON          [Dark Mode] [GitHub] │  ← Header
├─────────────────────────────────────────────────┤
│  <!-- ADSTERRA: top banner -->                  │  ← Ad (non-intrusive)
├───────────────────────┬─────────────────────────┤
│                       │                         │
│   INPUT               │   OUTPUT                │
│   (textarea)          │   (highlighted)         │
│                       │                         │
│                       │                         │
├───────────────────────┴─────────────────────────┤
│  [Format] [Validate] [Minify] [Copy] [Clear]    │  ← Action bar
├─────────────────────────────────────────────────┤
│  Error: Line 5 — Expected ':' after key         │  ← Error display
├─────────────────────────────────────────────────┤
│  👥 Today: 42 | Total: 1,280    © CleanJSON     │  ← Footer
│  <!-- ADSTERRA: bottom banner (mobile) -->      │
└─────────────────────────────────────────────────┘
```

### Visitor Counter Placement

- **Desktop:** Bottom-right of the footer, small text, muted color
- **Mobile:** Footer area, single line, small font
- Must NOT appear in the main work area. Must feel like a subtle site stat, not a distraction.

---

## Deployment Checklist

1. `gh repo create cleanjson-web --public --source=. --remote=origin --push`
2. `npx vercel --prod --yes` OR `npx netlify deploy --prod --dir=.`
3. Verify live URL works (use Vercel/Netlify URL, not GitHub)
4. Test on mobile (Chrome DevTools device emulation)
5. Run Lighthouse audit (target 95+)
6. Verify Adsterra ad slots render (once keys are added)
7. Verify Google Sheets webhook receives data
8. Verify visitor counter increments

---

## Automation Rules for Claude Code

1. **If blocked by a CLI-solvable problem → solve it with CLI. Do not wait for human input.**
2. **Use `gh` CLI for all GitHub operations** (create repo, push, manage).
3. **Use `npx vercel` or `npx netlify-cli` for deployment** — do not just write a guide, actually deploy.
4. **Use `gcloud` CLI if Google auth is needed** (it's already installed).
5. **Never expose GitHub username in public-facing links.** Always use Vercel/Netlify deployment URL.
6. **Git push at every milestone**, not at every commit.
7. **Adsterra integration:** Place placeholder containers with clear IDs and comments. Once the user provides the Adsterra ad unit key, drop it in. The layout must already accommodate the ad dimensions.
8. **Google Sheets webhook:** Include the full Apps Script code in the codebase (in a `/docs` or `/scripts` folder) so the user can paste it directly into Apps Script. Wire up the frontend POST call with a configurable `WEBHOOK_URL` constant.

---

## Success Metrics

- Lighthouse Performance: > 95
- Lighthouse SEO: > 95
- Lighthouse Accessibility: > 95
- First Contentful Paint: < 1 second
- Total page weight: < 500 KB (excluding ads)
- Works offline (core formatting — no network needed)
- Monetization: Adsterra ads serving impressions from day one

---

## Out of Scope (for now)

- User accounts / login
- Backend API
- Database
- JSON schema validation
- File upload (keep it paste-only for MVP, add in Milestone 4 if time permits)
- Paid features

---

## Reference: Harness Session Cycle

```
┌──────────────────────────────────────────┐
│  1. Read claude-progress.txt             │
│  2. Read feature_list.json               │
│  3. Verify build / dev server works      │
│  4. Pick next incomplete feature         │
│  5. Implement feature                    │
│  6. Test feature                         │
│  7. Git commit (descriptive message)     │
│  8. Update claude-progress.txt           │
│  9. Update feature_list.json             │
│ 10. If milestone complete → git push     │
│ 11. If milestone complete → redeploy     │
│ 12. Loop to step 4 or end session        │
└──────────────────────────────────────────┘
```

---

*This PRD is the single source of truth. Claude Code should read this file at the start of every session and follow the feature list, milestone structure, and automation rules exactly.*
