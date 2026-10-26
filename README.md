# Nancy Nguyen — portfolio prototype

A minimal, responsive artist website built with plain HTML, CSS, JavaScript, and JSON. There is no build step or framework.

The current homepage is an experimental, full-screen vertical loop of paintings. The intent is to let visitors encounter the work with very little interface: the painting fills the viewport, a click opens the full image, the mantra appears briefly during transitions, and Instagram is available through a small icon. The loop uses Pageable 0.6.6 from a CDN.

## Preview locally

Because the site loads JSON with `fetch()`, do not open `index.html` directly from Finder. Serve the project folder locally instead.

- In VS Code, install the **Live Server** extension.
- Open this project folder.
- Right-click `index.html` and choose **Open with Live Server**.

Alternatively, from the project folder run `python3 -m http.server 8000` in Terminal, then open `http://localhost:8000`.

## Homepage interaction

- Scroll, swipe, or use the keyboard to move through the paintings. The carousel is configured to move one slide per deliberate wheel gesture and loops continuously.
- Click or tap a painting to open its full image in a dialog.
- The crop shown in the loop is randomized so each appearance can reveal a different region of a work.
- The Tara mantra, `oṃ tāre tuttāre ture svāhā`, appears briefly during transitions.
- A temporary white-space treatment is being prototyped: while a slide transition is active, the painting viewport is inset slightly against the white slide background. This is experimental and may need visual tuning across devices.
- The mobile scroll cue disappears after the visitor begins interacting.

The homepage uses the external Pageable stylesheet and script linked in `index.html`. If the CDN library fails to load, the homepage falls back to a non-carousel layout.

## Add or edit paintings

1. Add image files to `images/`. Use clear, consistent filenames, such as `NN007.jpg`.
2. Edit `data/artworks.json`. Each object should have a unique `id`, plus the available artwork details:
   - `title`
   - `year`
   - `medium`
   - `dimensions`
   - `image` — filename or path relative to the project root
   - `alt` — concise description for visitors using assistive technology
   - `description` — optional supporting text; not every page currently displays this field
3. Keep the JSON valid: use double quotes around keys and string values, and do not leave a comma after the final item.
4. The homepage uses the artwork records in `data/artworks.json`. If `curatedArtworkIds` is present in `data/site-config.json`, it controls the homepage order; otherwise the order in the JSON file is used.
5. The Works page uses the same artwork data for the archive. The loop crops images for its full-screen presentation; the Works page is intended to show complete images with their original proportions.

The current artwork entries and descriptions are prototypes. Confirm titles, dates, materials, dimensions, descriptions, and which images Nancy wants to publish before launch.

## Site configuration

Edit `data/site-config.json` for shared settings:

- `instagramUrl`: the Instagram destination used by links marked `data-instagram-link`.
- `curatedArtworkIds` (optional): an ordered array of artwork IDs to curate the homepage loop.

The Instagram URL is currently set to Nancy's profile. Keep it in this one configuration file where possible; the HTML contains fallback links in case the configuration cannot load.

## Exhibitions and CV

Edit `data/exhibitions.json` to update the exhibitions page. Records support solo/group exhibition types, year, title, venue, location, and an optional external URL. Check every entry with Nancy before publishing, especially any dates or venue details transcribed from older source material.

## Files

- `index.html`: full-screen artwork loop homepage
- `works.html`: artwork archive and image detail dialog
- `exhibitions.html`: exhibitions and selected CV information
- `data/artworks.json`: artwork records shared by the homepage and Works page
- `data/site-config.json`: Instagram URL and optional homepage ordering
- `data/exhibitions.json`: exhibition and CV records
- `assets/css/style.css`: layout, responsive styling, and transition effects
- `assets/js/site.js`: data loading, carousel behavior, artwork dialog, and shared links
- `images/`: artwork image files

## Before launch

- Review all artwork images and metadata with Nancy.
- Verify exhibition titles, dates, venues, spelling, and links.
- Use web-sized images that preserve color and detail without being unnecessarily large; retain archival originals separately.
- Test the homepage on both a phone and a desktop, including touch gestures, mouse wheel/trackpad scrolling, artwork dialogs, loop wraparound, and reduced-motion settings.
- Confirm GitHub Pages settings and the intended domain before sharing the site widely. Keep domain and account ownership under Nancy's control or make a clear plan to transfer them.
- When changing `assets/css/style.css` or `assets/js/site.js`, update the cache query strings in `index.html` so browsers fetch the new versions.
