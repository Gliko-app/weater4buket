// ====== OPENWEATHER KEY (UBACI OVDE) ======
const OPENWEATHER_KEY = "PASTE_YOUR_KEY_HERE";

// Lokacija (Zlatibor - možeš promeniti)
const LAT = 43.7286;
const LON = 19.7000;

// Refresh na 10 minuta
const REFRESH_MIN = 10;

const $ = (id) => document.getElementById(id);

// Serbian latin day labels
const DAY3 = ["NED", "PON", "UTO", "SRE", "ČET", "PET", "SUB"];

// Cyrillic -> Latin transliteration (da opis ne bude ćirilica)
const c2lMap = {
  "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","Љ":"Lj","М":"M","Н":"N","Њ":"Nj","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Џ":"Dž","Ш":"Š",
  "а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"
};
function cyrToLat(str=""){ return str.split("").map(ch => c2lMap[ch] ?? ch).join(""); }

function toKmH(ms){ return Math.round(ms * 3.6); }

function fmtUpdated(tsSec){
  const d = new Date(tsSec * 1000);
  const pad = (n)=> String(n).padStart(2,"0");
  return `Ažurirano: ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// OpenWeather icons (pouzdano). @2x postoji, uvećamo ga CSS-om.
function iconUrl(iconCode){
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
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

// Background “wow” po vremenu + dan/noć
function setWowBackground(iconCode){
  const bg = document.querySelector(".bg");
  if(!bg) return;

  const isNight = iconCode?.endsWith("n");

  // grupa po vremenu
  const group =
    iconCode?.startsWith("01") ? "clear" :
    iconCode?.startsWith("02") ? "partly" :
    (iconCode?.startsWith("03") || iconCode?.startsWith("04")) ? "cloudy" :
    (iconCode?.startsWith("09") || iconCode?.startsWith("10")) ? "rain" :
    iconCode?.startsWith("11") ? "storm" :
    iconCode?.startsWith("13") ? "snow" :
    iconCode?.startsWith("50") ? "fog" : "cloudy";

  // ručno podešeni “premium” gradijenti
  const palettes = {
    clear: isNight
      ? "radial-gradient(700px 340px at 30% 30%, rgba(120,170,255,.35) 0%, rgba(40,90,210,.22) 35%, rgba(10,18,40,1) 100%)"
      : "radial-gradient(700px 340px at 28% 30%, rgba(255,220,120,.65) 0%, rgba(255,150,70,.28) 36%, rgba(30,120,255,.16) 66%, rgba(10,18,40,1) 100%)",
    partly: isNight
      ? "radial-gradient(700px 340px at 28% 30%, rgba(120,170,255,.35) 0%, rgba(60,100,220,.22) 38%, rgba(10,18,40,1) 100%)"
      : "radial-gradient(700px 340px at 28% 30%, rgba(255,210,120,.55) 0%, rgba(255,150,70,.22) 36%, rgba(60,140,255,.18) 70%, rgba(10,18,40,1) 100%)",
    cloudy: isNight
      ? "radial-gradient(700px 340px at 30% 30%, rgba(120,160,220,.22) 0%, rgba(40,70,150,.20) 40%, rgba(10,18,40,1) 100%)"
      : "radial-gradient(700px 340px at 30% 30%, rgba(200,220,255,.28) 0%, rgba(90,140,220,.18) 45%, rgba(10,18,40,1) 100%)",
    rain: isNight
      ? "radial-gradient(700px 340px at 35% 30%, rgba(120,170,255,.22) 0%, rgba(30,60,140,.22) 42%, rgba(10,18,40,1) 100%)"
      : "radial-gradient(700px 340px at 35% 30%, rgba(160,210,255,.28) 0%, rgba(70,140,240,.20) 42%, rgba(10,18,40,1) 100%)",
    storm: isNight
      ? "radial-gradient(700px 340px at 35% 30%, rgba(160,120,255,.18) 0%, rgba(30,40,120,.22) 48%, rgba(10,18,40,1) 100%)"
      : "radial-gradient(700px 340px at 35% 30%, rgba(190,170,255,.22) 0%, rgba(80,110,230,.20) 48%, rgba(10,18,40,1) 100%)",
    snow: isNight
      ? "radial-gradient(700px 340px at 30% 30%, rgba(200,230,255,.22) 0%, rgba(60,100,200,.18) 50%, rgba(10,18,40,1) 100%)"
      : "radial-gradient(700px 340px at 30% 30%, rgba(240,250,255,.34) 0%, rgba(120,170,230,.18) 55%, rgba(10,18,40,1) 100%)",
    fog: isNight
      ? "radial-gradient(700px 340px at 30% 30%, rgba(180,200,220,.16) 0%, rgba(40,60,120,.20) 50%, rgba(10,18,40,1) 100%)"
      : "radial-gradient(700px 340px at 30% 30%, rgba(220,230,245,.22) 0%, rgba(120,150,200,.16) 55%, rgba(10,18,40,1) 100%)",
  };

  bg.style.background = palettes[group] || palettes.cloudy;
}

function pickNext3DaysFromForecast(list){
  // 3h forecast; uzmi po jedan slot najbliži 12:00 za naredna 3 dana (sutra +2)
  const byDate = new Map();

  for (const item of list){
    const d = new Date(item.dt * 1000);
    const key = d.toISOString().slice(0,10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(item);
  }

  const keys = Array.from(byDate.keys()).sort();
  const todayKey = new Date().toISOString().slice(0,10);

  const futureKeys = keys.filter(k => k >= todayKey).slice(0, 4); // today + 3
  const take = futureKeys.length >= 4 ? futureKeys.slice(1,4) : futureKeys.slice(0,3);

  const result = [];
  for (const k of take){
    const items = byDate.get(k) || [];
    if (!items.length) continue;

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

    const niceDesc = descLat ? (descLat[0].toUpperCase() + descLat.slice(1)) : "-";
    $("desc").textContent = niceDesc;

    $("updated").textContent = fmtUpdated(current.dt);
    $("icon").src = iconUrl(icon);

    setWowBackground(icon);

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
