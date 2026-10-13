# Browser UI checks

Playwright is declared as a development dependency. The initial installation in the agent environment was blocked by an EACCES error reaching registry.npmjs.org; Chromium has not been downloaded yet.

Run these commands from the game directory in a terminal with network access:

```powershell
npm.cmd install --cache .npm-cache
npm.cmd run browser:install
npm.cmd run test:browser
```

On other platforms, use npm instead of npm.cmd. The browser wrapper keeps Chromium in game/.playwright-browsers. npm.cmd run test:browser:ui opens Playwright's interactive runner.

The configuration starts the existing Node server on 127.0.0.1:8877. Keep that port free. Fresh browser contexts isolate test saves from your usual browser and the game's default port 8844.

The smoke suite inspects title/creation screens, exploration, inventory, party, shops, save/reload, combat commands, spells, items, compact combat, and portrait/landscape layouts. Screenshots are written to artifacts/ui-inspection and the HTML report to playwright-report. Downloaded packages, browser binaries, reports, cache, and screenshots are ignored by Git.

The P0 unit suite remains npm.cmd test. No game source, artwork, or styles are changed by this setup.
