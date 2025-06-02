# Neon Runner

A pure JavaScript cyberpunk infinite runner game for the browser, designed as an offline-first PWA. Built with no external game libraries, using vanilla ES2023, HTML5 Canvas 2D API, and Web Audio API.

## Gameplay

*   **Objective:** Survive as long as possible by avoiding obstacles.
*   **Controls:**
    *   **Jump:** `Spacebar`, `Arrow Up`, or `Swipe Up` on touch devices.
    *   **Slide:** `Arrow Down` or `Swipe Down` on touch devices (player character ducks - visual effect for slide to be implemented with actual sprites).
*   **Running:** The player character runs automatically from left to right.
*   **Speed:** Game speed starts at 250px/s and increases by 25px/s every 15 seconds of gameplay.
*   **Neon Phase:** Every 30 seconds of gameplay, "Neon Phase" activates for 10 seconds:
    *   Speed increases by an additional 20%.
    *   Visuals change (background and obstacle colors shift).
    *   (Future: Music changes to a more intense track).
*   **Obstacles:** Two types of obstacles (high and low) are generated pseudo-randomly.
*   **Scoring:**
    *   +1 point per frame survived.
    *   (Future: +50 for passing an obstacle, +100 for collecting "Neon Shards").
    *   Your highest score is saved locally in your browser.
*   **Game Over:** Colliding with an obstacle ends the game. The screen will flash, your device may vibrate, and your score will be displayed. You can restart by using the jump command.

## Features

*   Infinite runner mechanics.
*   Dynamic difficulty with increasing speed.
*   "Neon Phase" special game mode.
*   Parallax scrolling background (3 layers).
*   Sprite animation for the player (using a placeholder sprite sheet).
*   Object pooling for efficient obstacle management.
*   AABB collision detection.
*   Adaptive input for keyboard and touch.
*   Game states: Ready, Playing, Game Over.
*   Score and High Score tracking (using `localStorage`).
*   PWA: Installable, offline capable with service worker caching.
*   **Share Button:** System Web Share API dialog with an auto-generated screenshot of the high score (on supported devices).
*   Lightweight anonymous analytics for core gameplay events.
*   Basic accessibility:
    *   Screen flash effect respects `prefers-reduced-motion`.
    *   Subtitle bar for key game events (Jump, Slide, Crash, Neon Phase).
    *   Canvas is keyboard focusable.
    *   HUD text designed for contrast.

## Privacy

The game sends anonymous gameplay events (`game_start`, `game_over`) to `<your analytics server endpoint, e.g., https://analytics.example.com/neon-runner>`. No personal data is collected.

If you are deploying your own copy, please remove the `track()` calls in the code or replace the URL with your own endpoint.

## Development Notes

### Note about early versions
In the initial stages of development (before analytics implementation), the codebase contained a minimal number of lines – only the basic framework for rendering, physics, and PWA setup. Starting from the current phase, functionality is significantly expanding, and the code volume is gradually increasing.

### Автоматическая оптимизация ассетов
GitHub Actions автоматически
* конвертирует все PNG‑спрайты в **WebP** и **AVIF** (качество ≈ 75)
* создаёт MP3‑fallback для каждого OGG‑файла
* копирует оптимизированные файлы в финальную папку `dist/assets`
Поэтому в репозитории достаточно хранить только исходные PNG/OGG.

## Local Build and Run

While the primary way to build and deploy is via GitHub Actions (see `.github/workflows/build.yml`), you can also build locally if you have `esbuild` and `html-minifier-terser` installed.

1.  **Install Dependencies (globally, or use `npx`):**
    *   `esbuild`: Follow official installation instructions (e.g., `npm install -g esbuild` or download binary).
    *   `html-minifier-terser`: `npm install -g html-minifier-terser`.

2.  **Build:**
    Ensure you are in the root directory of the project. Create a `dist` directory if it doesn't exist.
    ```bash
    # Create dist directory
    mkdir -p dist

    # Bundle JavaScript (replace 'dev' with actual BUILD_VERSION for production-like build)
    # The CI script uses github.sha for BUILD_VERSION
    BUILD_VERSION_DEV="0.1.0-dev"
    esbuild src/main.js --bundle --minify --sourcemap "--define:BUILD_VERSION='""$BUILD_VERSION_DEV""'" --outfile=dist/bundle.js

    # Minify HTML
    html-minifier-terser src/index.html --collapse-whitespace --remove-comments -o dist/index.html

    # Copy static assets
    cp src/styles.css src/manifest.json src/service-worker.js dist/
    cp -R src/assets dist/
    ```

3.  **Run:**
    Serve the `dist` directory using a simple HTTP server. For example, using `npx`:
    ```bash
    npx serve dist
    ```
    Then open the provided URL (usually `http://localhost:3000` or `http://localhost:5000`) in your browser.

## TODO Assets

See `TODO_ASSETS.md` for a list of placeholder assets (sprites, audio, PWA icons) that need to be created and replaced to fully realize the game's visual and auditory experience. Key requirements include:

*   Player character animation frames (idle, run, jump, slide).
*   Obstacle sprites (high and low types).
*   Neon Shard collectible sprite.
*   Parallax background layer images.
*   Music loops (normal and Neon Phase).
*   Sound effects (jump, slide, shard collection, crash, Neon Phase activation).
*   PWA icons for various resolutions.

## Future Enhancements (Not in current scope)

*   Actual sprite implementations for player (slide animation), obstacles.
*   Neon Shard collectibles and related scoring.
*   More varied obstacles or patterns.
*   Advanced particle effects.
*   Full sound design and music integration beyond stubs.
*   On-screen touch controls/buttons as an alternative to swipes.
*   Settings menu (e.g., toggle sound, reset high score).
```
