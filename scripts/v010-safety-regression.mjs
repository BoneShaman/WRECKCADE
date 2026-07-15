#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const DIST_ROOT = resolve(PROJECT_ROOT, 'dist/client');
const SCREENSHOT_ROOT = resolve(
  process.env.WRECKCADE_V010_SCREENSHOTS ??
    join(tmpdir(), 'wreckcade-v010-safety-regression')
);

const DAY = '2026-07-16';
const CREW_IDS = ['iron', 'neon', 'rust'];
const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const MOBILE_VIEWPORT = {
  width: positiveNumber(process.env.WRECKCADE_MOBILE_WIDTH, 390),
  height: positiveNumber(process.env.WRECKCADE_MOBILE_HEIGHT, 844),
};
const MOBILE_DEVICE_SCALE_FACTOR = positiveNumber(
  process.env.WRECKCADE_MOBILE_DPR,
  2.5
);

const loadPlaywright = async () => {
  try {
    return await import('playwright');
  } catch (localError) {
    const fallback = resolve(
      process.env.CODEX_HOME ?? join(homedir(), '.codex'),
      'skills/develop-web-game/node_modules/playwright/index.mjs'
    );
    if (!existsSync(fallback)) {
      throw new Error(
        `Playwright is unavailable. Install it locally or set CODEX_HOME. Local import: ${localError}`
      );
    }
    return import(pathToFileURL(fallback).href);
  }
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
};

const blueprintOptions = [
  {
    id: 'magnet',
    name: 'Magnet Coil',
    description: 'The community begins with increased scrap pickup range.',
    votes: 12,
  },
  {
    id: 'armor',
    name: 'Wreckplate Armor',
    description: 'The community begins with +15 starting body.',
    votes: 8,
  },
  {
    id: 'nitro',
    name: 'Overdrive Injector',
    description: 'The community begins with +35 top speed.',
    votes: 10,
  },
];

const crewDefinitions = [
  {
    rank: 1,
    id: 'iron',
    name: 'Iron Howlers',
    motto: 'Heavy metal. Zero mercy.',
    score: 42_000,
  },
  {
    rank: 2,
    id: 'neon',
    name: 'Neon Jackals',
    motto: 'Fast, loud, first into the pile.',
    score: 31_000,
  },
  {
    rank: 3,
    id: 'rust',
    name: 'Rust Reapers',
    motto: 'Every dent is a promise.',
    score: 20_000,
  },
];

const makeInit = ({ dailyRuns, crew }) => ({
  type: 'init',
  postId: 't3_v010_safety_regression',
  serverTime: '2026-07-16T01:00:00.000Z',
  username: 'mobile-regression-driver',
  day: DAY,
  seed: 10_010,
  modifier: {
    id: 'thin-metal',
    name: 'Thin Metal Tuesday',
    description: 'Everyone hits harder. Momentum decides everything.',
  },
  communityUpgrade: 'magnet',
  challenge: {
    date: DAY,
    seed: 10_010,
    arena: {
      id: 'furnace-eight',
      name: 'Furnace Eight',
      description: 'Crossing lanes feed a central killbox.',
    },
    modifier: {
      id: 'thin-metal',
      name: 'Thin Metal Tuesday',
      description: 'Everyone hits harder. Momentum decides everything.',
    },
    communityUpgrade: {
      id: 'magnet',
      name: 'Magnet Coil',
      description: 'The community begins with increased scrap pickup range.',
    },
  },
  profile: {
    isAuthenticated: true,
    username: 'mobile-regression-driver',
    crew,
    bestScore: 42_000,
    bestCombo: 17,
    totalScrap: 860,
    careerWrecks: 390,
    streak: 4,
    longestStreak: 6,
    dailyBest: dailyRuns > 0 ? 19_000 : 0,
    dailyRuns,
    dailyRank: dailyRuns > 0 ? 1 : null,
    runs: 11 + dailyRuns,
    lastPlayedDate: dailyRuns > 0 ? DAY : null,
  },
  leaderboard: [
    {
      rank: 1,
      username: 'mobile-regression-driver',
      crew,
      score: 42_000,
      isCurrentUser: true,
    },
  ],
  crewStandings: crewDefinitions.map((entry) => ({
    ...entry,
    isPlayerCrew: entry.id === crew,
  })),
  community: {
    scrap: 1_400,
    target: 3_000,
    tier: 0,
    wrecks: 100,
    contributors: 12,
    tierState: {
      level: 0,
      name: 'Loose Hubcaps',
      minimumScrap: 0,
      nextTarget: 3_000,
      progress: 1_400 / 3_000,
    },
    crewScores: { iron: 42_000, neon: 31_000, rust: 20_000 },
    votes: { magnet: 12, armor: 8, nitro: 10 },
  },
  blueprintVote: {
    date: DAY,
    options: blueprintOptions.map((option) => ({ ...option })),
    selectedId: null,
    totalVotes: 30,
    canVote: true,
  },
});

const readRequestJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length > 0
    ? JSON.parse(Buffer.concat(chunks).toString('utf8'))
    : {};
};

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
};

const startFixtureServer = async () => {
  const config = { dailyRuns: 0, crew: 'iron' };
  const metrics = {
    initRequests: 0,
    runStarts: 0,
    runSubmissions: 0,
    deleteRequests: 0,
  };

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (url.pathname === '/api/init') {
        metrics.initRequests += 1;
        sendJson(response, 200, makeInit(config));
        return;
      }

      if (url.pathname === '/api/profile' && request.method === 'DELETE') {
        metrics.deleteRequests += 1;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 80));
        config.dailyRuns = 0;
        config.crew = 'iron';
        sendJson(response, 200, { type: 'profile-deleted', deleted: true });
        return;
      }

      if (url.pathname === '/api/run/start' && request.method === 'POST') {
        metrics.runStarts += 1;
        const body = await readRequestJson(request);
        sendJson(response, 200, {
          type: 'run-session',
          runId: body.runId,
          sessionNonce: `nonce-${body.runId}`,
          startedAt: '2026-07-16T01:00:00.000Z',
          expiresAt: '2026-07-16T01:10:00.000Z',
        });
        return;
      }

      if (url.pathname === '/api/run' && request.method === 'POST') {
        metrics.runSubmissions += 1;
        const body = await readRequestJson(request);
        const init = makeInit(config);
        sendJson(response, 200, {
          type: 'run-submitted',
          accepted: true,
          run: {
            score: body.score,
            scrap: body.scrap,
            kills: body.kills,
            bestCombo: body.bestCombo,
            level: body.level,
            survivedSeconds: body.survivedSeconds,
            crew: body.crew,
            victory: body.victory,
            isDailyBest: true,
            isPersonalBest: true,
          },
          profile: {
            ...init.profile,
            crew: body.crew,
            dailyRuns: 1,
            dailyBest: body.score,
          },
          leaderboard: init.leaderboard,
          crewStandings: init.crewStandings,
          community: init.community,
        });
        return;
      }

      const pathname = url.pathname === '/' ? '/game.html' : url.pathname;
      const filePath = resolve(DIST_ROOT, `.${decodeURIComponent(pathname)}`);
      if (!filePath.startsWith(`${DIST_ROOT}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('Not a file');
      const body = await readFile(filePath);
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type':
          mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch (error) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(`Not found: ${error}`);
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  assert(address && typeof address === 'object');

  return {
    config,
    metrics,
    url: `http://127.0.0.1:${address.port}/game.html?qa=1`,
    close: () =>
      new Promise((resolveClose, rejectClose) =>
        server.close((error) => (error ? rejectClose(error) : resolveClose()))
      ),
  };
};

const trackErrors = (page) => {
  const errors = [];
  page.on('pageerror', (error) =>
    errors.push(`pageerror: ${error.stack ?? error}`)
  );
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
};

const state = (page) =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));

const waitForState = async (page, predicate, label, timeout = 8_000) => {
  const deadline = Date.now() + timeout;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      lastState = await state(page);
      if (predicate(lastState)) return lastState;
    } catch {
      // Scene transitions briefly remove the provider.
    }
    await page.waitForTimeout(25);
  }
  throw new Error(
    `${label} timed out. Last state: ${JSON.stringify(lastState)}`
  );
};

const waitForMetric = async (readMetric, expected, label, timeout = 4_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (readMetric() === expected) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
  }
  assert.equal(readMetric(), expected, label);
};

const waitForMenu = (page) =>
  waitForState(
    page,
    (current) => current.mode === 'menu' && current.metaReady === true,
    'meta-ready Crew Garage'
  );

const waitForLoaderHidden = async (page) => {
  await page.waitForFunction(
    () =>
      document
        .querySelector('#boot-loader')
        ?.classList.contains('is-hidden') === true,
    undefined,
    { timeout: 8_000 }
  );
  // The hidden class begins a 180 ms opacity transition; visual QA must wait
  // until the overlay is actually gone, not merely non-interactive.
  await page.waitForTimeout(220);
};

const normalizeRect = (value, label) => {
  assert(value && typeof value === 'object', `${label} rectangle is missing`);
  const x = Number(value.x ?? value.left);
  const y = Number(value.y ?? value.top);
  const width = Number(
    value.width ??
      (Number.isFinite(Number(value.right)) ? Number(value.right) - x : NaN)
  );
  const height = Number(
    value.height ??
      (Number.isFinite(Number(value.bottom)) ? Number(value.bottom) - y : NaN)
  );
  assert(
    [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0,
    `${label} rectangle is invalid: ${JSON.stringify(value)}`
  );
  return { x, y, width, height };
};

const center = (rect) => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

const contains = (rect, point) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

const crewCardRect = (menuState, crewId) => {
  assert(
    Array.isArray(menuState.crewCards),
    'menu render state must expose crewCards for input regression'
  );
  const card = menuState.crewCards.find((entry) => entry.id === crewId);
  assert(card, `menu state is missing the ${crewId} crew card`);
  return normalizeRect(card.rect ?? card, `${crewId} crew card`);
};

const privacyStateName = (menuState) =>
  menuState.privacyDelete?.state ?? menuState.privacyDeleteState ?? 'missing';

const privacyRect = (menuState, kind) => {
  const privacy = menuState.privacyDelete;
  assert(
    privacy && typeof privacy === 'object',
    'menu render state must expose privacyDelete'
  );
  const aliases = {
    data: [
      privacy.dataRect,
      privacy.triggerRect,
      privacy.rects?.data,
      privacy.rects?.trigger,
    ],
    cancel: [privacy.cancelRect, privacy.rects?.cancel],
    confirm: [privacy.confirmRect, privacy.rects?.confirm],
  };
  const value = aliases[kind].find(Boolean);
  return normalizeRect(value, `privacy ${kind}`);
};

const assertClean = (errors, label) => {
  assert.deepEqual(
    errors,
    [],
    `${label} emitted browser errors:\n${errors.join('\n')}`
  );
};

const newMobilePage = async (browser) => {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    screen: MOBILE_VIEWPORT,
    deviceScaleFactor: MOBILE_DEVICE_SCALE_FACTOR,
    hasTouch: true,
    isMobile: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();
  return { context, page };
};

const openPrivacyConfirmation = async (page) => {
  let current = await waitForMenu(page);
  if (privacyStateName(current) === 'confirming') {
    const cancel = center(privacyRect(current, 'cancel'));
    await page.touchscreen.tap(cancel.x, cancel.y);
    current = await waitForState(
      page,
      (next) => next.mode === 'menu' && privacyStateName(next) === 'idle',
      'privacy confirmation close before reopen'
    );
  }
  const data = center(privacyRect(current, 'data'));
  await page.touchscreen.tap(data.x, data.y);
  return waitForState(
    page,
    (next) => next.mode === 'menu' && privacyStateName(next) === 'confirming',
    'privacy confirmation open'
  );
};

const runFreshCrewAndPrivacy = async (browser, fixture) => {
  fixture.config.dailyRuns = 0;
  fixture.config.crew = 'iron';
  const { context, page } = await newMobilePage(browser);
  const errors = trackErrors(page);
  try {
    await page.goto(fixture.url, { waitUntil: 'load' });
    let current = await waitForMenu(page);
    await waitForLoaderHidden(page);
    const display = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const rect = canvas?.getBoundingClientRect();
      return {
        devicePixelRatio: window.devicePixelRatio,
        canvasWidth: canvas?.width ?? 0,
        canvasHeight: canvas?.height ?? 0,
        cssWidth: rect?.width ?? 0,
        cssHeight: rect?.height ?? 0,
      };
    });
    assert.equal(
      display.devicePixelRatio,
      MOBILE_DEVICE_SCALE_FACTOR,
      'mobile regression must run at a realistic high device pixel ratio'
    );
    assert(display.canvasWidth > 0 && display.canvasHeight > 0);
    assert(display.cssWidth > 0 && display.cssHeight > 0);
    assert.equal(
      current.crewLocked,
      false,
      'fresh daily crew must be unlocked'
    );
    await page.screenshot({
      path: join(SCREENSHOT_ROOT, '01-mobile-fresh-menu-dpr-2.5.png'),
    });

    for (const crewId of ['neon', 'rust', 'iron']) {
      const point = center(crewCardRect(current, crewId));
      await page.touchscreen.tap(point.x, point.y);
      current = await waitForState(
        page,
        (next) => next.mode === 'menu' && next.selectedCrew === crewId,
        `fresh mobile ${crewId} selection`
      );
      assert.equal(
        fixture.metrics.deleteRequests,
        0,
        `tapping ${crewId} must never call profile DELETE`
      );
    }

    const dataPoint = center(privacyRect(current, 'data'));
    for (let index = 0; index < 4; index += 1) {
      await page.touchscreen.tap(dataPoint.x, dataPoint.y);
    }
    await page.waitForTimeout(120);
    assert.equal(
      fixture.metrics.deleteRequests,
      0,
      'rapid repeated taps at the old delete-data location must not delete'
    );
    current = await state(page);
    assert.notEqual(privacyStateName(current), 'deleting');
    assert.notEqual(privacyStateName(current), 'success');

    current = await openPrivacyConfirmation(page);
    const confirmRect = privacyRect(current, 'confirm');
    const cancelRect = privacyRect(current, 'cancel');
    const dataRect = privacyRect(current, 'data');
    const outside = [
      { x: 6, y: 6 },
      { x: MOBILE_VIEWPORT.width - 6, y: 6 },
      { x: 6, y: MOBILE_VIEWPORT.height - 6 },
      {
        x: MOBILE_VIEWPORT.width - 6,
        y: MOBILE_VIEWPORT.height - 6,
      },
    ].find(
      (point) =>
        !contains(confirmRect, point) &&
        !contains(cancelRect, point) &&
        !contains(dataRect, point)
    );
    assert(outside, 'could not identify a safe outside-modal test point');
    await page.touchscreen.tap(outside.x, outside.y);
    await waitForState(
      page,
      (next) => next.mode === 'menu' && privacyStateName(next) === 'idle',
      'outside tap closes privacy confirmation'
    );
    assert.equal(
      fixture.metrics.deleteRequests,
      0,
      'outside-modal tap must not delete'
    );

    current = await openPrivacyConfirmation(page);
    const cancel = center(privacyRect(current, 'cancel'));
    await page.touchscreen.tap(cancel.x, cancel.y);
    await waitForState(
      page,
      (next) => next.mode === 'menu' && privacyStateName(next) === 'idle',
      'privacy Cancel closes confirmation'
    );
    assert.equal(
      fixture.metrics.deleteRequests,
      0,
      'privacy Cancel must not delete'
    );

    current = await openPrivacyConfirmation(page);
    await page.screenshot({
      path: join(SCREENSHOT_ROOT, '02-mobile-delete-confirmation.png'),
    });
    const confirm = center(privacyRect(current, 'confirm'));
    await page.waitForTimeout(180);
    await page.touchscreen.tap(confirm.x, confirm.y);
    await waitForMetric(
      () => fixture.metrics.deleteRequests,
      1,
      'deliberate confirmation should issue exactly one DELETE'
    );
    await waitForState(
      page,
      (next) =>
        next.mode === 'menu' &&
        ['success', 'idle'].includes(privacyStateName(next)),
      'privacy deletion completion'
    );
    await page.waitForTimeout(150);
    assert.equal(
      fixture.metrics.deleteRequests,
      1,
      'deliberate confirmation must issue exactly one DELETE'
    );
    assertClean(errors, 'fresh mobile crew/privacy regression');
  } finally {
    await context.close();
  }
};

const runLockedCrew = async (browser, fixture) => {
  fixture.config.dailyRuns = 1;
  fixture.config.crew = 'neon';
  const deletesBefore = fixture.metrics.deleteRequests;
  const { context, page } = await newMobilePage(browser);
  const errors = trackErrors(page);
  try {
    await page.goto(fixture.url, { waitUntil: 'load' });
    const current = await waitForMenu(page);
    await waitForLoaderHidden(page);
    assert.equal(current.crewLocked, true, 'daily crew must report locked');
    assert.equal(current.selectedCrew, 'neon');
    const rust = center(crewCardRect(current, 'rust'));
    await page.touchscreen.tap(rust.x, rust.y);
    const locked = await waitForState(
      page,
      (next) =>
        next.mode === 'menu' &&
        next.selectedCrew === 'neon' &&
        typeof next.crewFeedback === 'string' &&
        /lock|tomorrow/i.test(next.crewFeedback),
      'explicit locked-crew feedback'
    );
    assert.equal(locked.selectedCrew, 'neon');
    assert.match(locked.crewFeedback, /lock|tomorrow/i);
    assert.equal(
      fixture.metrics.deleteRequests,
      deletesBefore,
      'locked alternate-crew tap must never call DELETE'
    );
    await page.waitForTimeout(150);
    await page.screenshot({
      path: join(SCREENSHOT_ROOT, '03-mobile-crew-locked-feedback.png'),
    });
    assertClean(errors, 'locked mobile crew regression');
  } finally {
    await context.close();
  }
};

const startMobileRun = async (page, crewId) => {
  let current = await waitForMenu(page);
  const firstTap = center(crewCardRect(current, crewId));
  await page.touchscreen.tap(firstTap.x, firstTap.y);
  if (current.selectedCrew !== crewId) {
    current = await waitForState(
      page,
      (next) => next.mode === 'menu' && next.selectedCrew === crewId,
      `${crewId} selected before run`
    );
    const secondTap = center(crewCardRect(current, crewId));
    await page.touchscreen.tap(secondTap.x, secondTap.y);
  }
  const started = await waitForState(
    page,
    (next) => next.mode === 'playing' && next.crew === crewId,
    `${crewId} mobile run start`
  );
  await waitForLoaderHidden(page);
  return started;
};

const assertRepairLoadout = (gameState, label) => {
  assert.equal(
    gameState.repairs.persistent,
    5,
    `${label} should spawn the former three persistent cases plus two`
  );
  assert.equal(
    gameState.repairs.cases.filter((repair) => repair.persistent).length,
    5,
    `${label} render state should expose all five persistent cases`
  );
  assert(
    gameState.repairs.cases
      .filter((repair) => repair.persistent)
      .every((repair) => repair.value === 30),
    `${label} persistent cases must each restore exactly 30 BODY`
  );
};

const runHealthAndRepairs = async (browser, fixture) => {
  fixture.config.dailyRuns = 0;
  fixture.config.crew = 'iron';

  const neonSession = await newMobilePage(browser);
  const neonErrors = trackErrors(neonSession.page);
  try {
    await neonSession.page.goto(fixture.url, { waitUntil: 'load' });
    const start = await startMobileRun(neonSession.page, 'neon');
    assert.equal(
      start.player.maxHp,
      200,
      'non-Iron crews must begin with 200 base BODY'
    );
    assert.equal(start.player.hp, 200);
    assertRepairLoadout(start, 'Neon run');

    const cappedHeal = await neonSession.page.evaluate(() => {
      const qa = window.__ramageddonQA;
      if (!qa?.collectPersistentRepair) {
        throw new Error('QA collectPersistentRepair hook is unavailable');
      }
      qa.collectPersistentRepair(10);
      const before = JSON.parse(window.render_game_to_text());
      window.advanceTime(1000 / 60);
      const after = JSON.parse(window.render_game_to_text());
      return { before, after };
    });
    assert.equal(cappedHeal.before.player.hp, 190);
    assert.equal(
      cappedHeal.after.player.hp,
      200,
      'repair pickup must cap at max BODY'
    );
    assert.equal(
      cappedHeal.after.repairs.persistent,
      cappedHeal.before.repairs.persistent - 1,
      'capped repair case should still be consumed once'
    );

    const exactHeal = await neonSession.page.evaluate(() => {
      const qa = window.__ramageddonQA;
      if (!qa?.collectPersistentRepair) {
        throw new Error('QA collectPersistentRepair hook is unavailable');
      }
      qa.collectPersistentRepair(50);
      const before = JSON.parse(window.render_game_to_text());
      window.advanceTime(1000 / 60);
      const after = JSON.parse(window.render_game_to_text());
      return { before, after };
    });
    assert.equal(exactHeal.before.player.hp, 150);
    assert.equal(
      exactHeal.after.player.hp,
      180,
      'repair pickup must restore exactly 30 BODY when uncapped'
    );
    assert.equal(
      exactHeal.after.repairs.persistent,
      exactHeal.before.repairs.persistent - 1,
      'exact-heal case should be consumed once'
    );
    await neonSession.page.screenshot({
      path: join(SCREENSHOT_ROOT, '04-mobile-gameplay-dpr-2.5.png'),
    });

    await neonSession.page.evaluate(() => {
      if (!window.__ramageddonQA?.defeatBoss) {
        throw new Error('QA defeatBoss hook is unavailable');
      }
      window.__ramageddonQA.defeatBoss();
    });
    const result = await waitForState(
      neonSession.page,
      (current) =>
        current.mode === 'ended' &&
        current.player.score > 0 &&
        current.runSyncState === 'saved',
      'scored mobile victory result'
    );
    assert.equal(result.mode, 'ended');
    assert(result.player.score > 0, 'result capture must contain a real score');
    await neonSession.page.waitForTimeout(150);
    await neonSession.page.screenshot({
      path: join(
        SCREENSHOT_ROOT,
        '05-mobile-scored-victory-results-dpr-2.5.png'
      ),
    });
    assertClean(neonErrors, 'Neon health/repair regression');
  } finally {
    await neonSession.context.close();
  }

  fixture.config.dailyRuns = 0;
  fixture.config.crew = 'iron';
  const ironSession = await newMobilePage(browser);
  const ironErrors = trackErrors(ironSession.page);
  try {
    await ironSession.page.goto(fixture.url, { waitUntil: 'load' });
    const start = await startMobileRun(ironSession.page, 'iron');
    assert.equal(
      start.player.maxHp,
      220,
      'Iron Howlers must begin with 200 base BODY plus the +20 perk'
    );
    assert.equal(start.player.hp, 220);
    assertRepairLoadout(start, 'Iron run');
    assertClean(ironErrors, 'Iron health regression');
  } finally {
    await ironSession.context.close();
  }
};

const main = async () => {
  assert(
    existsSync(resolve(DIST_ROOT, 'game.html')),
    'dist/client/game.html is missing; run `npm run build` first'
  );
  const { mkdir } = await import('node:fs/promises');
  await mkdir(SCREENSHOT_ROOT, { recursive: true });
  const { chromium } = await loadPlaywright();
  const fixture = await startFixtureServer();
  const browser = await chromium.launch({
    headless: !process.argv.includes('--headed'),
  });
  try {
    await runFreshCrewAndPrivacy(browser, fixture);
    await runLockedCrew(browser, fixture);
    await runHealthAndRepairs(browser, fixture);
    assert.equal(
      fixture.metrics.deleteRequests,
      1,
      'full suite should perform one deliberate profile DELETE total'
    );
    assert(
      fixture.metrics.runStarts >= 2,
      'health suite should create both non-Iron and Iron sessions'
    );
    console.log(
      `v0.0.10 mobile safety regression passed: ${JSON.stringify(fixture.metrics)}`
    );
    console.log(`screenshots: ${SCREENSHOT_ROOT}`);
  } finally {
    await browser.close();
    await fixture.close();
  }
};

await main();
