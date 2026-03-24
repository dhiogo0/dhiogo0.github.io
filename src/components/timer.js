/* ── Timer state (module-level to survive re-renders) ── */
let _duration   = 10 * 60; // seconds
let _timeLeft   = _duration;
let _running    = false;
let _intervalId = null;
let _finished   = false;

const PRESETS = [
  { label: '5m',  val: 5  * 60 },
  { label: '10m', val: 10 * 60 },
  { label: '15m', val: 15 * 60 },
  { label: '20m', val: 20 * 60 },
];

function _fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function _playAlarm() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (startAt, freq = 880) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.7, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.45);
      osc.start(startAt);
      osc.stop(startAt + 0.45);
    };
    beep(ctx.currentTime);
    beep(ctx.currentTime + 0.55);
    beep(ctx.currentTime + 1.10);
  } catch (_) {}
}

/* ── Public getters ── */

export function isTimerRunning() { return _running; }

/* ── Public actions ── */

export function timerStart() {
  if (_running || _finished) return;
  _running    = true;
  _intervalId = setInterval(() => {
    _timeLeft--;
    if (_timeLeft <= 0) {
      _timeLeft   = 0;
      _running    = false;
      _finished   = true;
      clearInterval(_intervalId);
      _intervalId = null;
      _playAlarm();
    }
    window.App?.render();
  }, 1000);
  window.App?.render();
}

export function timerPause() {
  if (!_running) return;
  _running = false;
  clearInterval(_intervalId);
  _intervalId = null;
  window.App?.render();
}

export function timerReset() {
  clearInterval(_intervalId);
  _intervalId = null;
  _running    = false;
  _finished   = false;
  _timeLeft   = _duration;
  window.App?.render();
}

export function timerSetDuration(secs) {
  clearInterval(_intervalId);
  _intervalId = null;
  _running    = false;
  _finished   = false;
  _duration   = secs;
  _timeLeft   = secs;
  window.App?.render();
}

/* ── Render ── */

export function renderTimer() {
  const pct      = _duration > 0 ? (_timeLeft / _duration) * 100 : 0;
  const isUrgent = pct < 20 && pct > 0 && !_finished;
  const color    = _finished ? '#ef4444' : isUrgent ? '#f97316' : 'var(--green)';

  const presetBtns = PRESETS.map(p => {
    const isActive = _duration === p.val && _timeLeft === p.val && !_running;
    return `<button
      class="timer-preset ${isActive ? 'timer-preset--active' : ''}"
      onclick="App.timerSetDuration(${p.val})"
      ${_running ? 'disabled' : ''}>${p.label}</button>`;
  }).join('');

  const ctrlBtn = _finished
    ? `<div class="timer-finished-msg">Fim de Jogo!</div>`
    : _running
      ? `<button class="btn btn--ghost btn--sm timer-btn-main" onclick="App.timerPause()">Pausar</button>`
      : `<button class="btn btn--primary btn--sm timer-btn-main" onclick="App.timerStart()">Iniciar</button>`;

  return `
    <div class="timer-card ${_finished ? 'timer-card--finished' : ''}">
      <div class="timer-card__header">
        <span class="timer-card__title">CRONOMETRO</span>
        <div class="timer-presets">${presetBtns}</div>
      </div>
      <div class="timer-display" style="color:${color}">${_fmt(_timeLeft)}</div>
      <div class="timer-progress">
        <div class="timer-progress__fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="timer-controls">
        ${ctrlBtn}
        <button class="btn btn--ghost btn--sm" data-tooltip="Reiniciar" onclick="App.timerReset()">&#8635;</button>
      </div>
    </div>
  `;
}
