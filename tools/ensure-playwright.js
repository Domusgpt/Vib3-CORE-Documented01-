import fs from 'fs';
import { spawnSync } from 'child_process';
import { chromium } from 'playwright';

function ensureChromium() {
  const executable = chromium.executablePath();
  const exists = executable && fs.existsSync(executable);

  if (exists) {
    console.log(`✅ Playwright chromium present at ${executable}`);
    return;
  }

  console.warn('⚠️ Playwright chromium binary missing; installing with --with-deps chromium');
  const result = spawnSync('npx', ['playwright', 'install', '--with-deps', 'chromium'], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error('❌ Failed to install Playwright chromium');
    process.exit(result.status ?? 1);
  }

  const postCheck = chromium.executablePath();
  if (!postCheck || !fs.existsSync(postCheck)) {
    console.error('❌ Playwright chromium still missing after install.');
    process.exit(1);
  }

  console.log(`✅ Playwright chromium installed at ${postCheck}`);
}

ensureChromium();
