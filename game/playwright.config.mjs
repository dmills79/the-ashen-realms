import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/browser',
  timeout:30000,
  expect:{timeout:10000},
  fullyParallel:false,
  workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  outputDir:'test-results',
  use:{
    baseURL:'http://127.0.0.1:8877',
    browserName:'chromium',
    viewport:{width:1440,height:900},
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  webServer:{
    command:'node server.mjs',
    env:{HOST:'127.0.0.1',PORT:'8877'},
    url:'http://127.0.0.1:8877',
    reuseExistingServer:false
  }
});
