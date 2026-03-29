# Assignment 1 — 25 Landing Page Versions

**Live site:** [designbuildship-assignment1.vercel.app](https://designbuildship-assignment1.vercel.app/)
**Repository:** [github.com/aanchal-mpcs/DesignBuildShip/tree/main/Assignment1](https://github.com/aanchal-mpcs/DesignBuildShip/tree/main/Assignment1)

---

## 1. Files and Their Roles

| File / Folder | Role |
|---|---|
| `index.html` | **Gallery hub** — displays all 25 versions as styled preview cards with links. Each card reflects the typography and color palette of its version. |
| `version01/index.html` – `version25/index.html` | **Individual landing pages** — each is a self-contained, single-file HTML page (with inline CSS) presenting a unique design for the same content topic: *Tambula & Desire — Paan in Sanskrit Erotic Literature*. |

Every version is a standalone HTML file with no external dependencies beyond Google Fonts and public-domain images. There are no JavaScript files, build tools, or CSS frameworks — the entire site is pure HTML and CSS.

## 2. Pipeline Description

1. **Design & Code** — Each version was created as a self-contained `index.html` with inline CSS, iterating on layout, typography, color palette, and content structure.
2. **Version Control (Git/GitHub)** — Changes were committed incrementally to the `main` branch, with each commit corresponding to a new version or refinement.
3. **Deployment (Vercel)** — The GitHub repository is connected to Vercel with the root directory set to `Assignment1`. Every push to `main` triggers an automatic deployment to [designbuildship-assignment1.vercel.app](https://designbuildship-assignment1.vercel.app/). No build step is required since the site is static HTML.

## 3. Version 25 — Design Justification

Version 25 is the final landing page, representing the culmination of 24 prior iterations. Key design decisions:

- **Typography:** Bodoni Moda for headings and EB Garamond for body text — a high-contrast serif pairing that evokes the feel of a luxury literary journal, appropriate for the scholarly-yet-sensuous subject matter.
- **Color palette:** Warm cream (`#f4f0ea`) background with dark brown (`#2a2520`) text and gold (`#b8860b`) accents. This palette references aged manuscripts and the visual language of South Asian miniature painting.
- **Layout structure:** Sections flow from a centered hero with statistics, through an introduction with a decorative drop cap, into a two-column origins section, an editorial grid of source texts, a dark-background section with card-based ritual descriptions, a timeline of literary history, and a closing CTA — each section using a distinct layout to maintain visual interest across a long page.
- **Real imagery:** Public-domain artworks from The Metropolitan Museum of Art, the Walters Art Museum, and Wikimedia Commons replace placeholder images, grounding the literary content in actual historical art.
- **Responsive design:** CSS grid and `clamp()` typography ensure the page works across screen sizes, collapsing to single-column layouts on mobile.
- **Iterative heritage:** v25 directly refines v23, which itself merged the luxury-fashion aesthetic of v13 with the manuscript depth of v16, adding real imagery from v20 and readability improvements from v22. The result balances editorial sophistication with scholarly substance.
