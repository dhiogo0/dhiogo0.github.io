/* ── Timer state (module-level to survive re-renders) ── */
const _STORAGE_KEY = 'racha_timer_duration';
const _DEFAULT_SECS = 10 * 60;

function _loadDuration() {
  const saved = parseInt(localStorage.getItem(_STORAGE_KEY));
  return saved > 0 ? saved : _DEFAULT_SECS;
}

function _saveDuration(secs) {
  localStorage.setItem(_STORAGE_KEY, secs);
}

let _duration   = _loadDuration();
let _timeLeft   = _duration;
let _running    = false;
let _intervalId = null;
let _finished   = false;
let _startedAt  = null; // timestamp real para corrigir throttle de background
let _audioCtx   = null; // contexto criado no gesto do usuário para desbloquear no iOS

function _fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function _unlockAudio() {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
  } catch (_) {}
}

async function _playAlarm() {
  try {
    const ctx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    const beep = (startAt, freq = 880, dur = 0.5) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.6, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      osc.start(startAt);
      osc.stop(startAt + dur);
    };
    const t = ctx.currentTime;
    beep(t,        880, 0.4);
    beep(t + 0.5,  880, 0.4);
    beep(t + 1.0,  988, 0.4);
    beep(t + 1.5,  988, 0.4);
    beep(t + 2.0, 1047, 0.8);
  } catch (_) {}
}

function _notifyEnd() {
  // Envia para o Service Worker mostrar notificacao na tela bloqueada
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'TIMER_END' });
  } else if (Notification.permission === 'granted') {
    new Notification('Fim de Jogo! ⏰', {
      body: 'O cronometro do Racha Facil acabou!',
      icon: '/assets/icons/icon.svg',
    });
  }
}

async function _requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function _finish() {
  _timeLeft   = 0;
  _running    = false;
  _finished   = true;
  _startedAt  = null;
  clearInterval(_intervalId);
  _intervalId = null;
  _playAlarm();
  _notifyEnd();
  window.App?.render();
}

/* ── Recalcula tempo ao voltar do background (corrige throttle do SO) ── */
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !_running || !_startedAt) return;
  const elapsed = Math.floor((Date.now() - _startedAt) / 1000);
  _timeLeft = Math.max(0, _duration - elapsed);
  if (_timeLeft === 0) {
    _finish();
  } else {
    window.App?.render();
  }
});

/* ── Public getters ── */

export function isTimerRunning() { return _running; }

/* ── Public actions ── */

export function timerStart() {
  if (_running || _finished) return;
  _unlockAudio();
  _requestNotificationPermission();
  // Calcula o startedAt considerando tempo ja decorrido (retomada apos pause)
  _startedAt  = Date.now() - (_duration - _timeLeft) * 1000;
  _running    = true;
  _intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - _startedAt) / 1000);
    _timeLeft = Math.max(0, _duration - elapsed);
    if (_timeLeft === 0) {
      _finish();
    } else {
      window.App?.render();
    }
  }, 1000);
  window.App?.render();
}

export function timerPause() {
  if (!_running) return;
  _running    = false;
  _startedAt  = null;
  clearInterval(_intervalId);
  _intervalId = null;
  window.App?.render();
}

export function timerReset() {
  clearInterval(_intervalId);
  _intervalId = null;
  _running    = false;
  _finished   = false;
  _startedAt  = null;
  _timeLeft   = _duration;
  window.App?.render();
}

export function timerSetDuration(secs) {
  const val   = Math.max(60, Math.min(secs, 99 * 60)); // entre 1 e 99 min
  clearInterval(_intervalId);
  _intervalId = null;
  _running    = false;
  _finished   = false;
  _startedAt  = null;
  _duration   = val;
  _timeLeft   = val;
  _saveDuration(val);
  window.App?.render();
}

/* ── Render ── */

export function renderTimer() {
  const pct      = _duration > 0 ? (_timeLeft / _duration) * 100 : 0;
  const isUrgent = pct < 20 && pct > 0 && !_finished;
  const color    = _finished ? '#ef4444' : isUrgent ? '#f97316' : 'var(--green)';

  const mins    = Math.round(_duration / 60);
  const canEdit = !_running && !_finished;

  const durationPicker = `
    <div class="timer-duration-picker">
      <button class="timer-dur-btn" onclick="App.timerSetDuration(${_duration - 60})"
        ${!canEdit || mins <= 1 ? 'disabled' : ''}>−</button>
      <span class="timer-dur-val">${mins}<span class="timer-dur-unit">min</span></span>
      <button class="timer-dur-btn" onclick="App.timerSetDuration(${_duration + 60})"
        ${!canEdit || mins >= 99 ? 'disabled' : ''}>+</button>
    </div>`;

  const ctrlBtn = _finished
    ? `<button class="btn btn--sm timer-btn-main timer-btn-finished" onclick="App.timerReset()">Fim de Jogo! — Resetar</button>`
    : _running
      ? `<button class="btn btn--ghost btn--sm timer-btn-main" onclick="App.timerPause()">Pausar</button>`
      : `<button class="btn btn--primary btn--sm timer-btn-main" onclick="App.timerStart()">Iniciar</button>`;

  return `
    <div class="timer-card ${_finished ? 'timer-card--finished' : ''}">
      <div class="timer-card__header">
        <span class="timer-card__title">CRONOMETRO</span>
        ${durationPicker}
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
