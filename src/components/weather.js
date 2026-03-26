/* Estado interno do módulo — não vai para o store principal */
const wx = {
  status:   'idle',   // idle | loading | ok | error | denied
  temp:     null,
  feels:    null,
  rain:     null,
  wind:     null,
  humidity: null,
  code:     null,
  isDay:    true,
  desc:     null,
};

/* Chamada à Open-Meteo (gratuita, sem chave) */
async function _fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m,relativehumidity_2m,is_day` +
    `&timezone=auto`;

  const r = await fetch(url);
  if (!r.ok) throw new Error('weather fetch failed');
  const d = await r.json();

  const c = d.current;
  wx.temp     = Math.round(c.temperature_2m);
  wx.feels    = Math.round(c.apparent_temperature);
  wx.rain     = c.precipitation;
  wx.wind     = Math.round(c.windspeed_10m);
  wx.humidity = c.relativehumidity_2m;
  wx.code     = c.weathercode;
  wx.isDay    = c.is_day === 1;
  wx.desc     = _wmoDesc(c.weathercode, c.is_day === 1);
  wx.status   = 'ok';
}

/* Cena animada por condição */
function _weatherScene(code, isDay) {
  const stars = Array.from({length: 6}, (_, i) =>
    `<div class="wx-star" style="--i:${i}"></div>`).join('');

  if (code === 0) {
    return isDay ? `
      <div class="wx-scene wx-scene--sunny">
        <div class="wx-sun">
          <div class="wx-sun__core"></div>
          ${Array.from({length: 8}, (_, i) => `<div class="wx-sun__ray" style="--i:${i}"></div>`).join('')}
        </div>
      </div>` : `
      <div class="wx-scene wx-scene--night">
        ${stars}
        <div class="wx-moon"></div>
      </div>`;
  }

  if (code <= 3) {
    return isDay ? `
      <div class="wx-scene wx-scene--partly">
        <div class="wx-sun wx-sun--small">
          <div class="wx-sun__core"></div>
        </div>
        <div class="wx-cloud wx-cloud--front"></div>
      </div>` : `
      <div class="wx-scene wx-scene--night-cloudy">
        ${stars}
        <div class="wx-moon wx-moon--small"></div>
        <div class="wx-cloud wx-cloud--front wx-cloud--night"></div>
      </div>`;
  }

  if (code <= 48) return `
    <div class="wx-scene wx-scene--cloudy">
      <div class="wx-cloud wx-cloud--back"></div>
      <div class="wx-cloud wx-cloud--front"></div>
    </div>`;

  if (code <= 77) return `
    <div class="wx-scene wx-scene--rain">
      <div class="wx-cloud wx-cloud--dark"></div>
      ${Array.from({length: 7}, (_, i) => `<div class="wx-drop" style="--i:${i}"></div>`).join('')}
    </div>`;

  return `
    <div class="wx-scene wx-scene--storm">
      <div class="wx-cloud wx-cloud--dark"></div>
      ${Array.from({length: 7}, (_, i) => `<div class="wx-drop" style="--i:${i}"></div>`).join('')}
      <div class="wx-lightning"></div>
    </div>`;
}

/* Descrição simplificada dos códigos WMO */
function _wmoDesc(code, isDay) {
  if (code === 0)  return isDay ? 'Céu limpo ☀️'            : 'Céu limpo 🌙';
  if (code <= 3)   return isDay ? 'Parcialmente nublado 🌤️' : 'Parcialmente nublado 🌛';
  if (code <= 48)  return 'Nublado / neblina ☁️';
  if (code <= 67)  return 'Chuva 🌧️';
  if (code <= 77)  return 'Neve / granizo 🌨️';
  if (code <= 82)  return 'Chuva forte 🌧️';
  if (code <= 99)  return 'Tempestade ⛈️';
  return 'Tempo indefinido';
}

/* Inicia busca de geolocalização + clima (chamado pelo app) */
export function initWeather(onUpdate) {
  if (wx.status !== 'idle') return;
  wx.status = 'loading';
  onUpdate();

  if (!navigator.geolocation) {
    wx.status = 'error';
    onUpdate();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        await _fetchWeather(pos.coords.latitude, pos.coords.longitude);
      } catch {
        wx.status = 'error';
      }
      onUpdate();
    },
    () => {
      wx.status = 'denied';
      onUpdate();
    },
    { timeout: 8000 },
  );
}

/* Render do widget */
export function renderWeather() {
  if (wx.status === 'idle') {
    return `
      <div class="weather-widget weather-widget--idle">
        <button class="weather-widget__cta" onclick="App.initWeather()">
          🌤️ Ver clima local
        </button>
      </div>`;
  }

  if (wx.status === 'loading') {
    return `
      <div class="weather-widget weather-widget--loading">
        <span class="weather-widget__spinner"></span>
        <span class="weather-widget__label">Buscando clima...</span>
      </div>`;
  }

  if (wx.status === 'denied') {
    return `
      <div class="weather-widget weather-widget--error weather-widget--denied">
        <span class="weather-widget__denied-icon">📍</span>
        <div class="weather-widget__denied-text">
          <span>Localização bloqueada</span>
          <small>Permita nas configurações do navegador e recarregue a página</small>
        </div>
      </div>`;
  }

  if (wx.status === 'error') {
    return `
      <div class="weather-widget weather-widget--error">
        <span>⚠️ Não foi possível carregar o clima</span>
      </div>`;
  }

  /* ok */
  const rainLabel = wx.rain > 0
    ? `${wx.rain} mm`
    : `Sem chuva`;
  const rainClass = wx.rain > 0 ? 'weather-widget__stat-val--rain' : 'weather-widget__stat-val--ok';

  return `
    <div class="weather-widget weather-widget--full">
      ${_weatherScene(wx.code, wx.isDay)}
      <div class="weather-widget__header">
        <span class="weather-widget__temp">${wx.temp}°C</span>
        <span class="weather-widget__desc">${wx.desc}</span>
      </div>
      <div class="weather-widget__stats">
        <div class="weather-widget__stat">
          <span class="weather-widget__stat-label">Sensação</span>
          <span class="weather-widget__stat-val">${wx.feels}°C</span>
        </div>
        <div class="weather-widget__stat">
          <span class="weather-widget__stat-label">Vento</span>
          <span class="weather-widget__stat-val">${wx.wind} km/h</span>
        </div>
        <div class="weather-widget__stat">
          <span class="weather-widget__stat-label">Umidade</span>
          <span class="weather-widget__stat-val">${wx.humidity}%</span>
        </div>
        <div class="weather-widget__stat">
          <span class="weather-widget__stat-label">Chuva</span>
          <span class="weather-widget__stat-val ${rainClass}">${rainLabel}</span>
        </div>
      </div>
    </div>`;
}
