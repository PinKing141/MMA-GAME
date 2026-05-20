'use strict';

const AUDIO = (typeof window !== 'undefined' && window.OctagonAudio) || null;

function audio(method, ...args) {
  if (!AUDIO) return;
  try { AUDIO[method]?.(...args); } catch { /* ignore */ }
}

function audioForStep(step) {
  if (!AUDIO) return;
  // Hits — pick a flavor from microText or move type.
  const micro = (step?.microText || '').toLowerCase();
  if (step?.corner === 'red' || step?.corner === 'blue') {
    if (micro.includes('kick') || micro.includes('roundhouse') || micro.includes('teep') || micro.includes('low')) {
      audio('hit', 'kick');
    } else if (micro.includes('body') || micro.includes('liver') || micro.includes('hook')) {
      audio('hit', 'body');
    } else if (step?.callout && /TAP|REVERSAL|SUB/.test(step.callout)) {
      audio('thud');
    } else {
      audio('hit', step.microText && step.microText.length > 3 ? 'cross' : 'jab');
    }
  }
  // Knockdown / heavy events.
  if (step?.callout === 'KO' || step?.callout === 'TKO' || /STOPPAGE/.test(step?.callout || '')) {
    audio('thud');
    audio('crowdRoar');
  }
  if (step?.callout && /TAP/.test(step.callout)) {
    audio('crowdRoar');
  }
  // Fouls → boos.
  if (step?.foul) {
    audio('crowdBoo');
  }
  // Round break bell.
  if (step?.phase === 'between_rounds') {
    audio('bell');
  }
  // Final bell.
  if (step?.phase === 'finished') {
    audio('bell');
    setTimeout(() => audio('bell'), 220);
  }
}

const VENUES = {
  local: {
    label: 'Local Fights',
    image: 'local.jpg'
  },
  regional: {
    label: 'Regional Showcase',
    image: 'regional.jpg'
  },
  stadium: {
    label: 'Stadium / Major',
    image: 'stadium.jpg'
  }
};

const DEFAULT_FIGHTER = {
  name: '—',
  nickname: '',
  flag: '',
  country: 'Unknown',
  age: 24,
  stance: 'Orthodox',
  weightClass: 'Welterweight',
  stats: {
    stk: 50,
    grp: 50,
    sub: 50,
    crd: 50
  }
};

const DEFAULT_SCORECARDS = {
  red: ['—', '—', '—'],
  blue: ['—', '—', '—']
};

const PLAYBACK_MS_PER_FIGHT_SECOND = 64;
const ROUND_DURATION = 300;

const state = {
  venue: 'local',
  allowedVenues: ['local', 'regional', 'stadium'],
  red: structuredClone(DEFAULT_FIGHTER),
  blue: structuredClone(DEFAULT_FIGHTER),
  fighterState: {
    red: createFighterState(44, 180, 48),
    blue: createFighterState(56, 0, 52)
  },
  round: 1,
  totalRounds: 3,
  phase: 'pregame',
  timeRemaining: 300,
  scorecards: structuredClone(DEFAULT_SCORECARDS),
  ticker: [],
  micro: {
    red: [],
    blue: []
  },
  timeline: [],
  timelineIndex: 0,
  outcome: null,
  titleEyebrow: 'Live Fight',
  speed: 1,
  playing: false,
  timer: null,
  calloutTimer: null,
  segment: null,
  breakUntil: 0,
  groundPosition: null,
  groundTop: null,
  momentum: 0,
  foul: null
};

function createFighterState(y, facing, x = facing === 180 ? 47 : 53) {
  return {
    hp: 100,
    hpMax: 100,
    stm: 100,
    stmMax: 100,
    damage: { head: 0, body: 0, legs: 0 },
    x,
    y,
    facing,
    action: 'Awaiting bell',
    down: false
  };
}

function clone(value) {
  return structuredClone(value);
}

function fmtTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = String(safe % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function parseClock(clock) {
  if (!clock || typeof clock !== 'string' || !clock.includes(':')) {
    return 300;
  }

  const [minutes, seconds] = clock.split(':').map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return 300;
  }

  return (minutes * 60) + seconds;
}

function interpolateNumber(start, end, progress) {
  return start + ((end - start) * progress);
}

function interpolateAngle(start, end, progress) {
  const delta = ((((end - start) % 360) + 540) % 360) - 180;
  return (start + (delta * progress) + 360) % 360;
}

function interpolateFighterState(startState, endState, progress) {
  return {
    ...endState,
    hp: interpolateNumber(startState.hp, endState.hp, progress),
    hpMax: endState.hpMax,
    stm: interpolateNumber(startState.stm, endState.stm, progress),
    stmMax: endState.stmMax,
    damage: {
      head: interpolateNumber(startState.damage.head, endState.damage.head, progress),
      body: interpolateNumber(startState.damage.body, endState.damage.body, progress),
      legs: interpolateNumber(startState.damage.legs, endState.damage.legs, progress)
    },
    x: interpolateNumber(startState.x, endState.x, progress),
    y: interpolateNumber(startState.y, endState.y, progress),
    facing: interpolateAngle(startState.facing, endState.facing, progress),
    action: progress < 0.55 ? startState.action : endState.action,
    down: progress < 0.82 ? startState.down : endState.down
  };
}

function fighterSvg(color, glow) {
  return `
    <svg width="50.4" height="50.4" viewBox="-24 -24 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="0" cy="0" r="18" fill="${color}" fill-opacity="0.18" />
      <circle cx="0" cy="0" r="14" fill="${color}" fill-opacity="0.32" />
      <path d="M -10 4 A 11 8 0 0 0 10 4" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.85" />
      <circle cx="0" cy="-2" r="6" fill="#1c1c24" stroke="${color}" stroke-width="2.2" />
      <path d="M 0 -10 L -3 -7 L 3 -7 Z" fill="${glow}" />
    </svg>
  `;
}

function portraitSvg(color, glow) {
  return `
    <svg width="80" height="80" viewBox="-30 -30 60 60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="0" cy="0" r="26" fill="${color}" fill-opacity="0.12" />
      <circle cx="0" cy="0" r="20" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2 3" opacity="0.5" />
      <path d="M -14 6 A 15 11 0 0 0 14 6" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="0" cy="-3" r="9" fill="#1c1c24" stroke="${color}" stroke-width="2.8" />
      <path d="M 0 -16 L -4.5 -11 L 4.5 -11 Z" fill="${glow}" />
    </svg>
  `;
}

function hpColor(percent) {
  if (percent > 60) {
    return 'var(--hp-high)';
  }

  if (percent > 30) {
    return 'var(--hp-mid)';
  }

  return 'var(--hp-low)';
}

function hideOutcome() {
  document.getElementById('outcome-banner').classList.remove('show');
}

function renderVenue() {
  const venue = VENUES[state.venue] || VENUES.local;
  document.getElementById('cage-canvas').style.backgroundImage = `url('${venue.image}')`;
  document.querySelectorAll('[data-venue]').forEach(button => {
    button.disabled = true;
    button.classList.toggle('active', button.dataset.venue === state.venue);
  });
}

function renderFighterMeta(corner) {
  const fighter = state[corner];
  const color = corner === 'red' ? '#e21d36' : '#2563eb';
  const glow = corner === 'red' ? '#ff5d72' : '#5a8aff';

  document.getElementById(`${corner}-name`).textContent = fighter.name || '—';
  document.getElementById(`${corner}-nick`).textContent = fighter.nickname ? `"${fighter.nickname}"` : '';
  document.getElementById(`${corner}-flag`).innerHTML = `
    ${fighter.flag || ''} ${fighter.country || 'Unknown'}
    <span class="sep">·</span> ${fighter.age || '—'} y/o
    <span class="sep">·</span> ${fighter.stance || 'Orthodox'}
    <span class="sep">·</span> ${fighter.weightClass || '—'}
  `;

  document.getElementById(`${corner}-s-stk`).textContent = fighter.stats?.stk ?? '—';
  document.getElementById(`${corner}-s-grp`).textContent = fighter.stats?.grp ?? '—';
  document.getElementById(`${corner}-s-sub`).textContent = fighter.stats?.sub ?? '—';
  document.getElementById(`${corner}-s-crd`).textContent = fighter.stats?.crd ?? '—';
  document.getElementById(`portrait-${corner}`).innerHTML = portraitSvg(color, glow);
  document.getElementById(corner === 'red' ? 'bc-red-name' : 'bc-blue-name').textContent = fighter.name || '—';
  document.getElementById(corner === 'red' ? 'ind-red' : 'ind-blue').textContent = (fighter.name || 'Corner').split(' ').slice(-1)[0];
}

function renderFighterState(corner) {
  const fighterState = state.fighterState[corner];
  const hpPercent = Math.max(0, (fighterState.hp / fighterState.hpMax) * 100);
  const stmPercent = Math.max(0, (fighterState.stm / fighterState.stmMax) * 100);
  const hpBar = document.getElementById(`${corner}-hp`);
  const stmBar = document.getElementById(`${corner}-stm`);

  hpBar.style.width = `${hpPercent}%`;
  hpBar.style.background = hpColor(hpPercent);
  document.getElementById(`${corner}-hp-val`).textContent = Math.round(fighterState.hp);
  stmBar.style.width = `${stmPercent}%`;
  document.getElementById(`${corner}-stm-val`).textContent = Math.round(fighterState.stm);
  document.getElementById(`${corner}-action`).textContent = fighterState.action || 'Awaiting bell';

  ['head', 'body', 'legs'].forEach(zone => {
    const cell = document.getElementById(`${corner}-dmg-${zone}`);
    const value = fighterState.damage?.[zone] || 0;
    cell.querySelector('.value').textContent = `${Math.round(value)}%`;
    cell.classList.toggle('warn', value >= 35 && value < 65);
    cell.classList.toggle('bad', value >= 65);
  });
}

const GROUND_POSITION_LABELS = {
  NEUTRAL_GUARD: 'Open Guard',
  HALF_GUARD: 'Half Guard',
  SIDE_CONTROL: 'Side Control',
  NORTH_SOUTH: 'North-South',
  MOUNT: 'Full Mount',
  BACK_CONTROL: 'Back Mount',
  CLINCH_OVER_UNDER: 'Over-Under Clinch',
  CLINCH_BODYLOCK: 'Bodylock'
};

function renderFighterPositions() {
  const canvas = document.getElementById('cage-canvas');

  // Range is on the fighter state (sim writes the same range to both
  // fighters per step). Drives a visual mode class on each element.
  const currentRange = state.fighterState.red?.range
    || state.fighterState.blue?.range
    || 'Mid';

  ['red', 'blue'].forEach(corner => {
    const fighterState = state.fighterState[corner];
    let element = document.getElementById(`fighter-${corner}`);

    if (!element) {
      element = document.createElement('div');
      element.id = `fighter-${corner}`;
      element.className = 'cage-fighter';
      element.innerHTML = fighterSvg(corner === 'red' ? '#e21d36' : '#2563eb', corner === 'red' ? '#ff5d72' : '#5a8aff');
      canvas.appendChild(element);
    }

    element.style.left = `${fighterState.x}%`;
    element.style.top = `${fighterState.y}%`;

    // Clinch and Ground modes shrink + tilt so the pair reads as
    // tied up / on the mat. Down still overrides for KO posture.
    const rangeScale = fighterState.down ? 0.82
      : currentRange === 'Ground' ? 0.72
      : currentRange === 'Clinch' ? 0.88
      : 1;
    const rangeTilt = currentRange === 'Ground' ? 80
      : currentRange === 'Clinch' ? (corner === 'red' ? -12 : 12)
      : 0;
    element.style.transform = `rotate(${fighterState.facing + rangeTilt}deg) scale(${rangeScale})`;

    element.classList.toggle('down', !!fighterState.down);
    element.classList.toggle('retreating', !!fighterState.retreating);
    element.classList.toggle('range-long', currentRange === 'Long');
    element.classList.toggle('range-mid', currentRange === 'Mid');
    element.classList.toggle('range-close', currentRange === 'Close');
    element.classList.toggle('range-clinch', currentRange === 'Clinch');
    element.classList.toggle('range-ground', currentRange === 'Ground');
    element.classList.toggle('top', state.groundTop === corner);
  });

  renderGroundOverlay();
  renderMomentumMeter();
}

function renderGroundOverlay() {
  let overlay = document.getElementById('ground-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ground-overlay';
    overlay.className = 'ground-overlay';
    document.getElementById('cage-canvas').appendChild(overlay);
  }
  if (!state.groundPosition) {
    overlay.classList.remove('show');
    return;
  }
  const label = GROUND_POSITION_LABELS[state.groundPosition] || 'Ground';
  const topName = state.groundTop === 'red'
    ? (state.red?.name || 'Red').split(' ').slice(-1)[0]
    : (state.blue?.name || 'Blue').split(' ').slice(-1)[0];
  const toneCorner = state.groundTop === 'red' ? 'red' : 'blue';
  overlay.className = `ground-overlay show tone-${toneCorner}`;
  overlay.innerHTML = `
    <div class="ground-overlay-eyebrow">Position</div>
    <div class="ground-overlay-label">${label}</div>
    <div class="ground-overlay-top">${topName} on top</div>
  `;
}

function renderMomentumMeter() {
  let meter = document.getElementById('momentum-meter');
  if (!meter) {
    meter = document.createElement('div');
    meter.id = 'momentum-meter';
    meter.className = 'momentum-meter';
    meter.innerHTML = `
      <div class="momentum-track">
        <div class="momentum-fill" id="momentum-fill"></div>
      </div>
      <div class="momentum-label">Momentum</div>
    `;
    document.getElementById('cage-canvas').appendChild(meter);
  }
  const value = state.momentum || 0;
  const fill = document.getElementById('momentum-fill');
  const pct = Math.abs(value) * 50; // 0..50% of half-width
  fill.style.width = `${pct}%`;
  if (value >= 0) {
    fill.style.left = '50%';
    fill.style.background = 'var(--red-bright)';
  } else {
    fill.style.left = `${50 - pct}%`;
    fill.style.background = 'var(--blue-bright)';
  }
}

function renderPlaybackFrame() {
  renderFighterState('red');
  renderFighterState('blue');
  renderFighterPositions();
  renderRoundInfo();
}

function renderRoundInfo() {
  document.getElementById('bc-eyebrow').textContent = state.titleEyebrow;
  document.getElementById('round-label').textContent = state.phase === 'finished'
    ? 'Final'
    : state.phase === 'between_rounds'
      ? 'Corner Break'
      : state.phase === 'pregame'
        ? 'Live Fight'
        : 'Round';
  document.getElementById('round-num').textContent = state.phase === 'finished' && state.outcome
    ? state.outcome.method
    : `R${state.round}`;
  document.getElementById('round-timer').textContent = fmtTime(state.timeRemaining);
}

function renderScorecards() {
  ['red', 'blue'].forEach(corner => {
    state.scorecards[corner].forEach((score, index) => {
      document.getElementById(`${corner}-score-${index + 1}`).textContent = score ?? '—';
    });
  });
}

function renderTicker() {
  const list = document.getElementById('ticker-list');
  list.innerHTML = state.ticker.slice(-4).map(item => `
    <div class="ticker-item ${item.tone || 'gold'}">
      <span class="ticker-time">${item.time || '--:--'}</span>
      <span class="ticker-dot"></span>
      <span class="ticker-text">${item.text}</span>
    </div>
  `).join('');
}

function renderMicroFeeds() {
  ['red', 'blue'].forEach(corner => {
    const list = document.getElementById(`${corner}-micro-feed`);
    list.innerHTML = state.micro[corner].slice(-3).map(item => `
      <div class="micro-feed-item ${item.tone || ''}">${item.text}</div>
    `).join('');
  });
}

function renderTransport() {
  document.getElementById('btn-play-replay').classList.toggle('active', state.playing);
  document.getElementById('btn-pause-replay').classList.toggle('active', !state.playing);
  document.querySelectorAll('[data-speed]').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.speed) === state.speed);
  });
}

function renderAll() {
  renderVenue();
  renderFighterMeta('red');
  renderFighterMeta('blue');
  renderFighterState('red');
  renderFighterState('blue');
  renderFighterPositions();
  renderRoundInfo();
  renderScorecards();
  renderTicker();
  renderMicroFeeds();
  renderTransport();
  renderTimerRing();
  renderLowerThird();
  renderTaleOfTape();
}

const ROUND_LENGTH_SECONDS = 300;

function renderTimerRing() {
  const ring = document.getElementById('timer-ring');
  if (!ring) return;
  const timeText = fmtTime(state.timeRemaining);
  document.getElementById('timer-ring-time').textContent = timeText;
  document.getElementById('timer-ring-round').textContent =
    state.phase === 'finished' ? 'END'
    : state.phase === 'pregame' ? 'PRE'
    : state.phase === 'between_rounds' ? `R${state.round}` : `R${state.round}`;
  const fg = document.getElementById('timer-ring-fg');
  if (!fg) return;
  const circumference = 2 * Math.PI * 46;
  const pct = Math.max(0, Math.min(1, state.timeRemaining / ROUND_LENGTH_SECONDS));
  fg.setAttribute('stroke-dasharray', `${circumference}`);
  fg.setAttribute('stroke-dashoffset', `${circumference * (1 - pct)}`);
  ring.classList.toggle('warning', state.timeRemaining <= 60 && state.phase === 'fighting');
  ring.classList.toggle('hidden', state.phase === 'pregame');
}

function renderLowerThird() {
  const lt = document.getElementById('lower-third');
  if (!lt) return;
  // Show the last attacker's name + current ground/range tag.
  const recentAction = state.ticker[state.ticker.length - 1];
  if (!recentAction || state.phase === 'pregame' || state.phase === 'finished') {
    lt.classList.remove('show');
    return;
  }
  const corner = recentAction.tone === 'red' || recentAction.tone === 'blue'
    ? recentAction.tone
    : null;
  if (!corner) {
    lt.classList.remove('show');
    return;
  }
  const fighter = state[corner];
  document.getElementById('lt-corner').textContent = corner.toUpperCase();
  document.getElementById('lt-name').textContent = fighter.name || corner;
  const groundLabel = state.groundPosition ? GROUND_POSITION_LABELS[state.groundPosition] : null;
  const stat = groundLabel
    ? `${groundLabel} · ${fighter.stats?.grp ?? '—'} GRP`
    : `${fighter.stats?.stk ?? '—'} STK · ${fighter.stats?.grp ?? '—'} GRP`;
  document.getElementById('lt-stat').textContent = stat;
  lt.classList.remove('show');
  void lt.offsetWidth;
  lt.classList.add('show', `corner-${corner}`);
  // Auto-hide.
  clearTimeout(lt._timer);
  lt._timer = setTimeout(() => lt.classList.remove('show'), 2200);
}

function renderTaleOfTape() {
  const splash = document.getElementById('tale-of-tape');
  if (!splash) return;
  const shouldShow = state.phase === 'pregame' && state.red?.name && state.red.name !== '—';
  splash.classList.toggle('show', shouldShow);

  ['red', 'blue'].forEach(corner => {
    const fighter = state[corner];
    const color = corner === 'red' ? '#e21d36' : '#2563eb';
    const glow = corner === 'red' ? '#ff5d72' : '#5a8aff';
    document.getElementById(`tot-portrait-${corner}`).innerHTML = portraitSvg(color, glow);
    document.getElementById(`tot-name-${corner}`).textContent = fighter.name || '—';
    document.getElementById(`tot-nick-${corner}`).textContent = fighter.nickname ? `"${fighter.nickname}"` : '';
    document.getElementById(`tot-meta-${corner}`).innerHTML = `
      <span>${fighter.country || ''}</span>
      <span>·</span>
      <span>${fighter.age || '—'} y/o</span>
      <span>·</span>
      <span>${fighter.stance || 'Orthodox'}</span>
    `;
    // Record pull from scorecards isn't quite right — show a placeholder.
    const placeholderRecord = fighter.record || '—';
    document.getElementById(`tot-record-${corner}`).textContent = typeof placeholderRecord === 'string'
      ? placeholderRecord
      : `${placeholderRecord.wins || 0}-${placeholderRecord.losses || 0}-${placeholderRecord.draws || 0}`;
  });
  document.getElementById('tot-event').textContent = state.titleEyebrow || 'LIVE FIGHT';
}

function updateScorecardOverlay(round) {
  // The between-round overlay surfaces running judge scores.
  const redScores = (state.scorecards.red || []).slice(0, round);
  const blueScores = (state.scorecards.blue || []).slice(0, round);
  const formatCard = (scores) => scores
    .map((s, i) => `<span class="rsc-card"><label>R${i + 1}</label><strong>${s ?? '—'}</strong></span>`)
    .join('');
  document.getElementById('rsc-red-name').textContent = state.red.name || 'Red';
  document.getElementById('rsc-blue-name').textContent = state.blue.name || 'Blue';
  document.getElementById('rsc-red-cards').innerHTML = formatCard(redScores);
  document.getElementById('rsc-blue-cards').innerHTML = formatCard(blueScores);
}

function flashHit(corner) {
  const element = document.getElementById(`fighter-${corner}`);
  if (!element) {
    return;
  }

  element.classList.remove('hit');
  void element.offsetWidth;
  element.classList.add('hit');
  window.setTimeout(() => element.classList.remove('hit'), 360);
}

function showCallout(text, tone = 'gold') {
  const overlay = document.getElementById('action-callout');
  const label = overlay.querySelector('.overlay-kicker');
  const body = overlay.querySelector('.overlay-text');
  const resolvedKicker = tone === 'danger' ? 'Fight-changing moment' : tone === 'red' ? 'Red corner surge' : tone === 'blue' ? 'Blue corner surge' : 'Live fight beat';

  label.textContent = resolvedKicker;
  body.textContent = text;
  overlay.classList.add('show');
  window.clearTimeout(state.calloutTimer);
  state.calloutTimer = window.setTimeout(() => {
    overlay.classList.remove('show');
  }, 950);
}

function appendReplayEvent(item) {
  state.ticker.push({
    tone: item.tone || 'gold',
    time: item.time || '--:--',
    text: item.tickerText || item.text || 'Replay event'
  });

  if (item.corner === 'red' || item.corner === 'blue') {
    state.micro[item.corner].push({
      tone: item.tone || item.corner,
      text: item.microText || item.tickerText || item.text || 'Exchange'
    });
  }

  if (item.callout) {
    showCallout(item.callout, item.tone || 'gold');
  }
}

function clearReplayUi() {
  state.ticker = [];
  state.micro.red = [];
  state.micro.blue = [];
  state.segment = null;
  state.breakUntil = 0;
  state.groundPosition = null;
  state.groundTop = null;
  state.momentum = 0;
  state.foul = null;
  document.getElementById('action-callout').classList.remove('show');
  document.getElementById('round-end-overlay').classList.remove('show');
  const overlay = document.getElementById('ground-overlay');
  if (overlay) overlay.classList.remove('show');
  hideOutcome();
}

function showRoundBreak(round) {
  const overlay = document.getElementById('round-end-overlay');
  document.getElementById('rend-title').textContent = `ROUND ${round}`;
  document.getElementById('rend-sub').textContent = 'Judges turn in their cards for the round.';
  updateScorecardOverlay(round);
  overlay.classList.add('show');
  // Longer hold so the audience can read scorecards.
  window.setTimeout(() => overlay.classList.remove('show'), Math.max(1600, 2400 / state.speed));
}

function showOutcome() {
  if (!state.outcome) {
    return;
  }

  document.getElementById('outcome-eyebrow').textContent = state.outcome.winnerCorner === 'draw' ? 'Result' : 'And the winner is';
  document.getElementById('outcome-winner').textContent = state.outcome.winnerName;
  document.getElementById('outcome-method').textContent = `By ${state.outcome.method} · ${state.outcome.detail}`;
  document.getElementById('outcome-timing').textContent = `Round ${state.outcome.round} · ${state.outcome.time}`;
  document.getElementById('outcome-banner').classList.add('show');
}

function setFighters(red, blue) {
  state.red = {
    ...structuredClone(DEFAULT_FIGHTER),
    ...red,
    stats: {
      ...structuredClone(DEFAULT_FIGHTER.stats),
      ...(red?.stats || {})
    }
  };
  state.blue = {
    ...structuredClone(DEFAULT_FIGHTER),
    ...blue,
    stats: {
      ...structuredClone(DEFAULT_FIGHTER.stats),
      ...(blue?.stats || {})
    }
  };
  renderAll();
}

function updateFighter(corner, fighterState) {
  state.fighterState[corner] = {
    ...state.fighterState[corner],
    ...fighterState,
    damage: {
      ...state.fighterState[corner].damage,
      ...(fighterState?.damage || {})
    }
  };
  renderAll();
}

function setRound({ round, totalRounds, timeRemaining, phase }) {
  state.round = round ?? state.round;
  state.totalRounds = totalRounds ?? state.totalRounds;
  state.timeRemaining = timeRemaining ?? state.timeRemaining;
  state.phase = phase ?? state.phase;
  renderAll();
}

function logEvent(item) {
  appendReplayEvent({
    tone: item?.tone || item?.corner || 'gold',
    corner: item?.corner,
    time: item?.time,
    tickerText: item?.text || item?.tickerText,
    microText: item?.microText,
    callout: item?.callout
  });
  renderTicker();
  renderMicroFeeds();
}

function finish(winnerCorner, method, detail) {
  state.phase = 'finished';
  state.outcome = {
    winnerCorner,
    winnerName: winnerCorner === 'draw'
      ? 'Draw'
      : winnerCorner === 'red'
        ? (state.red.name || 'Red Corner').toUpperCase()
        : (state.blue.name || 'Blue Corner').toUpperCase(),
    method,
    detail,
    round: state.round,
    time: fmtTime(state.timeRemaining)
  };
  renderRoundInfo();
  showOutcome();
}

function applyStep(step) {
  audioForStep(step);
  if (step.redState) {
    state.fighterState.red = clone(step.redState);
  }

  if (step.blueState) {
    state.fighterState.blue = clone(step.blueState);
  }

  state.round = step.round ?? state.round;
  state.phase = step.phase ?? 'fighting';
  state.timeRemaining = parseClock(step.time);
  state.groundPosition = step.groundPosition ?? null;
  state.groundTop = step.groundTop ?? null;
  state.momentum = step.momentum ?? state.momentum ?? 0;
  state.foul = step.foul ?? null;
  appendReplayEvent(step);

  if (step.corner === 'red' || step.corner === 'blue') {
    flashHit(step.corner === 'red' ? 'blue' : 'red');
  }

  if (step.phase === 'between_rounds') {
    showRoundBreak(step.round);
  }

  if (step.foul) {
    flashFoul();
  }

  renderAll();
}

function flashFoul() {
  const canvas = document.getElementById('cage-canvas');
  canvas.classList.remove('foul-flash');
  void canvas.offsetWidth;
  canvas.classList.add('foul-flash');
  window.setTimeout(() => canvas.classList.remove('foul-flash'), 700);
}

function clearTimer() {
  if (state.timer) {
    window.cancelAnimationFrame(state.timer);
    state.timer = null;
  }
}

function pause() {
  state.playing = false;
  clearTimer();
  renderTransport();
}

function finishPlayback() {
  pause();
  state.phase = 'finished';
  renderRoundInfo();
  showOutcome();
}

function buildSegment(step, now) {
  let startRound = state.round;
  let startTimeRemaining = state.timeRemaining;

  if (state.phase === 'between_rounds' && step.round > state.round) {
    startRound = step.round;
    startTimeRemaining = ROUND_DURATION;
    state.round = step.round;
    state.phase = 'fighting';
    state.timeRemaining = ROUND_DURATION;
    renderRoundInfo();
  }

  const targetTimeRemaining = parseClock(step.time);
  const totalFightSeconds = Math.max(1, startTimeRemaining - targetTimeRemaining);

  return {
    step,
    startRound,
    startTimeRemaining,
    targetTimeRemaining,
    totalFightSeconds,
    elapsedFightSeconds: 0,
    lastFrameAt: now,
    startRed: clone(state.fighterState.red),
    startBlue: clone(state.fighterState.blue),
    endRed: clone(step.redState || state.fighterState.red),
    endBlue: clone(step.blueState || state.fighterState.blue)
  };
}

function stepPlaybackFrame(now) {
  if (!state.playing) {
    return;
  }

  if (state.breakUntil && now < state.breakUntil) {
    state.timer = window.requestAnimationFrame(stepPlaybackFrame);
    return;
  }

  if (!state.segment) {
    if (state.timelineIndex >= state.timeline.length) {
      finishPlayback();
      return;
    }

    state.segment = buildSegment(state.timeline[state.timelineIndex], now);
  }

  const segment = state.segment;
  const deltaMs = Math.max(0, now - segment.lastFrameAt);
  segment.lastFrameAt = now;
  segment.elapsedFightSeconds = Math.min(
    segment.totalFightSeconds,
    segment.elapsedFightSeconds + ((deltaMs * state.speed) / PLAYBACK_MS_PER_FIGHT_SECOND)
  );

  const progress = Math.min(1, segment.elapsedFightSeconds / segment.totalFightSeconds);

  state.round = segment.startRound;
  state.phase = 'fighting';
  state.timeRemaining = interpolateNumber(segment.startTimeRemaining, segment.targetTimeRemaining, progress);
  state.fighterState.red = interpolateFighterState(segment.startRed, segment.endRed, progress);
  state.fighterState.blue = interpolateFighterState(segment.startBlue, segment.endBlue, progress);
  renderPlaybackFrame();

  if (progress >= 1) {
    applyStep(segment.step);
    state.timelineIndex += 1;
    state.segment = null;
    state.breakUntil = segment.step.phase === 'between_rounds'
      ? now + Math.max(450, 850 / state.speed)
      : 0;

    if (segment.step.phase === 'finished') {
      finishPlayback();
      return;
    }
  }

  state.timer = window.requestAnimationFrame(stepPlaybackFrame);
}

function play() {
  if (!state.timeline.length) {
    return;
  }

  if (state.timelineIndex >= state.timeline.length) {
    state.timelineIndex = 0;
    clearReplayUi();
  }

  state.playing = true;
  hideOutcome();
  renderTransport();
  clearTimer();
  // Opening bell + crowd ambience as the fight starts.
  audio('walkoutDrums', false);
  audio('crowdMurmur', true);
  audio('bell');
  state.timer = window.requestAnimationFrame(stepPlaybackFrame);
}

function setSpeed(nextSpeed) {
  state.speed = nextSpeed;
  renderTransport();
}

function setVenue(venue) {
  if (!state.allowedVenues.includes(venue) || !VENUES[venue]) {
    return;
  }

  state.venue = venue;
  renderVenue();
}

function setVenueOptions(allowedVenues) {
  state.allowedVenues = Array.isArray(allowedVenues) && allowedVenues.length
    ? allowedVenues.filter(venue => VENUES[venue])
    : ['local'];

  if (!state.allowedVenues.includes(state.venue)) {
    state.venue = state.allowedVenues[0];
  }

  renderVenue();
}

function loadReplay(replay) {
  pause();
  clearReplayUi();
  // Pre-fight: walkout drums + crowd murmur ambience.
  audio('walkoutDrums', true);
  audio('crowdMurmur', true);

  state.titleEyebrow = replay?.titleEyebrow || 'Live Fight';
  state.scorecards = clone(replay?.scorecards || DEFAULT_SCORECARDS);
  state.timeline = Array.isArray(replay?.timeline) ? clone(replay.timeline) : [];
  state.timelineIndex = 0;
  state.outcome = replay?.outcome ? clone(replay.outcome) : null;
  setVenueOptions(replay?.allowedVenues || ['local']);
  state.venue = replay?.venue && state.allowedVenues.includes(replay.venue) ? replay.venue : state.allowedVenues[0];
  setFighters(replay?.redCorner || DEFAULT_FIGHTER, replay?.blueCorner || DEFAULT_FIGHTER);

  const initialState = replay?.initialState || {
    round: 1,
    totalRounds: 3,
    phase: 'pregame',
    timeRemaining: 300,
    red: createFighterState(44, 180, 48),
    blue: createFighterState(56, 0, 52)
  };

  state.round = initialState.round ?? 1;
  state.totalRounds = initialState.totalRounds ?? 3;
  state.phase = initialState.phase ?? 'pregame';
  state.timeRemaining = initialState.timeRemaining ?? 300;
  state.fighterState.red = clone(initialState.red || createFighterState(32, 180));
  state.fighterState.blue = clone(initialState.blue || createFighterState(66, 0));

  appendReplayEvent({
    tone: 'gold',
    time: '--:--',
    tickerText: 'Live fight is ready. Press play to run the round by round sequence.'
  });

  renderAll();
}

function getState() {
  return clone(state);
}

function bindEvents() {
  document.getElementById('btn-play-replay').addEventListener('click', () => {
    audio('ui', 'confirm');
    play();
  });
  document.getElementById('btn-pause-replay').addEventListener('click', () => {
    audio('ui', 'cancel');
    pause();
  });

  document.querySelectorAll('[data-speed]').forEach(button => {
    button.addEventListener('click', () => {
      audio('ui', 'click');
      setSpeed(Number(button.dataset.speed));
    });
  });

  document.querySelectorAll('[data-venue]').forEach(button => {
    button.addEventListener('click', () => {
      audio('ui', 'click');
      setVenue(button.dataset.venue);
    });
  });
}

window.clearFeed = clearReplayUi;
window.OctagonSim = {
  loadReplay,
  play,
  pause,
  setSpeed,
  setVenue,
  setVenueOptions,
  setFighters,
  updateFighter,
  setRound,
  logEvent,
  finish,
  getState
};

const DESIGN_WIDTH = 1400;
const DESIGN_HEIGHT = 880;

function applyAppScale() {
  const viewport = document.querySelector('.app-viewport');
  if (!viewport) return;
  const w = viewport.clientWidth || window.innerWidth;
  const h = viewport.clientHeight || window.innerHeight;
  const scale = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
  document.documentElement.style.setProperty('--app-scale', scale.toFixed(4));
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  applyAppScale();
  window.addEventListener('resize', applyAppScale);
  loadReplay({
    venue: 'local',
    allowedVenues: ['local', 'regional', 'stadium'],
    titleEyebrow: 'Live Fight',
    redCorner: DEFAULT_FIGHTER,
    blueCorner: DEFAULT_FIGHTER,
    timeline: [],
    scorecards: clone(DEFAULT_SCORECARDS),
    initialState: {
      round: 1,
      totalRounds: 3,
      phase: 'pregame',
      timeRemaining: 300,
      red: createFighterState(44, 180, 48),
      blue: createFighterState(56, 0, 52)
    },
    outcome: null
  });
});