# Muhammad Suleman — Game Developer Portfolio

Responsive portfolio built with HTML, CSS, and JavaScript.

## GitHub Pages

In Settings → Pages, choose **Deploy from a branch**, select **main** and **/ (root)**, then Save.

Website address after Pages is enabled: https://msuleman-dev.github.io/Portfolio_Page/

## Files

- `index.html` — page content
- `style.css` — layout, styling, and transitions
- `script.js` — interactive geometry, project dragging, pointer effects, navigation, and motion controls
- `assets/` — official game promotional artwork

Game artwork belongs to its respective owners and is included to illustrate portfolio projects.

## Interaction and accessibility

- Cyan and coral accents on a deep navy palette.
- Drag the hero geometry with a mouse, or focus it and use arrow keys. The reset control restores its initial rotation.
- Drag the project strip with a mouse, swipe it on touch devices, or use the previous/next controls. Arrow keys, Home, and End also work while the strip is focused.
- Project movement pauses on hover or keyboard focus and has an explicit pause control. Dragging suppresses accidental link activation.
- Automatic movement and pointer effects respect reduced-motion settings. Animations pause off-screen and when the browser tab is hidden.
- Native scrolling, links, and the CV download remain available without JavaScript.

No animation libraries or WebGL support are required. Serve the repository root with any static HTTP server for development.
