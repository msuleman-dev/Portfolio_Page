# Muhammad Suleman — Game Developer

Portfolio: https://msuleman-dev.github.io/Portfolio_Page/

Static HTML, CSS, and JavaScript, deployed from the root of `main` with GitHub Pages.

## Design and motion

- Ink, lavender, warm paper, and lime palette; large editorial typography and layered real project artwork.
- Lenis eases desktop wheel scrolling. GSAP and ScrollTrigger coordinate masked headings, staggered entrances, scroll-linked word highlights, hero departure, and image parallax.
- Project rail supports mouse drag with inertia, native touch swipe, previous/next buttons, and Arrow/Home/End keys when focused. Dragging suppresses accidental link opening.
- Optional cursor label, subtle artwork tilt, and magnetic primary buttons.
- Motion toggle and system reduced-motion preference disable optional motion. Touch scrolling stays native. Content and links remain available if JavaScript or an animation dependency fails.
- Expanded contributions use native details/summary controls. CV and project URLs are preserved.

## Files

- `index.html`: content and semantic structure
- `style.css`: responsive visual design
- `script.js`: interactions, navigation, and animation orchestration
- `assets/`: project artwork and CV
- `assets/vendor/`: locally served GSAP 3.13.0, ScrollTrigger 3.13.0, and Lenis 1.3.11, installed from npm

Vendor license notices are preserved in the distributed files. See `GSAP-README.md` and `LENIS-LICENSE` alongside them. GSAP license: https://gsap.com/standard-license/. Artwork belongs to its respective owners and illustrates the developer’s project contributions.

Serve this directory with any static HTTP server for development. There is no build step. The animation dependencies are served locally; Google Fonts has system-font fallbacks.
