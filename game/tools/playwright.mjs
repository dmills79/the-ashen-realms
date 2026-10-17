import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

// Keep downloaded browsers inside this project rather than the user-wide cache.
process.env.PLAYWRIGHT_BROWSERS_PATH=fileURLToPath(new URL('../.playwright-browsers',import.meta.url));

const args=process.argv.slice(2);

function waitForExit(child){
  return new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('exit',code=>resolve(code??1));
  });
}

async function stopServer(server){
  if(server.exitCode!==null)return;
  server.kill();
  await Promise.race([
    waitForExit(server),
    new Promise(resolve=>setTimeout(resolve,2000))
  ]);
}

async function runWindowsTests(){
  const gameRoot=fileURLToPath(new URL('../',import.meta.url));
  const server=spawn(process.execPath,[fileURLToPath(new URL('../server.mjs',import.meta.url))],{
    cwd:gameRoot,
    env:{...process.env,HOST:'127.0.0.1',PORT:'8877'},
    stdio:['ignore','pipe','inherit']
  });
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Timed out waiting for the browser-test server.')),10000);
    server.once('error',reject);
    server.once('exit',code=>reject(new Error(`Browser-test server exited early (${code}).`)));
    server.stdout.on('data',chunk=>{
      process.stdout.write(chunk);
      if(chunk.toString().includes('is listening')){
        clearTimeout(timer);
        resolve();
      }
    });
  });
  let runner;
  const stop=()=>{
    runner?.kill();
    server.kill();
  };
  process.once('SIGINT',stop);
  process.once('SIGTERM',stop);
  try{
    await ready;
    runner=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/@playwright/test/cli.js',import.meta.url)),...args],{
      cwd:gameRoot,
      env:{...process.env,ASHEN_EXTERNAL_TEST_SERVER:'1'},
      stdio:'inherit'
    });
    process.exitCode=await waitForExit(runner);
  }finally{
    process.off('SIGINT',stop);
    process.off('SIGTERM',stop);
    await stopServer(server);
  }
}

if(process.platform==='win32'&&args[0]==='test')await runWindowsTests();
else await import('@playwright/test/cli');
