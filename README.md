# Nancy Nguyen — portfolio prototype

A minimal, responsive portfolio/archive for Nancy Nguyen. The site is plain HTML, CSS, JavaScript, and JSON; it has no build step or framework.

## Preview locally

Because the site loads JSON with `fetch()`, do not open `index.html` directly from Finder. Serve the folder locally instead.

- In VS Code, install the **Live Server** extension.
- Open this project folder.
- Right-click `index.html` and choose **Open with Live Server**.

Alternatively, from this folder run `python3 -m http.server 8000` in Terminal, then open `http://localhost:8000`.

## Add paintings

1. Put image files in `images/` (for example, `images/nn001.jpg`).
2. Edit `data/artworks.json`. Each artwork should have a unique `id`, a title, year, medium, dimensions, and an image path relative to the project root.
3. In `data/site-config.json`, set `homepageArtworkId` to the ID of the painting that should appear on the front page. It does not automatically change when a newer work is added.
4. Add additional artwork objects to the JSON array. The Works page preserves each image's original proportions; it does not crop works into uniform tiles.

The homepage painting is centered on white, with a maximum width of about 80vw and maximum height of about 78svh on desktop. These are starting values and can be adjusted in `assets/css/style.css`.

## Exhibitions and CV

Edit `data/exhibitions.json`. Use `type: "solo"` or `type: "group"`, plus year, title, venue, location, and an optional external URL. The exhibition page sorts each category from newest to oldest. The current records are transcribed from a CV screenshot and should be checked by Nancy before publication. In particular, the screenshot appears to show a truncated year ("202") for The David Ireland House; the year in this draft is provisional and must be confirmed.

## Before launch

- Replace the generic Instagram links in the three HTML files with Nancy's actual profile URL. The Instagram URL in `data/site-config.json` is currently a placeholder too.
- Replace the example artwork record with real titles and image paths.
- Check exhibition titles, dates, venues, spelling, and links with Nancy.
- Use appropriately sized, color-managed image files and get Nancy's approval for which images are public.
- The repository is currently private. Before publishing with GitHub Pages, review repository visibility and Pages settings; a public live site can be served from a repository depending on the hosting setup.
- Domain and account ownership should remain with Nancy; this repository is currently under the linked GitHub account and can be transferred or managed with her as owner later.

## Structure

- `index.html`: home / featured painting
- `works.html`: responsive artwork archive and detail dialog
- `exhibitions.html`: selected exhibitions and education
- `data/site-config.json`: homepage painting selection
- `data/artworks.json`: artwork records
- `data/exhibitions.json`: exhibition and CV records
- `assets/css/style.css`: layout and visual styling
- `assets/js/site.js`: data loading and rendering
- `images/`: artwork image files
