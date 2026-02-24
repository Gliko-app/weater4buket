// Weather Widget 980x280 — OpenWeather
// KEY se ne čuva u repo: prosledi ga kroz URL npr:
// https://gliko-app.github.io/weather4bucket/?key=YOUR_OPENWEATHER_KEY

// ====== CONFIG ======
const CITY_NAME = "Zlatibor";
const LAT = 43.7286;
const LON = 19.7000;

// refresh u minutima (za signage je 10-15 idealno)
const REFRESH_MIN = 10;

// Jezik: latinica (srpski)
const LANG = "sr_latn";

// ====== KEY from URL ======
const params = new URLSearchParams(location.search);
const OPENWEATHER_KEY =
  params.get("key") ||
  params.get("appid") ||
  ""; // ako ostane prazno -> prikazaće grešku

// ====== DOM ======
const $ = (id) => document.getElementById(id);

function iconUrl(icon, size = "4x") {
  // size: "2x" ili "4x"
  return `https://openweathermap.org/img/wn/${icon}@${size}.png`;
}

function toKmH(ms) {
  return Math.round(ms * 3.6);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function setError(msg) {
  const el = $("error");
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function setUpdatedLabel() {
  const d = new Date();
  $("updated").textContent = `Ažurirano: ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function dayShortSR(dateObj) {
  // UTO, SRE, ČET, PET, SUB, NED, PON (latinica)
  const map = ["NED", "PON", "UTO", "SRE", "ČET", "PET", "SUB"];
  return map[dateObj.getDay()];
}

/**
 * Iz /forecast (3h step) izvučemo 3 naredna dana:
 * - biramo približno oko 12:00 lokalno (ili najbliži termin)
 */
function pickNext3DaysFromForecast(list, cityTzSeconds) {
  const now = Date.now();

  // Pretvori forecast tačke u "lokalno vreme grada"
  const points = list
    .map((p) => {
      const utcMs = p.dt * 1000;
      const localMs = utcMs + cityTzSeconds * 1000;
      const localDate = new Date(localMs);
      return { p, utcMs, localMs, localDate };
    })
    .filter((x) => x.utcMs > now);

  // Grupisanje po Y-M-D (lokalno)
  const byDay = new Map();
  for (const x of points) {
    const y = x.localDate.getUTCFullYear();
    const m = x.localDate.getUTCMonth() + 1;
    const d = x.localDate.getUTCDate();
    const key = `${y}-${m}-${d}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(x);
  }

  // Uzmi prva 3 različita dana
  const keys = Array.from(byDay.keys()).slice(0, 3);
  const picked = [];

  for (const k of keys) {
    const arr = byDay.get(k);
    // cilj: najbliže 12:00
    let best = arr[0];
    let bestDist = Infinity;

    for (const x of arr) {
      const h = x.localDate.getUTCHours();
      const dist = Math.abs(12 - h);
      if (dist < bestDist) {
        bestDist = dist;
        best = x;
      }
    }

    picked.push(best);
  }

  return picked;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

async function loadAndRender() {
  $("city").textContent = CITY_NAME;

  if (!OPENWEATHER_KEY) {
    $("temp").textContent = "--°C";
    $("desc").textContent = "Nema API ključa";
    $("humidity").textContent = "--%";
    $("wind").textContent = "-- km/h";
    $("pressure").textContent = "---- hPa";
    $("iconMain").removeAttribute("src");
    $("forecast").innerHTML = "";
    setError("Dodaj ?key=TVOJ_OPENWEATHER_KEY na URL (npr. GitHub Pages / PiSignage).");
    setUpdatedLabel();
    return;
  }

  setError("");

  const weatherUrl =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}` +
    `&appid=${encodeURIComponent(OPENWEATHER_KEY)}` +
    `&units=metric&lang=${encodeURIComponent(LANG)}`;

  const forecastUrl =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?lat=${encodeURIComponent(LAT)}&lon=${encodeURIComponent(LON)}` +
    `&appid=${encodeURIComponent(OPENWEATHER_KEY)}` +
    `&units=metric&lang=${encodeURIComponent(LANG)}`;

  try {
    const [w, f] = await Promise.all([
      fetchJson(weatherUrl),
      fetchJson(forecastUrl),
    ]);

    // MAIN
    const temp = Math.round(w?.main?.temp ?? NaN);
    const humidity = Math.round(w?.main?.humidity ?? NaN);
    const pressure = Math.round(w?.main?.pressure ?? NaN);
    const windMs = w?.wind?.speed ?? NaN;

    const icon = w?.weather?.[0]?.icon;
    const desc = w?.weather?.[0]?.description || "";

    $("temp").textContent = Number.isFinite(temp) ? `${temp}°C` : "--°C";
    $("desc").textContent = desc ? capitalizeFirst(desc) : "—";
    $("humidity").textContent = Number.isFinite(humidity) ? `${humidity}%` : "--%";
    $("pressure").textContent = Number.isFinite(pressure) ? `${pressure} hPa` : "---- hPa";
    $("wind").textContent = Number.isFinite(windMs) ? `${toKmH(windMs)} km/h` : "-- km/h";

    const iconEl = $("iconMain");
    if (icon) {
      iconEl.src = iconUrl(icon, "4x");
      iconEl.alt = desc || "Ikonica vremena";
    } else {
      iconEl.removeAttribute("src");
      iconEl.alt = "";
    }

    // FORECAST 3 days
    const cityTz = f?.city?.timezone ?? 0; // sekunde
    const list = Array.isArray(f?.list) ? f.list : [];
    const picked = pickNext3DaysFromForecast(list, cityTz);

    $("forecast").innerHTML = picked
      .map(({ p, localMs }) => {
        const dLocal = new Date(localMs);
        const day = dayShortSR(dLocal);
        const t = Math.round(p?.main?.temp ?? NaN);
        const ic = p?.weather?.[0]?.icon;
        const dsc = p?.weather?.[0]?.description || "";

        const tempStr = Number.isFinite(t) ? `${t}°C` : "--°C";
        const img = ic
          ? `<img class="iconSmall" src="${iconUrl(ic, "2x")}" alt="${escapeHtml(dsc)}" />`
          : `<span></span>`;

        return `
          <div class="forecastCard">
            <div class="fDay">${day}</div>
            ${img}
            <div class="fTemp">${tempStr}</div>
          </div>
        `;
      })
      .join("");

    setUpdatedLabel();
    setError("");
  } catch (err) {
    $("temp").textContent = "--°C";
    $("desc").textContent = "Greška pri učitavanju prognoze";
    $("humidity").textContent = "--%";
    $("wind").textContent = "-- km/h";
    $("pressure").textContent = "---- hPa";
    $("iconMain").removeAttribute("src");
    $("forecast").innerHTML = "";
    setUpdatedLabel();

    // Skrati poruku da ne ruži signage
    const msg = String(err?.message || err);
    setError(msg.replace(/\s+/g, " ").slice(0, 140));
  }
}

function capitalizeFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// init
loadAndRender();
setInterval(loadAndRender, REFRESH_MIN * 60 * 1000);
