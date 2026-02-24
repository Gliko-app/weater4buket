// ====== OPENWEATHER KEY (UBACI OVDE) ======
const OPENWEATHER_KEY = "8edbd4ecf027fb7bd3f516b2d658fbd9";

// Lokacija (Zlatibor - možeš promeniti)
const LAT = 43.7286;
const LON = 19.7000;

// Refresh na 10 minuta
const REFRESH_MIN = 10;

// --- DOM helpers ---
const $ = (id) => document.getElementById(id);

// --- Serbian latin day labels ---
const DAY3 = ["NED", "PON", "UTO", "SRE", "ČET", "PET", "SUB"];

// --- Cyrillic -> Latin transliteration (da opis ne bude ćirilica) ---
const c2lMap = {
  "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","Љ":"Lj","М":"M","Н":"N","Њ":"Nj","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Џ":"Dž","Ш":"Š",
  "а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"
};
function cyrToLat(str=""){
  return str.split("").map(ch => c2lMap[ch] ?? ch).join("");
}

function toKmH(ms){ return Math.round(ms * 3.6); }

function fmtUpdated(tsSec){
  const d = new Date(tsSec * 1000);
  const pad = (n)=> String(n).padStart(2,"0");
  return `Ažurirano: ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function iconUrl(iconCode){
  const map = {
    "01d": "sun",
    "01n": "moon",

    "02d": "cloud-sun",
    "02n": "cloud-moon",

    "03d": "cloud",
    "03n": "cloud",

    "04d": "cloud",
    "04n": "cloud",

    "09d": "cloud-drizzle",
    "09n": "cloud-drizzle",

    "10d": "cloud-rain",
    "10n": "cloud-rain",

    "11d": "cloud-lightning",
    "11n": "cloud-lightning",

    "13d": "cloud-snow",
    "13n": "cloud-snow",

    "50d": "cloud-fog",
    "50n": "cloud-fog"
  };

  const icon = map[iconCode] || "cloud";

  return `https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/fill/svg/${icon}.svg`;
}

function setError(msg){
  const e = $("error");
  e.hidden = !msg;
  e.textContent = msg || "";
}

function setLoading(){
  setError("");
  $("desc").textContent = "Učitavanje...";
  $("temp").textContent = "--°C";
  $("humidity").textContent = "--%";
  $("wind").textContent = "-- km/h";
  $("pressure").textContent = "---- hPa";
  $("updated").textContent = "";
  $("icon").src = "";
}

async function fetchJson(url){
  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok){
    const t = await r.text().catch(()=> "");
    throw new Error(`HTTP ${r.status} ${r.statusText} ${t}`.slice(0, 240));
  }
  return r.json();
}

function pickNext3DaysFromForecast(list){
  // list = 3h forecast; biramo po jedan entry oko 12:00 lokalno za naredna 3 dana
  const byDate = new Map();

  for (const item of list){
    const d = new Date(item.dt * 1000);
    const key = d.toISOString().slice(0,10); // YYYY-MM-DD (UTC key)
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(item);
  }

  // uzmi naredne dane (preskoči “danas” ako je već kasno — ali ok i danas ako nema drugih)
  const keys = Array.from(byDate.keys()).sort();

  const now = new Date();
  const todayKey = now.toISOString().slice(0,10);

  const futureKeys = keys.filter(k => k >= todayKey).slice(0, 4); // today + 3
  // hoćemo 3 dana unapred (najčešće sutra+2), ali ako nema dovoljno uzmi što ima
  const take = futureKeys.length >= 4 ? futureKeys.slice(1,4) : futureKeys.slice(0,3);

  const result = [];

  for (const k of take){
    const items = byDate.get(k) || [];
    // nađi najbliži 12:00
    let best = items[0];
    let bestDiff = Infinity;
    for (const it of items){
      const h = new Date(it.dt * 1000).getHours();
      const diff = Math.abs(h - 12);
      if (diff < bestDiff){
        bestDiff = diff;
        best = it;
      }
    }
    // izračunaj min/max tog dana iz svih slotova
    let min = Infinity, max = -Infinity;
    for (const it of items){
      min = Math.min(min, it.main.temp_min);
      max = Math.max(max, it.main.temp_max);
    }

    result.push({
      dt: best.dt,
      icon: best.weather?.[0]?.icon || "03d",
      temp: best.main?.temp,
      min, max
    });
  }

  return result;
}

function renderForecast(days){
  const wrap = $("forecast");
  wrap.innerHTML = "";

  for (const d of days){
    const dd = new Date(d.dt * 1000);
    const dayName = DAY3[dd.getDay()];

    const card = document.createElement("div");
    card.className = "fcard";

    const top = document.createElement("div");
    top.className = "fday";
    top.textContent = dayName;

    const row = document.createElement("div");
    row.className = "frow";

    const img = document.createElement("img");
    img.className = "ficon";
    img.alt = "Ikonica";
    img.src = iconUrl(d.icon);

    const t = document.createElement("div");
    t.className = "ftemp";
    t.textContent = `${Math.round(d.temp)}°C`;

    row.appendChild(img);
    row.appendChild(t);

    const mm = document.createElement("div");
    mm.className = "fminmax";
    mm.textContent = `${Math.round(d.min)}° / ${Math.round(d.max)}°`;

    card.appendChild(top);
    card.appendChild(row);
    card.appendChild(mm);

    wrap.appendChild(card);
  }
}

async function loadWeather(){
  if(!OPENWEATHER_KEY || OPENWEATHER_KEY.includes("PASTE_")){
    setError("API key nije podešen (ubaci ga u app.js).");
    return;
  }

  setLoading();

  // Namerno lang=sr da dobijemo srpski opis, pa ga transliterujemo u latinicu.
  const base = "https://api.openweathermap.org/data/2.5";
  const q = `lat=${LAT}&lon=${LON}&appid=${encodeURIComponent(OPENWEATHER_KEY)}&units=metric&lang=sr`;

  try{
    const [current, forecast] = await Promise.all([
      fetchJson(`${base}/weather?${q}`),
      fetchJson(`${base}/forecast?${q}`)
    ]);

    const temp = Math.round(current.main.temp);
    const hum = Math.round(current.main.humidity);
    const wind = toKmH(current.wind.speed);
    const pres = Math.round(current.main.pressure);

    const descRaw = current.weather?.[0]?.description || "";
    const descLat = cyrToLat(descRaw);
    const icon = current.weather?.[0]?.icon || "03d";

    $("temp").textContent = `${temp}°C`;
    $("humidity").textContent = `${hum}%`;
    $("wind").textContent = `${wind} km/h`;
    $("pressure").textContent = `${pres} hPa`;
    $("desc").textContent = descLat ? (descLat[0].toUpperCase() + descLat.slice(1)) : "-";
    $("updated").textContent = fmtUpdated(current.dt);
    $("icon").src = iconUrl(icon);

    const next3 = pickNext3DaysFromForecast(forecast.list || []);
    renderForecast(next3);

    setError("");
  }catch(err){
    console.error(err);
    setError("Greška pri učitavanju prognoze.");
  }
}

loadWeather();
setInterval(loadWeather, REFRESH_MIN * 60 * 1000);

