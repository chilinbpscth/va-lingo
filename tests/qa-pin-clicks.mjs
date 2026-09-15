/**
 * QA: pin clicks on GitHub Pages preview
 * Target: https://chilinbpscth.github.io/va-lingo/
 * Login: 2A / 01
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'docs', 'QA-PIN-CLICKS.md');
const ARTIFACT_DIR = path.join(ROOT, 'work', 'qa-artifacts');
const BASE = 'https://chilinbpscth.github.io/va-lingo/';
const ONBOARDING_KEY = 'va-lingo-onboarding-kitten:v1:2A:01';
const CLICK_COORDS = [
  { label: 'upper-left', xRatio: 0.25, yRatio: 0.25 },
  { label: 'center', xRatio: 0.5, yRatio: 0.5 },
  { label: 'lower-right', xRatio: 0.75, yRatio: 0.72 },
];

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const results = [];
const notes = [];
let overallPass = true;

function record(name, pass, detail = '', error = null) {
  if (!pass) overallPass = false;
  results.push({
    name,
    status: pass ? 'PASS' : 'FAIL',
    detail,
    error: error ? String(error.stack || error.message || error) : '',
  });
}

async function shot(page, name) {
  const file = path.join(ARTIFACT_DIR, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    notes.push(`Screenshot: \`${path.relative(ROOT, file)}\``);
  } catch (e) {
    notes.push(`Screenshot failed (${name}): ${e.message}`);
  }
}

function writeReport(extra = {}) {
  const now = new Date();
  // Asia/Hong_Kong wall time for report header
  const hk = now.toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour12: false });
  const lines = [
    '# QA: Pin clicks on work image',
    '',
    `- **Target:** ${BASE}`,
    `- **Login:** 2A / 01`,
    `- **When (HKT):** ${hk}`,
    `- **Overall:** ${overallPass ? 'PASS' : 'FAIL'}`,
    '',
    '## Checks',
    '',
    '| Status | Check | Detail |',
    '|--------|-------|--------|',
  ];
  for (const r of results) {
    const detail = (r.detail || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(`| ${r.status} | ${r.name} | ${detail} |`);
  }
  lines.push('', '## Failures / errors', '');
  const fails = results.filter((r) => r.status === 'FAIL');
  if (!fails.length) {
    lines.push('_None._');
  } else {
    for (const f of fails) {
      lines.push(`### ${f.name}`);
      lines.push('');
      lines.push(f.detail || '_no detail_');
      if (f.error) {
        lines.push('');
        lines.push('```');
        lines.push(f.error);
        lines.push('```');
      }
      lines.push('');
    }
  }
  lines.push('## Notes', '');
  if (notes.length) {
    for (const n of notes) lines.push(`- ${n}`);
  } else {
    lines.push('- _(none)_');
  }
  if (extra.pageUrl) {
    lines.push(`- Final URL: ${extra.pageUrl}`);
  }
  lines.push('');
  lines.push('## Expected pin behaviour (from live `guided-app.js`)');
  lines.push('');
  lines.push('- On question screen, pins on the **current answer** show sequential **1, 2, 3…** in array/click order (not the step number).');
  lines.push('- Notebook/other screens still use per-question index numbering.');
  lines.push('- Clicking 「取消標記」 (`data-action="clear-pins"`) clears `answer().pins` and updates pin DOM (in-place when possible).');
  lines.push('- Onboarding gate accepts localStorage value **`done` only** (`=== \'done\'`); ISO timestamps do **not** skip the kitten gate.');
  lines.push('');
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'zh-HK',
  });

  // Phase A: set ISO timestamp as requested (expected to fail gate on live code)
  const isoStamp = new Date().toISOString();
  await context.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, value);
      } catch (_) {}
    },
    { key: ONBOARDING_KEY, value: isoStamp }
  );

  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#login-class, .login-box, select#login-class', { timeout: 20000 });
    record('page-load', true, `Loaded ${BASE}`);

    // Login 2A / 01
    await page.selectOption('#login-class', '2A');
    // student options populate on class change
    await page.waitForFunction(() => {
      const s = document.querySelector('#login-student');
      return s && [...s.options].some((o) => o.value === '01');
    });
    await page.selectOption('#login-student', '01');
    await page.click('form#login-form button[type="submit"]');

    // Wait for either onboarding gate or rounds/lesson
    await page.waitForTimeout(800);
    await page.waitForFunction(() => {
      const app = document.getElementById('app');
      if (!app) return false;
      const t = app.innerText || '';
      return (
        t.includes('拼貼小貓') ||
        t.includes('我的課堂') ||
        t.includes('進入課題') ||
        t.includes('今天，我們留意甚麼') ||
        t.includes('指一指')
      );
    }, { timeout: 20000 });

    const afterLoginText = await page.locator('#app').innerText();
    const onGate = afterLoginText.includes('拼貼小貓') && afterLoginText.includes('必做');
    const stored = await page.evaluate((key) => localStorage.getItem(key), ONBOARDING_KEY);

    if (onGate) {
      record(
        'onboarding-skip-via-ISO-timestamp',
        false,
        `ISO value did NOT skip gate. Key ${ONBOARDING_KEY}=${JSON.stringify(stored)}. Live app requires value === "done".`
      );
      notes.push(
        `As requested, initScript set \`${ONBOARDING_KEY}\` to ISO \`${isoStamp}\`; gate still shown (expected vs live code).`
      );
      await shot(page, '01-onboarding-gate-after-iso');

      // Phase B: set correct 'done' and re-check / continue
      await page.evaluate((key) => {
        localStorage.setItem(key, 'done');
      }, ONBOARDING_KEY);
      // Prefer "我已完成，再檢查一次" button
      const checkBtn = page.locator('button[data-action="check-onboarding"]');
      if (await checkBtn.count()) {
        await checkBtn.click();
      } else {
        await page.reload({ waitUntil: 'networkidle' });
        // re-login if needed
        if (await page.locator('#login-class').count()) {
          await page.selectOption('#login-class', '2A');
          await page.waitForFunction(() => {
            const s = document.querySelector('#login-student');
            return s && [...s.options].some((o) => o.value === '01');
          });
          await page.selectOption('#login-student', '01');
          await page.click('form#login-form button[type="submit"]');
        }
      }
      await page.waitForTimeout(600);
      const afterDone = await page.locator('#app').innerText();
      const stillGate = afterDone.includes('必做') && afterDone.includes('拼貼小貓') && afterDone.includes('未完成入門');
      record(
        'onboarding-skip-via-done',
        !stillGate,
        stillGate
          ? 'Still on gate after setting done'
          : 'Gate cleared after setting localStorage to "done"'
      );
    } else {
      record(
        'onboarding-skip-via-ISO-timestamp',
        true,
        `Unexpected: ISO timestamp skipped gate (stored=${JSON.stringify(stored)}). Live code historically requires "done".`
      );
    }

    // Ensure we are past gate: rounds or auto-entered lesson
    await page.waitForFunction(() => {
      const t = document.getElementById('app')?.innerText || '';
      return t.includes('進入課題') || t.includes('今天，我們留意甚麼') || t.includes('名作');
    }, { timeout: 20000 });

    // Enter round if needed
    const enterRound = page.locator('button[data-action="enter-round"]');
    if (await enterRound.count()) {
      await enterRound.first().click();
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => {
      const t = document.getElementById('app')?.innerText || '';
      return t.includes('今天，我們留意甚麼') || t.includes('名作欣賞') || t.includes('開始探索');
    }, { timeout: 20000 });
    record('enter-round', true, 'Reached lesson screen');
    await shot(page, '02-lesson');

    // Open reference (名作)
    const refBtn = page.locator('button[data-action="reference"]');
    await refBtn.first().click();
    await page.waitForSelector('#work-image', { timeout: 20000 });
    await page.waitForTimeout(400);

    // If landed on notebook (existing draft/remote), switch to question via 修改
    const appText = await page.locator('#app').innerText();
    if (!appText.includes('指一指・說一說') || !(await page.locator('img#work-image[data-markable="true"]').count())) {
      const editBtn = page.locator('button[data-action="edit"]').first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForTimeout(300);
      } else {
        // clear local draft keys for this identity and reopen reference
        await page.evaluate(() => {
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('art-time-capsule-v2:')) keys.push(k);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        });
        await page.locator('button[data-action="lesson"]').click().catch(() => {});
        await page.waitForTimeout(300);
        if (await page.locator('button[data-action="reference"]').count()) {
          await page.locator('button[data-action="reference"]').first().click();
        }
        await page.waitForSelector('#work-image', { timeout: 20000 });
      }
    }

    await page.waitForSelector('img#work-image[data-markable="true"]', { timeout: 15000 });
    record('open-reference-question', true, 'Reference question screen with markable work-image');

    // Clear any existing pins first
    const clearBtn = page.locator('button[data-action="clear-pins"]');
    if (await clearBtn.count()) {
      await clearBtn.click();
      await page.waitForTimeout(200);
    }

    // Pins on the current answer should be sequential 1,2,3… (array order), not the step number
    const stepLabel = await page.locator('.question-number').first().innerText().catch(() => '');
    notes.push(`Question step label: "${stepLabel.trim()}" → expect pin texts 1,2,3… in click order`);

    const img = page.locator('#work-image');
    const box = await img.boundingBox();
    if (!box) throw new Error('work-image has no bounding box');

    for (let i = 0; i < CLICK_COORDS.length; i++) {
      const c = CLICK_COORDS[i];
      const x = box.x + box.width * c.xRatio;
      const y = box.y + box.height * c.yRatio;
      await page.mouse.click(x, y);
      await page.waitForTimeout(350);
      const pins = page.locator('.image-wrap .pin');
      const count = await pins.count();
      const texts = [];
      for (let j = 0; j < count; j++) {
        texts.push((await pins.nth(j).textContent())?.trim() || '');
      }
      const expectedTexts = Array.from({ length: i + 1 }, (_, n) => String(n + 1));
      const countOk = count === i + 1;
      const textsOk = texts.join(',') === expectedTexts.join(',');
      record(
        `pin-click-${i + 1}-${c.label}`,
        countOk && textsOk,
        `Clicked (${c.xRatio},${c.yRatio}) → pinCount=${count} texts=[${texts.join(',')}] expected=[${expectedTexts.join(',')}]`
      );
    }
    await shot(page, '03-pins-after-clicks');

    // Assert pins show sequential indices 1,2,3…
    const finalPins = page.locator('.image-wrap .pin');
    const finalCount = await finalPins.count();
    const finalTexts = [];
    for (let j = 0; j < finalCount; j++) {
      finalTexts.push((await finalPins.nth(j).textContent())?.trim() || '');
    }
    const expectedSeq = Array.from({ length: CLICK_COORDS.length }, (_, n) => String(n + 1));
    record(
      'pin-textContent-is-sequential',
      finalCount === CLICK_COORDS.length && finalTexts.join(',') === expectedSeq.join(','),
      `pins=${finalCount} texts=[${finalTexts.join(',')}] expected=[${expectedSeq.join(',')}]`
    );

    // Clear pins via 取消標記
    await page.locator('button[data-action="clear-pins"]').click();
    await page.waitForTimeout(250);
    const afterClear = await page.locator('.image-wrap .pin').count();
    record(
      'clear-pins-取消標記',
      afterClear === 0,
      `After 取消標記, pin count=${afterClear} (expected 0)`
    );
    await shot(page, '04-after-clear');

  } catch (err) {
    record('script-crash', false, err.message || String(err), err);
    try {
      await shot(page, '99-error');
    } catch (_) {}
  } finally {
    writeReport({ pageUrl: page.url() });
    await browser.close();
  }

  console.log(`Report written: ${REPORT_PATH}`);
  console.log(`Overall: ${overallPass ? 'PASS' : 'FAIL'}`);
  for (const r of results) {
    console.log(`  [${r.status}] ${r.name} — ${r.detail}`);
  }
  process.exit(overallPass ? 0 : 1);
}

main().catch((e) => {
  overallPass = false;
  record('fatal', false, e.message || String(e), e);
  writeReport();
  console.error(e);
  process.exit(1);
});
