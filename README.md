# White Hat Hacker Portfolio - Project Structure Documentation

## 1. Project Overview

This project is a personal portfolio website for a white-hat hacker. It showcases skills, projects, and insights into cybersecurity, featuring a dynamic 3D digital earth visualization with attack animations as a central visual theme. The website is bilingual (English/Traditional Chinese) and built with HTML, CSS, and JavaScript, heavily utilizing the Three.js library for 3D graphics and `tsparticles` for background effects.

**Key Technologies:**
- HTML5
- CSS3
- JavaScript (ES6+)
- Three.js (r161)
- BufferGeometryUtils.js (from Three.js r161 examples)
- tsparticles.js

## 2. File Structure & Purpose

- **`index.html` (and `*-zh.html` variants)**: Main HTML entry point and structure for all pages.
- **`css/main.css`**: Primary stylesheet defining the visual appearance, layout, and responsiveness.
- **`js/main.js`**: Core JavaScript file handling all dynamic behavior, UI interactions, and the Three.js 3D visualization.
- **BufferGeometryUtils.js (loaded via CDN)**: Utility functions for Three.js, specifically used for `mergeVertices`.
- **`assets/`**: Contains static assets like images, icons. (Note: `js/main.js` is also found in `assets/js/main.js` in the provided file list, which might indicate a duplicate or an old path. The primary active script seems to be `js/main.js` based on `index.html`.)

## 3. HTML Structure (`index.html`)

The `index.html` file provides the foundational structure for the website:

- **Standard HTML5 Layout**: Uses `<!DOCTYPE html>`, `<html>`, `<head>`, and `<body>`.
- **`<head>` Section**:
    - Meta tags for SEO (charset, viewport, description, keywords).
    - Favicon links.
    - Google Fonts integration (`Orbitron` for a futuristic feel, `Roboto` and `Noto Sans TC` for content).
    - CDN link for `tsparticles.js`.
    - CDN links for Prism.js (CSS and JS) for code highlighting.
    - Link to the main stylesheet: `css/main.css`.
- **`<body>` Section**:
    - **Background Elements**:
        - `#tsparticles`: Container for the `tsparticles.js` animated background.
        - `#digital-earth-container`: Container for the Three.js canvas, intended to display the 3D digital earth.
    - **`<header>`**: Fixed navigation bar at the top.
        - Logo (`.logo`).
        - Main navigation links (`.nav-links`) for Home, About, Projects, Contact.
        - Language switcher (`.lang-switch`) for EN/ZH.
        - Hamburger menu icon (`.hamburger`) for mobile navigation.
    - **`<main>`**: Main content area of the page.
        - `#hero` (Homepage): Full-viewport hero section with a prominent title (using a `.glitch` text effect) and a Call-To-Action button.
        - `#intro-summary`: A styled content panel providing a brief introduction.
        - Other pages (About, Projects, Contact) will have their specific content within `<main>`.
    - **`<footer>`**: Contains copyright information and social media links.
    - **Script Loading Order (End of Body)**:
        1.  Three.js (r161) from CDN.
        2.  BufferGeometryUtils.js from CDN.
        3.  Main application logic: `js/main.js`.

## 4. CSS Styling (`css/main.css`)

The `css/main.css` file dictates the website's visual identity:

- **Reset & Base Styles**: Includes a simplified CSS reset and base styles for `body`, typography, etc.
- **Color Palette**: Dark theme (`#000814` Space Black background) accented with:
    - Neon Blue (`#00B4D8`)
    - Ultraviolet (`#5E60CE`)
    - Signal Green (`#38F321`)
- **Typography**: Uses 'Orbitron' for headings and 'Roboto'/'Noto Sans TC' for body text.
- **Background Effects**:
    - `#tsparticles::before`: CSS-driven grid lines with a pulsing animation.
- **Layout**: Defines layout for header, footer, main content sections, and responsive adjustments.
- **Components Styling**:
    - Header: Fixed position, backdrop blur.
    - Navigation: Desktop and mobile (hamburger-triggered fly-in) versions.
    - Hero Section: Styling for the main title, subtitle, and CTA button. Includes a CSS-only `.glitch` animation for the title.
    - Content Panels (`.content-panel`): Styled containers with semi-transparent backgrounds and borders.
    - Cards (`.skill-card`, `.project-card`): For displaying skills and projects in a grid layout.
    - Forms (Contact Page): Styled input fields and labels.
- **Prism.js Theme Overrides**: Customizes the Okaidia theme for code blocks to match the site's aesthetic.
- **Responsive Design**: Uses `@media` queries (e.g., `max-width: 768px`) to adapt the layout for smaller screens.
- **Reduced Motion**: Includes `@media (prefers-reduced-motion: reduce)` to minimize animations for users who prefer it.

## 5. JavaScript Core Logic (`js/main.js`)

This is the heart of the website's interactivity and 3D visualization, executed after `DOMContentLoaded`.

### 5.1. UI Helpers & Language Persistence
- **Hamburger Menu**: Toggles navigation links visibility and icon animation on mobile.
- **Language Switcher**:
    - Detects current language and preferred language (from `localStorage`).
    - Dynamically updates links and redirects to the correct HTML version (e.g., `index.html` vs `index-zh.html`).

### 5.2. Three.js Digital Earth & Attack Animation
This is the most complex part, responsible for the 3D interactive globe.

- **Scene Setup (`init()` function)**:
    - Initializes `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer`.
    - Sets up `THREE.EffectComposer` with `RenderPass` and `UnrealBloomPass` for a bloom post-processing effect.
    - Creates a `THREE.Clock` for animation timing.
- **Earth Model Construction (`init()` function)**:
    1.  `rawBaseGeo = new THREE.IcosahedronGeometry(earthRadius, 3)`: Creates the basic icosahedron.
    2.  **`BufferGeometryUtils.mergeVertices()`**:
        - Attempts to process `rawBaseGeo` using `THREE.BufferGeometryUtils.mergeVertices()` to ensure it becomes an indexed geometry (to fix issues where `rawBaseGeo.index` might be `null` due to browser/extension interference).
        - Includes diagnostic `console.log` statements to track this process.
        - The result is stored in `baseGeoToUse`.
    3.  **Graph Construction (`buildGraph(baseGeoToUse)`)**:
        - Takes the (ideally) indexed `baseGeoToUse`.
        - If `baseGeoToUse.index` is valid, it iterates through the face indices to build an adjacency list (`adjacency`) representing connections between vertices of the icosahedron. This graph is crucial for pathfinding.
        - If `baseGeoToUse.index` is `null`, it logs a warning.
    4.  **Visual Representation**:
        - **Nodes**: An `InstancedMesh` of small spheres (`nodeGeo`) is created, with instances placed at each vertex position derived from `baseGeoToUse.attributes.position`.
        - **Edges**: `THREE.LineSegments` using `THREE.EdgesGeometry(baseGeoToUse)` are created to draw the grid lines of the icosahedron.
        - These are added to an `earthGroup` which is then added to the scene and set to rotate slowly.
- **`MinPriorityQueue` Class**: A simple implementation used by the Dijkstra algorithm in `shortestPath`.
- **`ArcSystem` Class**: Manages the creation, animation, and cleanup of attack visuals.
    - **`constructor(group, nodeGeo, attackColors, graph)`**:
        - Stores references to the parent group, the geometry used for node positions (`baseGeoToUse`), attack color definitions, and the pre-computed `graph` (adjacency list).
    - **`shortestPath(startIndex, endIndex)`**:
        - Implements Dijkstra's algorithm to find the shortest path (in terms of number of edges) between two node indices on the `graph`.
        - Returns an array of node indices representing the path.
    - **`createArc(startIdx, endIdx, color)`**:
        1.  Calls `shortestPath` to get the sequence of node indices.
        2.  Converts these indices to `THREE.Vector3` world coordinates using `this.nodeGeo.attributes.position`.
        3.  **Path Smoothing**: The `rough` path (direct connections between nodes) is smoothed by:
            - Iterating through pairs of consecutive points in the `rough` path.
            - For each segment, generating `nSeg` (e.g., 4) intermediate points using `Vector3.lerp()`.
            - Normalizing these intermediate points and scaling them by `earthRadius` to ensure they lie on the sphere's surface.
            - The resulting `smooth` points form the final path.
        4.  `curve = new THREE.CatmullRomCurve3(smooth, ...)`: Creates a CatmullRom curve from the smoothed points. This curve is used for animating the attack head and drawing the tube.
        5.  **Visual Elements**:
            - **Tube**: `THREE.TubeGeometry` is created along the `curve`, styled with a custom shader (`tubeVS`, `tubeFS`) that handles head progress and trail length.
            - **Particle Head**: A `THREE.SphereGeometry` styled with a custom shader (`particleVS`, `particleFS`) for a glowing effect, animated along the `curve`.
            - **Trail**: An `InstancedMesh` of small spheres (`this.trailGeo`, `this.trailMat` with `trailSegVS`, `trailSegFS`) follows the particle head.
        6.  **Lifecycle**: The `life` of an arc is calculated based on the `curve.getLength()` to attempt a more uniform visual speed across different path lengths.
        7.  Arcs are added to `this.activeArcs` and removed after their `life` expires using `setTimeout`.
    - **`update(dt)`**: Called every frame.
        - Updates `elapsed` time and progress `p` for each active arc.
        - Animates the particle head (`pMesh.position`) along its `curve` using `curve.getPointAt(p)`.
        - Manages the `trailPositions` array (unshift new head positions, pop old ones).
        - Implements the "做法 A" tail-fading logic when `p >= 1` (head reaches destination): unshifts the curve's endpoint and pops from the tail at intervals.
        - Updates shader uniforms (`uHeadProgress` for the tube, matrices for the instanced trail).
    - **`maybeTrigger()`**: Probabilistically triggers new attacks (single or cluster) by selecting random start/end node indices and calling `createArc`.
- **Animation Loop (`animate()` function)**:
    - Standard `requestAnimationFrame` loop.
    - Updates `earthGroup` rotation.
    - Calls `arcSystem.update(dt)` and `arcSystem.maybeTrigger()`.
    - Renders the scene via the `composer` (if bloom is enabled) or directly via the `renderer`.

### 5.3. Other JavaScript Functionality
- **tsparticles Initialization**: If the library is detected, it initializes the particle background with specified configurations (interactivity, particle appearance, movement, links).
- **Console Easter Eggs**: Logs a couple of themed messages.
- **Dynamic Year Update**: Sets the current year in the footer.
- **Scroll Reveal Animations**: Uses `IntersectionObserver` to fade in and slide up elements like `.content-panel`, `.project-card` as they enter the viewport.

## 6. Key Algorithms & Concepts Employed

- **Dijkstra's Algorithm**: Used in `ArcSystem.shortestPath` for finding the shortest path on the icosahedron graph.
- **Catmull-Rom Curves**: Used in `ArcSystem.createArc` to generate a smooth path for the attack animation from a series of points.
- **Spherical Linear Interpolation (Implicit)**: While `Vector3.lerp()` followed by `normalize().multiplyScalar(earthRadius)` is used for path smoothing, it approximates points lying on the sphere surface between two nodes.
- **Instanced Rendering (`THREE.InstancedMesh`)**: Used for efficiently rendering the many small spheres that form the attack trail and the nodes on the Earth.
- **Custom Shaders (GLSL)**: Used for the attack tube, particle head, and trail segments to achieve specific visual effects (e.g., glowing, fading, progress-based appearance).
- **Post-processing (Bloom)**: `UnrealBloomPass` is used to give a glowing effect to bright parts of the scene.
- **Event-Driven Programming**: `DOMContentLoaded` for script initialization, click handlers for UI elements.
- **Responsive Web Design**: CSS media queries and JavaScript-driven mobile navigation.
- **`BufferGeometryUtils.mergeVertices`**: Crucial for ensuring the base icosahedron geometry is properly indexed, especially when browser environments might interfere with default geometry properties.

This documentation should provide a good overview for understanding the project's architecture and main components.