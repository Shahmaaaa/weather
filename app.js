/* =========================================
   SkyCast — Weather Dashboard Application
   Using Open-Meteo API (Free, No Key Needed)
   ========================================= */

// ——————————————————————————————
// API Endpoints (Open-Meteo — free, accurate, real-time)
// ——————————————————————————————
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// ——————————————————————————————
// WMO Weather Code Mapping
// ——————————————————————————————
const WMO_CODES = {
  0:  { desc: 'Clear sky',            icon: '☀️', bg: 'clear' },
  1:  { desc: 'Mainly clear',         icon: '🌤️', bg: 'clear' },
  2:  { desc: 'Partly cloudy',        icon: '⛅',  bg: 'clouds' },
  3:  { desc: 'Overcast',             icon: '☁️', bg: 'clouds' },
  45: { desc: 'Fog',                  icon: '🌫️', bg: 'mist' },
  48: { desc: 'Depositing rime fog',  icon: '🌫️', bg: 'mist' },
  51: { desc: 'Light drizzle',        icon: '🌦️', bg: 'rain' },
  53: { desc: 'Moderate drizzle',     icon: '🌦️', bg: 'rain' },
  55: { desc: 'Dense drizzle',        icon: '🌧️', bg: 'rain' },
  56: { desc: 'Freezing drizzle',     icon: '🌧️', bg: 'rain' },
  57: { desc: 'Dense freezing drizzle', icon: '🌧️', bg: 'rain' },
  61: { desc: 'Slight rain',          icon: '🌦️', bg: 'rain' },
  63: { desc: 'Moderate rain',        icon: '🌧️', bg: 'rain' },
  65: { desc: 'Heavy rain',           icon: '🌧️', bg: 'rain' },
  66: { desc: 'Freezing rain',        icon: '🌧️', bg: 'rain' },
  67: { desc: 'Heavy freezing rain',  icon: '🌧️', bg: 'rain' },
  71: { desc: 'Slight snowfall',      icon: '🌨️', bg: 'snow' },
  73: { desc: 'Moderate snowfall',    icon: '🌨️', bg: 'snow' },
  75: { desc: 'Heavy snowfall',       icon: '❄️', bg: 'snow' },
  77: { desc: 'Snow grains',          icon: '❄️', bg: 'snow' },
  80: { desc: 'Slight rain showers',  icon: '🌦️', bg: 'rain' },
  81: { desc: 'Moderate rain showers', icon: '🌧️', bg: 'rain' },
  82: { desc: 'Violent rain showers', icon: '⛈️', bg: 'thunderstorm' },
  85: { desc: 'Slight snow showers',  icon: '🌨️', bg: 'snow' },
  86: { desc: 'Heavy snow showers',   icon: '❄️', bg: 'snow' },
  95: { desc: 'Thunderstorm',         icon: '⛈️', bg: 'thunderstorm' },
  96: { desc: 'Thunderstorm with slight hail', icon: '⛈️', bg: 'thunderstorm' },
  99: { desc: 'Thunderstorm with heavy hail',  icon: '⛈️', bg: 'thunderstorm' },
};

function getWeatherInfo(code) {
  return WMO_CODES[code] || { desc: 'Unknown', icon: '🌡️', bg: 'clear' };
}

// ——————————————————————————————
// State
// ——————————————————————————————
let isCelsius = true;
let currentWeather = null;
let currentLocation = null;
let searchTimeout = null;

// ——————————————————————————————
// DOM References
// ——————————————————————————————
const $ = (id) => document.getElementById(id);

const els = {
  searchInput: $('searchInput'),
  searchBtn: $('searchBtn'),
  geoBtn: $('geoBtn'),
  searchSuggestions: $('searchSuggestions'),
  stateMessage: $('stateMessage'),
  stateIcon: $('stateIcon'),
  stateText: $('stateText'),
  welcomeScreen: $('welcomeScreen'),
  dashboard: $('dashboard'),
  unitToggle: $('unitToggle'),
  headerTime: $('headerTime'),
  // Hero
  cityName: $('cityName'),
  countryBadge: $('countryBadge'),
  heroDate: $('heroDate'),
  heroTemp: $('heroTemp'),
  heroUnit: $('heroUnit'),
  heroDesc: $('heroDesc'),
  heroHigh: $('heroHigh'),
  heroLow: $('heroLow'),
  heroFeelsLike: $('heroFeelsLike'),
  heroIcon: $('heroIcon'),
  // Details
  windValue: $('windValue'),
  windDir: $('windDir'),
  humidityValue: $('humidityValue'),
  dewPoint: $('dewPoint'),
  pressureValue: $('pressureValue'),
  pressureSub: $('pressureSub'),
  visibilityValue: $('visibilityValue'),
  visibilitySub: $('visibilitySub'),
  sunriseValue: $('sunriseValue'),
  sunsetSub: $('sunsetSub'),
  cloudsValue: $('cloudsValue'),
  cloudsSub: $('cloudsSub'),
  // Forecast
  forecastCards: $('forecastCards'),
  hourlyScroll: $('hourlyScroll'),
  // Particles
  bgParticles: $('bgParticles'),
};

// ——————————————————————————————
// Utilities
// ——————————————————————————————
function toFahrenheit(c) {
  return (c * 9 / 5) + 32;
}

function displayTemp(celsius) {
  const val = isCelsius ? celsius : toFahrenheit(celsius);
  return Math.round(val);
}

function tempUnit() {
  return isCelsius ? '°C' : '°F';
}

function windDirection(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatHour(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

function formatTimeFromISO(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function debounce(fn, delay) {
  return function (...args) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ——————————————————————————————
// Background Particles
// ——————————————————————————————
function createParticles() {
  const container = els.bgParticles;
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left = Math.random() * 100 + '%';
    p.style.width = (Math.random() * 3 + 1) + 'px';
    p.style.height = p.style.width;
    p.style.animationDuration = (Math.random() * 15 + 10) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.opacity = Math.random() * 0.5 + 0.1;
    container.appendChild(p);
  }
}

// ——————————————————————————————
// Clock
// ——————————————————————————————
function updateClock() {
  const now = new Date();
  els.headerTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

// ——————————————————————————————
// UI State Helpers
// ——————————————————————————————
function showWelcome() {
  els.welcomeScreen.classList.remove('hidden');
  els.dashboard.classList.remove('visible');
  els.stateMessage.classList.remove('visible');
}

function showLoading() {
  els.welcomeScreen.classList.add('hidden');
  els.dashboard.classList.remove('visible');
  els.stateMessage.classList.add('visible');
  els.stateIcon.innerHTML = '<div class="spinner"></div>';
  els.stateText.textContent = 'Fetching weather data...';
}

function showError(message) {
  els.welcomeScreen.classList.add('hidden');
  els.dashboard.classList.remove('visible');
  els.stateMessage.classList.add('visible');
  els.stateIcon.textContent = '⚠️';
  els.stateText.textContent = message;
}

function showDashboard() {
  els.welcomeScreen.classList.add('hidden');
  els.stateMessage.classList.remove('visible');
  els.dashboard.classList.add('visible');
}

// ——————————————————————————————
// API Calls
// ——————————————————————————————

/** Geocode a city name → list of matches */
async function geocodeCity(name) {
  const res = await fetch(`${GEO_API}?name=${encodeURIComponent(name)}&count=6&language=en`);
  if (!res.ok) throw new Error('Geocoding request failed.');
  const data = await res.json();
  return data.results || [];
}

/** Fetch full weather for lat/lon */
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
      'is_day', 'weather_code', 'cloud_cover', 'pressure_msl',
      'surface_pressure', 'wind_speed_10m', 'wind_direction_10m',
      'wind_gusts_10m'
    ].join(','),
    hourly: [
      'temperature_2m', 'weather_code', 'is_day'
    ].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'apparent_temperature_max', 'apparent_temperature_min',
      'sunrise', 'sunset', 'uv_index_max',
      'wind_speed_10m_max', 'precipitation_sum'
    ].join(','),
    timezone: 'auto',
    forecast_days: 6,
  });

  const res = await fetch(`${WEATHER_API}?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather request failed (HTTP ${res.status}).`);
  return await res.json();
}

/** Main search flow */
async function searchAndDisplay(cityName) {
  showLoading();
  try {
    // 1. Geocode
    const locations = await geocodeCity(cityName);
    if (!locations.length) {
      showError(`City "${cityName}" not found. Please check the spelling and try again.`);
      return;
    }
    const loc = locations[0];
    currentLocation = loc;

    // 2. Fetch weather
    const weather = await fetchWeather(loc.latitude, loc.longitude);
    currentWeather = weather;

    // 3. Render
    renderAll();
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

/** Reverse-geocode coordinates → city name via Nominatim (OpenStreetMap) */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'SkyCastWeatherDashboard/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    // Pick the most specific locality available
    const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || addr.state || '';
    const country = addr.country_code ? addr.country_code.toUpperCase() : '';
    return { name: city, country_code: country };
  } catch {
    return null;
  }
}

/** Fetch by coordinates (geolocation) */
async function fetchByCoords(lat, lon) {
  showLoading();
  try {
    // Run reverse-geocoding and weather fetch in parallel
    const [geoResult, weather] = await Promise.all([
      reverseGeocode(lat, lon),
      fetchWeather(lat, lon),
    ]);
    currentWeather = weather;

    const cityName = (geoResult && geoResult.name) ? geoResult.name : 'Your Location';
    const countryCode = (geoResult && geoResult.country_code) ? geoResult.country_code : '';

    currentLocation = {
      name: cityName,
      country_code: countryCode,
      latitude: lat,
      longitude: lon,
      admin1: '',
    };

    renderAll();
  } catch (err) {
    showError(err.message || 'Failed to fetch weather for your location.');
  }
}

// ——————————————————————————————
// Render Functions
// ——————————————————————————————

function renderSuggestions(locations) {
  if (!locations.length) {
    els.searchSuggestions.classList.remove('active');
    return;
  }

  // De-duplicate
  const seen = new Set();
  const unique = locations.filter(loc => {
    const key = `${loc.name}-${loc.country_code}-${loc.admin1 || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);

  els.searchSuggestions.innerHTML = unique.map(loc => `
    <div class="suggestion-item" data-lat="${loc.latitude}" data-lon="${loc.longitude}" data-name="${loc.name}" data-country="${loc.country_code || ''}">
      <span class="suggestion-city">${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''}</span>
      <span class="suggestion-country">${loc.country_code || ''}</span>
    </div>
  `).join('');
  els.searchSuggestions.classList.add('active');
}

function renderAll() {
  if (!currentWeather || !currentLocation) return;

  const w = currentWeather;
  const loc = currentLocation;
  const cur = w.current;

  // — Hero Card —
  els.cityName.textContent = loc.name;
  els.countryBadge.textContent = loc.country_code || '';
  if (!loc.country_code) els.countryBadge.style.display = 'none';
  else els.countryBadge.style.display = '';

  // Today's date from the daily array
  const todayDate = w.daily.time[0];
  els.heroDate.textContent = formatFullDate(todayDate);

  // Temperature
  els.heroTemp.textContent = displayTemp(cur.temperature_2m);
  els.heroUnit.textContent = tempUnit();

  // Weather description & icon
  const weatherInfo = getWeatherInfo(cur.weather_code);
  els.heroDesc.textContent = weatherInfo.desc;

  // Use emoji as the weather icon
  els.heroIcon.style.display = 'none';
  const heroRight = els.heroIcon.parentElement;
  let emojiEl = heroRight.querySelector('.hero-emoji');
  if (!emojiEl) {
    emojiEl = document.createElement('span');
    emojiEl.className = 'hero-emoji';
    emojiEl.style.cssText = 'font-size:8rem;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.3));animation:floatBounce 4s ease-in-out infinite;display:inline-block;';
    heroRight.appendChild(emojiEl);
  }
  emojiEl.textContent = weatherInfo.icon;

  // High / Low
  const todayMax = w.daily.temperature_2m_max[0];
  const todayMin = w.daily.temperature_2m_min[0];
  els.heroHigh.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="#ff6b6b" stroke-width="2"><polyline points="4 10 8 4 12 10"/></svg> ${displayTemp(todayMax)}${tempUnit()}`;
  els.heroLow.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="#74b9ff" stroke-width="2"><polyline points="4 6 8 12 12 6"/></svg> ${displayTemp(todayMin)}${tempUnit()}`;
  els.heroFeelsLike.textContent = `Feels like ${displayTemp(cur.apparent_temperature)}${tempUnit()}`;

  // — Detail Cards —
  els.windValue.textContent = `${cur.wind_speed_10m} km/h`;
  els.windDir.textContent = `${windDirection(cur.wind_direction_10m)} · Gusts ${cur.wind_gusts_10m} km/h`;

  els.humidityValue.textContent = `${cur.relative_humidity_2m}%`;
  // Dew point approximation: Td ≈ T - (100 - RH)/5
  const dewPt = cur.temperature_2m - ((100 - cur.relative_humidity_2m) / 5);
  els.dewPoint.textContent = `Dew point: ${displayTemp(dewPt)}${tempUnit()}`;

  els.pressureValue.textContent = `${Math.round(cur.pressure_msl)}`;
  els.pressureSub.textContent = 'hPa';

  // Open-Meteo doesn't provide visibility in the free current endpoint,
  // so show UV index instead if available
  const uvMax = w.daily.uv_index_max ? w.daily.uv_index_max[0] : null;
  if (uvMax !== null) {
    els.visibilityValue.textContent = uvMax.toFixed(1);
    const uvLabel = uvMax <= 2 ? 'Low' : uvMax <= 5 ? 'Moderate' : uvMax <= 7 ? 'High' : uvMax <= 10 ? 'Very High' : 'Extreme';
    els.visibilitySub.textContent = `UV Index · ${uvLabel}`;
    // Update the label
    const visCard = $('cardVisibility');
    visCard.querySelector('.detail-label').textContent = 'UV INDEX';
    visCard.querySelector('.detail-icon').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  }

  // Sunrise / Sunset
  const sunrise = w.daily.sunrise[0];
  const sunset = w.daily.sunset[0];
  els.sunriseValue.textContent = formatTimeFromISO(sunrise);
  els.sunsetSub.textContent = `Sunset: ${formatTimeFromISO(sunset)}`;

  // Cloud Cover
  els.cloudsValue.textContent = `${cur.cloud_cover}%`;
  els.cloudsSub.textContent = cur.cloud_cover < 25 ? 'Clear skies' : cur.cloud_cover < 50 ? 'Partly cloudy' : cur.cloud_cover < 75 ? 'Mostly cloudy' : 'Overcast';

  // Stagger detail-card animations
  document.querySelectorAll('.detail-card').forEach((card, i) => {
    card.classList.remove('animate-in');
    void card.offsetWidth;
    card.style.animationDelay = `${i * 0.06}s`;
    card.classList.add('animate-in');
  });

  // — 5-Day Forecast —
  renderForecast();

  // — Hourly —
  renderHourly();

  // — Ambience —
  updateAmbience(weatherInfo.bg);

  showDashboard();
}

function renderForecast() {
  if (!currentWeather || !currentWeather.daily) {
    els.forecastCards.innerHTML = '<p style="color:var(--text-tertiary)">Forecast unavailable</p>';
    return;
  }

  const daily = currentWeather.daily;
  // Skip today (index 0), show next 5 days
  let html = '';
  for (let i = 1; i <= 5 && i < daily.time.length; i++) {
    const info = getWeatherInfo(daily.weather_code[i]);
    html += `
      <div class="forecast-card animate-in" style="animation-delay:${(i - 1) * 0.07}s">
        <span class="forecast-day">${formatDay(daily.time[i])}</span>
        <span class="forecast-icon" style="font-size:2.5rem;">${info.icon}</span>
        <span class="forecast-temp">${displayTemp(daily.temperature_2m_max[i])}${tempUnit()}</span>
        <span class="forecast-range">${displayTemp(daily.temperature_2m_min[i])}${tempUnit()}</span>
        <span class="forecast-desc">${info.desc}</span>
      </div>
    `;
  }
  els.forecastCards.innerHTML = html;
}

function renderHourly() {
  if (!currentWeather || !currentWeather.hourly) {
    els.hourlyScroll.innerHTML = '<p style="color:var(--text-tertiary)">Hourly data unavailable</p>';
    return;
  }

  const hourly = currentWeather.hourly;
  const now = new Date();

  // Find current hour index
  let startIdx = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]) >= now) {
      startIdx = Math.max(0, i - 1);
      break;
    }
  }

  // Show next 24 hours
  const count = Math.min(24, hourly.time.length - startIdx);
  let html = '';
  for (let i = startIdx; i < startIdx + count; i++) {
    const info = getWeatherInfo(hourly.weather_code[i]);
    const isNow = i === startIdx;
    html += `
      <div class="hourly-card${isNow ? ' now' : ''}">
        <span class="hourly-time">${isNow ? 'Now' : formatHour(hourly.time[i])}</span>
        <span class="hourly-icon" style="font-size:1.8rem;">${info.icon}</span>
        <span class="hourly-temp">${displayTemp(hourly.temperature_2m[i])}${tempUnit()}</span>
      </div>
    `;
  }
  els.hourlyScroll.innerHTML = html;
}

function updateAmbience(weatherBg) {
  const particles = document.querySelectorAll('.particle');
  let color;
  switch (weatherBg) {
    case 'clear':        color = 'rgba(250, 204, 21, 0.25)'; break;
    case 'clouds':       color = 'rgba(148, 163, 184, 0.25)'; break;
    case 'rain':         color = 'rgba(59, 130, 246, 0.3)'; break;
    case 'thunderstorm': color = 'rgba(168, 85, 247, 0.3)'; break;
    case 'snow':         color = 'rgba(226, 232, 240, 0.35)'; break;
    case 'mist':         color = 'rgba(148, 163, 184, 0.2)'; break;
    default:             color = 'rgba(99, 102, 241, 0.25)';
  }
  particles.forEach(p => { p.style.background = color; });
}

// ——————————————————————————————
// Event Handlers
// ——————————————————————————————
function handleSearch() {
  const query = els.searchInput.value.trim();
  if (!query) {
    showError('Please enter a city name to search.');
    return;
  }
  els.searchSuggestions.classList.remove('active');
  searchAndDisplay(query);
}

function handleGeoLocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError('Unable to get your location. Please allow location access or search manually.')
  );
}

function handleUnitToggle() {
  isCelsius = !isCelsius;
  els.unitToggle.textContent = isCelsius ? '°C' : '°F';
  if (currentWeather) renderAll();
}

// ——————————————————————————————
// Live search suggestions
// ——————————————————————————————
async function handleSearchInput(query) {
  if (query.length < 2) {
    els.searchSuggestions.classList.remove('active');
    return;
  }
  try {
    const locations = await geocodeCity(query);
    renderSuggestions(locations);
  } catch {
    // silently fail
  }
}

// ——————————————————————————————
// Event Listeners
// ——————————————————————————————
els.searchBtn.addEventListener('click', handleSearch);
els.geoBtn.addEventListener('click', handleGeoLocation);
els.unitToggle.addEventListener('click', handleUnitToggle);

els.searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

els.searchInput.addEventListener('input', debounce((e) => {
  handleSearchInput(e.target.value.trim());
}, 350));

// Suggestion clicks
els.searchSuggestions.addEventListener('click', (e) => {
  const item = e.target.closest('.suggestion-item');
  if (!item) return;

  const name = item.dataset.name;
  const lat = parseFloat(item.dataset.lat);
  const lon = parseFloat(item.dataset.lon);
  const country = item.dataset.country;

  els.searchInput.value = name;
  els.searchSuggestions.classList.remove('active');

  // Set location and fetch weather directly by coords for accuracy
  currentLocation = { name, country_code: country, latitude: lat, longitude: lon, admin1: '' };
  showLoading();
  fetchWeather(lat, lon).then(weather => {
    currentWeather = weather;
    renderAll();
  }).catch(err => {
    showError(err.message || 'Failed to fetch weather.');
  });
});

// Quick city buttons
document.querySelectorAll('.quick-city').forEach(btn => {
  btn.addEventListener('click', () => {
    const city = btn.dataset.city;
    els.searchInput.value = city;
    searchAndDisplay(city);
  });
});

// Close suggestions on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    els.searchSuggestions.classList.remove('active');
  }
});

// ——————————————————————————————
// Init
// ——————————————————————————————
function init() {
  createParticles();
  updateClock();
  setInterval(updateClock, 1000);
  showWelcome();
}

init();
