# jasonMatney.github.io

Personal site for **Jason Matney, Ph.D.** — Director of Data Visualization & Analytics.

Live URL: [https://jasonmatney.github.io/](https://jasonmatney.github.io/)

## Stack

Plain static files at the repo root (no build step):

- `index.html` — content and structure
- `styles.css` — layout and typography
- `favicon.svg` — simple mark

GitHub Pages serves these from the `main` branch, `/` (root).

## Edit the site

1. Clone this repo.
2. Edit `index.html` for copy; tweak `styles.css` for look.
3. Preview locally by opening `index.html` in a browser, or run a tiny static server:
   ```bash
   python3 -m http.server 8000
   ```
   then visit `http://localhost:8000`.
4. Commit and push to `main`. Pages picks up changes in a minute or two.

## Enable / confirm GitHub Pages

**Settings → Pages** (recommended if the API is unavailable):

1. Open [Repository Settings → Pages](https://github.com/jasonMatney/jasonMatney.github.io/settings/pages).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**.
4. Save. The site publishes at `https://jasonmatney.github.io/`.

Equivalent API (legacy source):

```bash
gh api -X POST repos/jasonMatney/jasonMatney.github.io/pages \
  -f build_type=legacy \
  -f source[branch]=main \
  -f source[path]=/
```

If Pages already exists, update instead of create:

```bash
gh api -X PUT repos/jasonMatney/jasonMatney.github.io/pages \
  -f build_type=legacy \
  -f source[branch]=main \
  -f source[path]=/
```

## Notes

- Phone number is intentionally omitted from the public site.
- LinkedIn was not in the source resume shared for this build; add a link in the hero/social row of `index.html` if desired.
