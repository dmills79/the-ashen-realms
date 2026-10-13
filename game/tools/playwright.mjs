import {fileURLToPath} from 'node:url';

// Keep downloaded browsers inside this project rather than the user-wide cache.
process.env.PLAYWRIGHT_BROWSERS_PATH=fileURLToPath(new URL('../.playwright-browsers',import.meta.url));
await import('@playwright/test/cli');
