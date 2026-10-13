# Repository Guidelines

## Project Structure & Module Organization

All application files live in `game/`. `game.js` contains RPG data, exploration, combat, rendering, and initialization; `network.js` handles LAN presence, position updates, and chat. `index.html` and `style.css` define the browser interface. `server.mjs` serves static files and WebSockets; `server.py` is an optional aiohttp alternative. Images, sprite manifests, and audio live in `assets/`; Python asset-generation scripts live in `tools/`. Consult `README.md` for release notes and `DESIGN_ROADMAP_3D_MULTIPLAYER.md` for future plans.

## Build, Test, and Development Commands

Run commands from `game/`:

- `npm.cmd start` (Windows) or `npm start`: launch the Node server; requires Node.js 20 or newer. Open `http://127.0.0.1:8844`.
- `npm run dev`: run the same server for development. Refresh the browser after edits.
- `node --check game.js`, `node --check network.js`, and `node --check server.mjs`: check JavaScript syntax.
- `start_windows.bat` or `bash start_linux.sh`: create a Python virtual environment, install `requirements.txt`, and launch the Python server.

The Node path needs no dependency installation. No build, lint, or automated test scripts are configured.

## Coding Style & Naming Conventions

Match surrounding code and avoid unrelated reformatting. Use spaces: two-space indentation in expanded JavaScript blocks and four spaces in Python. Prefer `const`/`let`, single-quoted JavaScript strings, camelCase functions and variables, and uppercase constants. Keep browser code within its existing strict-mode wrappers. Use lowercase asset names with underscores where needed, such as `battle_forest.jpg`; update associated manifests and references together. No formatter is configured.

## Testing Guidelines

No test framework or coverage threshold exists. After changes, check the browser console and manually verify character creation, exploration, combat, inventory, merchants, and save/reload behavior as relevant. For networking changes, use two browser tabs in the same lobby to verify presence, movement, chat, and disconnects. Combat, quests, and inventory remain local. Include verification steps in the pull request.

## Commit & Pull Request Guidelines

This checkout has no Git metadata, so historical commit conventions cannot be verified. Use concise imperative subjects, such as `Fix lobby disconnect cleanup`. Keep changes focused. Describe behavior changes, link relevant issues, record validation, and attach screenshots for visual changes.

## Save Compatibility & Asset Credits

Preserve `ashen-realms-v1.2-save` compatibility; saves depend on browser hostname and port. Retain LPC attribution files under `game/assets/lpc/` when modifying or distributing artwork.
