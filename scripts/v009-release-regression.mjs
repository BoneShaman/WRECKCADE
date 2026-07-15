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
  process.env.WRECKCADE_REGRESSION_SCREENSHOTS ??
    join(tmpdir(), 'wreckcade-v009-regression')
);

const sleep = (milliseconds) =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

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
    return await import(pathToFileURL(fallback).href);
  }
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
};

const day = '2026-07-15';
const blueprintOptions = [
  {
    id: 'magnet',
    name: 'Magnet Coil',
    description: 'The community begins with increased scrap pickup range.',
    votes: 14,
  },
  {
    id: 'armor',
    name: 'Wreckplate Armor',
    description: 'The community begins with +15 starting body.',
    votes: 9,
  },
  {
    id: 'nitro',
    name: 'Overdrive Injector',
    description: 'The community begins with +35 top speed.',
    votes: 11,
  },
];

const baseProfile = {
  isAuthenticated: true,
  username: 'regression-driver',
  crew: 'iron',
  bestScore: 48_000,
  bestCombo: 18,
  totalScrap: 980,
  careerWrecks: 420,
  streak: 3,
  longestStreak: 5,
  dailyBest: 21_000,
  dailyRuns: 0,
  dailyRank: 1,
  runs: 12,
  lastPlayedDate: day,
};

const baseCommunity = {
  scrap: 1_257,
  target: 3_000,
  tier: 0,
  wrecks: 92,
  contributors: 11,
  tierState: {
    level: 0,
    name: 'Loose Hubcaps',
    minimumScrap: 0,
    nextTarget: 3_000,
    progress: 1_257 / 3_000,
  },
  crewScores: { iron: 48_000, neon: 31_000, rust: 22_000 },
  votes: { magnet: 14, armor: 9, nitro: 11 },
};

const standings = [
  {
    rank: 1,
    id: 'iron',
    name: 'Iron Howlers',
    motto: 'Heavy metal. Zero mercy.',
    score: 48_000,
    isPlayerCrew: true,
  },
  {
    rank: 2,
    id: 'neon',
    name: 'Neon Jackals',
    motto: 'Fast, loud, first into the pile.',
    score: 31_000,
    isPlayerCrew: false,
  },
  {
    rank: 3,
    id: 'rust',
    name: 'Rust Reapers',
    motto: 'Every dent is a promise.',
    score: 22_000,
    isPlayerCrew: false,
  },
];

const leaderboard = [
  {
    rank: 1,
    username: 'regression-driver',
    crew: 'iron',
    score: 48_000,
    isCurrentUser: true,
  },
];

const makeVoteState = (selectedId = null) => ({
  date: day,
  options: blueprintOptions.map((option) => ({ ...option })),
  selectedId,
  totalVotes: 34 + (selectedId ? 1 : 0),
  canVote: true,
});

const makeInit = () => ({
  type: 'init',
  postId: 't3_v009_regression',
  serverTime: '2026-07-15T12:00:00.000Z',
  username: 'regression-driver',
  day,
  seed: 9_009,
  modifier: {
    id: 'thin-metal',
    name: 'Thin Metal Tuesday',
    description: 'Everyone hits harder. Momentum decides everything.',
  },
  communityUpgrade: 'magnet',
  challenge: {
    date: day,
    seed: 9_009,
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
  profile: { ...baseProfile },
  leaderboard: leaderboard.map((entry) => ({ ...entry })),
  crewStandings: standings.map((entry) => ({ ...entry })),
  community: {
    ...baseCommunity,
    tierState: { ...baseCommunity.tierState },
    crewScores: { ...baseCommunity.crewScores },
    votes: { ...baseCommunity.votes },
  },
  blueprintVote: makeVoteState(),
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
  const metrics = {
    initRequests: 0,
    runStarts: 0,
    runSubmissions: 0,
    voteRequests: 0,
  };
  let delayFirstGameBundle = true;

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (url.pathname === '/api/init') {
        metrics.initRequests += 1;
        sendJson(response, 200, makeInit());
        return;
      }

      if (url.pathname === '/api/run/start' && request.method === 'POST') {
        metrics.runStarts += 1;
        const body = await readRequestJson(request);
        await sleep(25);
        sendJson(response, 200, {
          type: 'run-session',
          runId: body.runId,
          sessionNonce: `nonce-${body.runId}`,
          startedAt: '2026-07-15T12:00:00.000Z',
          expiresAt: '2026-07-15T12:10:00.000Z',
        });
        return;
      }

      if (url.pathname === '/api/run' && request.method === 'POST') {
        metrics.runSubmissions += 1;
        const body = await readRequestJson(request);
        assert.match(String(body.sessionNonce), /^nonce-/);
        await sleep(220);
        const scrap = Math.max(1, Number(body.scrap) || 1);
        const score = Math.max(1, Number(body.score) || 1);
        const community = {
          ...baseCommunity,
          scrap: baseCommunity.scrap + scrap,
          tierState: {
            ...baseCommunity.tierState,
            progress: (baseCommunity.scrap + scrap) / baseCommunity.target,
          },
          crewScores: {
            ...baseCommunity.crewScores,
            iron: baseCommunity.crewScores.iron + score,
          },
          votes: { ...baseCommunity.votes },
        };
        const nextStandings = standings.map((entry) =>
          entry.id === 'iron'
            ? { ...entry, score: entry.score + score }
            : { ...entry }
        );
        sendJson(response, 200, {
          type: 'run-submitted',
          accepted: true,
          run: {
            score,
            scrap,
            kills: body.kills,
            bestCombo: body.bestCombo,
            level: body.level,
            survivedSeconds: body.survivedSeconds,
            crew: body.crew,
            victory: body.victory,
            isDailyBest: true,
            isPersonalBest: false,
          },
          profile: {
            ...baseProfile,
            dailyRuns: 1,
            runs: baseProfile.runs + 1,
            dailyBest: Math.max(baseProfile.dailyBest, score),
          },
          leaderboard: leaderboard.map((entry) => ({ ...entry })),
          crewStandings: nextStandings,
          community,
        });
        return;
      }

      if (url.pathname === '/api/vote' && request.method === 'POST') {
        metrics.voteRequests += 1;
        const body = await readRequestJson(request);
        await sleep(550);
        sendJson(response, 200, {
          type: 'blueprint-vote',
          accepted: true,
          vote: makeVoteState(body.blueprint),
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
      if (pathname === '/game.js' && delayFirstGameBundle) {
        delayFirstGameBundle = false;
        await sleep(650);
      }
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
    metrics,
    url: `http://127.0.0.1:${address.port}/game.html?qa=1`,
    close: () =>
      new Promise((resolveClose, rejectClose) =>
        server.close((error) => (error ? rejectClose(error) : resolveClose()))
      ),
  };
};

const installLoaderRecorder = async (context) => {
  await context.addInitScript(() => {
    window.__wreckcadeLoaderTransitions = [];
    let previous = '';
    const record = () => {
      const loader = document.querySelector('#boot-loader');
      if (!loader) return;
      const visible = !loader.classList.contains('is-hidden');
      const message =
        document.querySelector('#boot-message')?.textContent?.trim() ?? '';
      const signature = `${visible}|${message}`;
      if (signature === previous) return;
      previous = signature;
      window.__wreckcadeLoaderTransitions.push({
        visible,
        message,
        at: performance.now(),
      });
    };
    new MutationObserver(record).observe(document, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true,
    });
    document.addEventListener('DOMContentLoaded', record);
  });
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

const state = async (page) =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));

const waitForState = async (page, predicate, label, timeout = 8_000) => {
  const deadline = Date.now() + timeout;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      lastState = await state(page);
      if (predicate(lastState)) return lastState;
    } catch {
      // A scene transition briefly removes the state provider.
    }
    await page.waitForTimeout(25);
  }
  throw new Error(
    `${label} timed out. Last state: ${JSON.stringify(lastState)}`
  );
};

const loaderEntries = (page) =>
  page.evaluate(() => window.__wreckcadeLoaderTransitions ?? []);

const waitForLoaderHidden = async (page) => {
  await page.waitForFunction(() => {
    const loader = document.querySelector('#boot-loader');
    return loader && loader.classList.contains('is-hidden');
  });
};

const runTransition = async (page, trigger, predicate, label) => {
  await waitForLoaderHidden(page);
  const before = (await loaderEntries(page)).length;
  await trigger();
  const result = await waitForState(page, predicate, label);
  await waitForLoaderHidden(page);
  await page.waitForTimeout(50);
  const transition = (await loaderEntries(page)).slice(before);
  const shownIndex = transition.findIndex((entry) => entry.visible);
  const hiddenIndex = transition.findIndex(
    (entry, index) => index > shownIndex && !entry.visible
  );
  assert(
    shownIndex >= 0 && hiddenIndex > shownIndex,
    `${label} did not record a visible -> hidden branded-loader cycle: ${JSON.stringify(transition)}`
  );
  return result;
};

const finishRun = async (page) => {
  await page.evaluate(() => {
    if (!window.__ramageddonQA?.defeatBoss) {
      throw new Error('QA defeatBoss hook is unavailable');
    }
    window.__ramageddonQA.defeatBoss();
  });
  return waitForState(
    page,
    (current) => current.mode === 'ended',
    'result screen'
  );
};

const resultPoints = ({ width, height }) => {
  const portrait = width < 660;
  const shortNarrow = width < 360 && height < 650;
  const bottomY = height - (shortNarrow ? 62 : portrait ? 90 : 72);
  const buttonWidth = Math.min(310, width * 0.42);
  const voteHeadingY = portrait ? 158 : height * 0.37;
  const voteGap = shortNarrow ? 6 : portrait ? 8 : 14;
  const voteHeight = portrait
    ? shortNarrow
      ? 60
      : Math.min(86, (height - 300) / 3)
    : 118;
  const voteTop = portrait ? voteHeadingY + 28 : voteHeadingY + 34;
  const voteWidth = portrait
    ? width - 34
    : (Math.min(width - 80, 900) - voteGap * 2) / 3;
  const voteStartX = portrait ? 17 : (width - Math.min(width - 80, 900)) / 2;
  return {
    replay: {
      x: width / 2 - buttonWidth / 2 - 7,
      y: bottomY + 24,
    },
    garage: {
      x: width / 2 + buttonWidth / 2 + 7,
      y: bottomY + 24,
    },
    firstVote: {
      x: voteStartX + voteWidth / 2,
      y: voteTop + voteHeight / 2,
    },
  };
};

const assertClean = (errors, label) => {
  assert.deepEqual(
    errors,
    [],
    `${label} emitted browser errors:\n${errors.join('\n')}`
  );
};

const runDesktop = async (browser, url) => {
  const viewport = { width: 960, height: 720 };
  const context = await browser.newContext({ viewport });
  await installLoaderRecorder(context);
  const page = await context.newPage();
  const errors = trackErrors(page);

  const navigation = page.goto(url, { waitUntil: 'load' });
  const coldLoader = page.locator('#boot-loader:not(.is-hidden)');
  await coldLoader.waitFor({ state: 'visible', timeout: 3_000 });
  await page.screenshot({ path: join(SCREENSHOT_ROOT, '01-cold-loader.png') });
  await navigation;
  await waitForState(
    page,
    (current) => current.mode === 'menu' && current.metaReady === true,
    'cold meta-ready menu'
  );
  await waitForLoaderHidden(page);
  const coldEntries = await loaderEntries(page);
  assert(
    coldEntries.some((entry) => entry.visible),
    'cold loader was never visible'
  );
  assert(
    coldEntries.some((entry) => !entry.visible),
    'cold loader never hid'
  );

  const startPoint = { x: viewport.width / 2, y: viewport.height - 37 };
  await runTransition(
    page,
    () => page.mouse.click(startPoint.x, startPoint.y),
    (current) => current.mode === 'playing' && current.elapsedSeconds < 2,
    'desktop menu -> game'
  );

  const desktopStart = await state(page);
  assert.equal(
    desktopStart.player.maxHp,
    160,
    'Iron Howlers should begin with 140 base BODY plus the truthful +20 perk'
  );
  assert.equal(
    desktopStart.controls.desktopTelemetryVisible,
    true,
    'desktop keyboard telemetry should be visible during play'
  );
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  await page.waitForTimeout(220);
  const desktopDrift = await state(page);
  assert(
    desktopDrift.controls.desktopTelemetry.wheelSteer > 0.65,
    'desktop wheel should visibly follow right steering'
  );
  assert.equal(
    desktopDrift.controls.desktopTelemetry.driftGate,
    true,
    'desktop shifter should enter the drift gate while Space is held'
  );
  assert.equal(
    desktopDrift.controls.desktopTelemetry.shifterX,
    -1,
    'desktop shifter should snap fully left into the drift branch'
  );
  await page.screenshot({
    path: join(SCREENSHOT_ROOT, '05-desktop-cockpit-drift.png'),
  });
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(120);

  await finishRun(page);
  await waitForState(
    page,
    (current) => current.runSyncState === 'saved',
    'saved result before vote'
  );
  const points = resultPoints(viewport);
  await page.mouse.click(points.firstVote.x, points.firstVote.y);
  await waitForState(
    page,
    (current) => current.voteSyncState === 'pending',
    'pending blueprint vote'
  );
  await waitForState(
    page,
    (current) => current.voteSyncState === 'saved',
    'saved blueprint vote'
  );
  await page.waitForTimeout(750);
  await page.screenshot({ path: join(SCREENSHOT_ROOT, '02-vote-saved.png') });

  await runTransition(
    page,
    () => page.mouse.click(points.garage.x, points.garage.y),
    (current) => current.mode === 'menu' && current.metaReady === true,
    'vote/wait -> CREW GARAGE'
  );
  await page.screenshot({
    path: join(SCREENSHOT_ROOT, '03-returned-garage.png'),
  });

  await runTransition(
    page,
    () => page.mouse.click(startPoint.x, startPoint.y),
    (current) => current.mode === 'playing' && current.elapsedSeconds < 2,
    'desktop second menu -> game'
  );
  const firstReplayResult = await finishRun(page);
  assert.equal(firstReplayResult.runSyncState, 'pending');
  await runTransition(
    page,
    () => page.mouse.click(points.replay.x, points.replay.y),
    (current) => current.mode === 'playing' && current.elapsedSeconds < 2,
    'desktop immediate RUN IT BACK'
  );

  await finishRun(page);
  await waitForState(
    page,
    (current) => current.runSyncState === 'saved',
    'desktop saved result before repeated replay'
  );
  await page.waitForTimeout(650);
  await runTransition(
    page,
    () => page.mouse.click(points.replay.x, points.replay.y),
    (current) => current.mode === 'playing' && current.elapsedSeconds < 2,
    'desktop repeated RUN IT BACK'
  );

  assertClean(errors, 'desktop regression');
  await context.close();
};

const runTouch = async (browser, url) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({
    viewport,
    hasTouch: true,
    isMobile: true,
  });
  await installLoaderRecorder(context);
  const page = await context.newPage();
  const errors = trackErrors(page);
  await page.goto(url, { waitUntil: 'load' });
  await waitForState(
    page,
    (current) => current.mode === 'menu' && current.metaReady === true,
    'touch meta-ready menu'
  );
  await waitForLoaderHidden(page);

  const startPoint = { x: viewport.width / 2, y: viewport.height - 37 };
  const points = resultPoints(viewport);
  await runTransition(
    page,
    () => page.touchscreen.tap(startPoint.x, startPoint.y),
    (current) =>
      current.mode === 'playing' &&
      current.elapsedSeconds < 2 &&
      current.controls?.touchControlsVisible === true,
    'touch menu -> game'
  );

  const firstReplayResult = await finishRun(page);
  assert.equal(firstReplayResult.runSyncState, 'pending');
  await runTransition(
    page,
    () => page.touchscreen.tap(points.replay.x, points.replay.y),
    (current) => current.mode === 'playing' && current.elapsedSeconds < 2,
    'touch immediate RUN IT BACK'
  );

  await finishRun(page);
  await waitForState(
    page,
    (current) => current.runSyncState === 'saved',
    'touch saved result before repeated replay'
  );
  await page.waitForTimeout(650);
  await runTransition(
    page,
    () => page.touchscreen.tap(points.replay.x, points.replay.y),
    (current) => current.mode === 'playing' && current.elapsedSeconds < 2,
    'touch repeated RUN IT BACK'
  );
  await page.screenshot({
    path: join(SCREENSHOT_ROOT, '04-touch-replayed.png'),
  });

  assertClean(errors, 'touch regression');
  await context.close();
};

const main = async () => {
  assert(
    existsSync(resolve(DIST_ROOT, 'game.html')),
    'dist/client/game.html is missing; run `npm run build` first'
  );
  if (process.argv.includes('--serve-only')) {
    const fixture = await startFixtureServer();
    console.log(`v0.0.9 fixture server: ${fixture.url}`);
    await new Promise((resolveStop) => {
      process.once('SIGINT', resolveStop);
      process.once('SIGTERM', resolveStop);
    });
    await fixture.close();
    return;
  }
  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(SCREENSHOT_ROOT, { recursive: true })
  );
  const { chromium } = await loadPlaywright();
  const fixture = await startFixtureServer();
  const browser = await chromium.launch({
    headless: !process.argv.includes('--headed'),
  });
  try {
    await runDesktop(browser, fixture.url);
    await runTouch(browser, fixture.url);
    assert(
      fixture.metrics.initRequests >= 3,
      'expected repeated menu initialization'
    );
    assert(
      fixture.metrics.runStarts >= 6,
      'expected a fresh session for every run'
    );
    assert(
      fixture.metrics.runSubmissions >= 4,
      'expected run submission coverage'
    );
    assert.equal(
      fixture.metrics.voteRequests,
      1,
      'expected one blueprint vote'
    );
    console.log(
      `v0.0.9 release regression passed: ${JSON.stringify(fixture.metrics)}`
    );
    console.log(`screenshots: ${SCREENSHOT_ROOT}`);
  } finally {
    await browser.close();
    await fixture.close();
  }
};

await main();
