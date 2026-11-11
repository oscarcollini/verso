'use strict';

const byId = id => document.getElementById(id);
const radians = Math.PI / 180;
const wrap = degrees => ((degrees % 360) + 360) % 360;
const signed = degrees => wrap(degrees + 180) - 180;
const tolerance = 3;
const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

const compassScale = byId('compass-scale');
const degreesPerWidth = 120;
for (let degrees = -60; degrees <= 420; degrees += 5) {
  const tick = document.createElement('div');
  tick.className = 'compass-tick';
  tick.style.left = `${50 + 100 * degrees / degreesPerWidth}%`;
  const bearing = wrap(degrees);
  const isCardinal = bearing % 45 === 0;
  if (isCardinal || bearing % 15 === 0) {
    tick.classList.add('major');
    const label = document.createElement('span');
    label.textContent = isCardinal ? cardinal[bearing / 45] : bearing;
    if (isCardinal) label.className = bearing === 0 ? 'cardinal north' : 'cardinal';
    tick.append(label);
  }
  compassScale.append(tick);
}

let current = null;
let frozen = null;
let target = null;
let absoluteSeen = false;
let sensorTimeout;
let audio;
let aligned = false;
let installPrompt;
let coordinates = '';

function readOrientation(event) {
  const hasHeading = (event.absolute === true || event.type === 'deviceorientationabsolute')
    && Number.isFinite(event.alpha);
  if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma) || (absoluteSeen && !hasHeading)) return;

  const beta = event.beta * radians;
  const gamma = event.gamma * radians;
  // Apply the device's intrinsic Z-X-Y rotations to the rear-facing axis (0, 0, -1).
  const x = -Math.sin(gamma);
  const y = Math.sin(beta) * Math.cos(gamma);
  const up = -Math.cos(beta) * Math.cos(gamma);
  const horizontal = Math.hypot(x, y);
  // At the poles azimuth is undefined. The device's right axis still orients the reticle.
  const bearing = horizontal < 1e-6 ? Math.atan2(-Math.sin(beta) * Math.sin(gamma), Math.cos(gamma))
    : Math.atan2(x, y);
  const heading = hasHeading ? wrap(bearing / radians - event.alpha) : null;
  absoluteSeen ||= hasHeading;
  current = { heading, altitude: Math.atan2(up, horizontal) / radians };
  clearTimeout(sensorTimeout);
  byId('start').hidden = true;
  byId('hold').disabled = false;
  render();
}

function render() {
  const reading = frozen || current;
  if (!reading) return;
  const heading = reading.heading;
  const azimuth = Math.abs(reading.altitude) > 89.99 ? null : heading;
  byId('azimuth').textContent = azimuth === null ? '—' : `${wrap(Math.round(azimuth))}° ${cardinal[Math.round(azimuth / 45) % 8]}`;
  byId('altitude').textContent = `${Math.round(reading.altitude) > 0 ? '+' : ''}${Math.round(reading.altitude)}°`;
  compassScale.hidden = azimuth === null;
  if (azimuth !== null) compassScale.style.transform = `translateX(${-100 * azimuth / degreesPerWidth}%)`;
  const status = frozen
    ? 'Lettura fissata'
    : azimuth === null
      ? (heading === null ? 'Azimut non disponibile' : 'Mira verticale · azimut indefinito')
      : 'Nord del sensore · punta come per scattare una foto';
  if (byId('sensor-status').textContent !== status) byId('sensor-status').textContent = status;
  if (target) renderTarget(heading, reading.altitude);
}

function renderTarget(azimuth, altitude) {
  const dot = byId('dot');
  dot.hidden = azimuth === null;
  if (azimuth === null) {
    setAligned(false);
    byId('direction').textContent = 'In attesa dell’azimut';
    return;
  }

  const delta = signed(target.azimuth - azimuth) * radians;
  const pitch = altitude * radians;
  const goal = target.altitude * radians;
  const right = Math.cos(goal) * Math.sin(delta);
  const up = Math.sin(goal) * Math.cos(pitch) - Math.cos(goal) * Math.sin(pitch) * Math.cos(delta);
  const forward = Math.sin(goal) * Math.sin(pitch) + Math.cos(goal) * Math.cos(pitch) * Math.cos(delta);
  const lateral = Math.hypot(right, up);
  const angle = Math.atan2(lateral, forward) / radians;
  const radius = Math.min(angle * 4, 41);
  const x = lateral < 1e-8 ? (forward < 0 ? radius : 0) : radius * right / lateral;
  const y = lateral < 1e-8 ? 0 : radius * up / lateral;
  dot.style.left = `${50 + x}%`;
  dot.style.top = `${50 - y}%`;

  const onTarget = angle <= (aligned ? tolerance + 0.7 : tolerance);
  setAligned(onTarget);
  byId('direction').textContent = onTarget ? 'In mira' : `Distanza dal bersaglio: ${Math.round(angle)}°`;
}

function setAligned(value) {
  if (value === aligned) return;
  aligned = value;
  byId('reticle').toggleAttribute('data-aligned', value);
  byId('target-status').textContent = value ? 'Bersaglio in mira' : '';
  if (value && !frozen && audio?.state === 'running') beep();
}

function beep() {
  const tone = audio.createOscillator();
  const volume = audio.createGain();
  const now = audio.currentTime;
  tone.frequency.value = 640;
  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  tone.connect(volume).connect(audio.destination);
  tone.start(now);
  tone.stop(now + 0.17);
}

byId('start').addEventListener('click', async () => {
  const orientation = window.DeviceOrientationEvent;
  if (!window.isSecureContext || !orientation) {
    byId('sensor-status').textContent = 'Apri la pagina HTTPS in un browser con accesso ai sensori.';
    return;
  }
  try {
    if (typeof orientation.requestPermission === 'function' && await orientation.requestPermission(true) !== 'granted') {
      byId('sensor-status').textContent = 'Accesso ai sensori negato.';
      return;
    }
    window.addEventListener('deviceorientationabsolute', readOrientation);
    window.addEventListener('deviceorientation', readOrientation);
    byId('sensor-status').textContent = 'In attesa dei sensori…';
    clearTimeout(sensorTimeout);
    sensorTimeout = setTimeout(() => {
      byId('sensor-status').textContent = 'Nessuna lettura. Controlla il permesso «Sensori di movimento» nel browser.';
    }, 4000);
  } catch {
    byId('sensor-status').textContent = 'Impossibile attivare i sensori.';
  }
});

function freeze(reading) {
  frozen = reading;
  byId('hold').textContent = reading ? 'Riprendi' : 'Fissa';
  render();
}

byId('hold').addEventListener('click', () => freeze(frozen ? null : current));
byId('toggle-target').addEventListener('click', () => {
  const panel = byId('target');
  panel.hidden = !panel.hidden;
  byId('toggle-target').textContent = panel.hidden ? 'Cerca' : 'Chiudi ricerca';
  byId('toggle-target').setAttribute('aria-expanded', String(!panel.hidden));
  if (panel.hidden) {
    target = null;
    setAligned(false);
    byId('guidance').hidden = true;
  }
});

byId('target-form').addEventListener('submit', event => {
  event.preventDefault();
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (Audio) {
    audio ??= new Audio();
    if (audio.state !== 'running') {
      audio.resume().then(() => {
        if (aligned && !frozen) beep();
      }).catch(() => {});
    }
  }
  target = { azimuth: wrap(byId('target-az').valueAsNumber), altitude: byId('target-alt').valueAsNumber };
  byId('guidance').hidden = false;
  byId('direction').textContent = 'Attiva i sensori per puntare';
  byId('dot').hidden = true;
  setAligned(false);
  freeze(null);
});

byId('locate').addEventListener('click', () => {
  const status = byId('location-status');
  if (!navigator.geolocation) {
    status.textContent = 'Posizione non disponibile';
    return;
  }
  byId('locate').disabled = true;
  byId('copy').hidden = true;
  status.textContent = 'Ricerca della posizione…';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const { latitude, longitude, altitude, accuracy } = coords;
    const position = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    const height = Number.isFinite(altitude) ? ` · ${Math.round(altitude)} m` : '';
    coordinates = position + height;
    status.textContent = `${coordinates} · ±${Math.round(accuracy)} m GPS`;
    byId('copy').textContent = 'Copia';
    byId('copy').hidden = !navigator.clipboard;
    byId('locate').disabled = false;
  }, error => {
    status.textContent = error.code === 1 ? 'Accesso alla posizione negato' : 'Posizione non disponibile. Riprova.';
    byId('locate').disabled = false;
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
});

byId('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(coordinates);
    byId('copy').textContent = 'Copiato';
  } catch {
    byId('copy').textContent = 'Riprova';
  }
});

const installButton = byId('install');
installButton.hidden = matchMedia('(display-mode: standalone)').matches;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
  byId('install-help').hidden = true;
});
installButton.addEventListener('click', async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    await prompt.prompt();
  } else {
    byId('install-help').hidden = !byId('install-help').hidden;
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
