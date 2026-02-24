// ====== CONFIG ======
const OPENWEATHER_KEY = "8edbd4ecf027fb7bd3f516b2d658fbd9";

// Zlatibor (približno). Ako hoćeš tačne koordinate hotela -> zameni.
const LAT = 43.7286;
const LON = 19.7000;

const REFRESH_MIN = 10; // refresh na 10 min

// ====== HELPERS ======
const $ = (id) => document.getElementById(id);

function toKmH(ms){ return Math.round(ms * 3.6); }

function formatUpdated(dt){
  const d = new Date(dt);
  const pad = (n)=> String(n).padStart(2,"0");
  return `Ažurirano: ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setLoadingState(msg="Učitavanje prognoze…"){
  $("desc").textContent = msg;
  $("temp").textContent = "--°C";
  $("hum").textContent = "--%";
  $("wind").textContent = "-- km/h";
  $("press").textContent = "---- hPa";
  $("forecast").innerHTML = "";
  $("icon").removeAttribute("src");
}

function setErrorState(msg="Vreme trenutno nije dostupno"){
  $("desc").textContent = msg;
  $("updated").textContent = "—";
}

// ====== FETCH ======
async function fetchWeather(){
  if(!OPENWEATHER_KEY || OPENWEATHER_KEY.includes("PASTE_")){
    setErrorState("API key nije podešen");
    return;
  }

  const currentUrl =
    `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}&units=metric&lang=sr`;

  const forecastUrl =
    `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}&units=metric&lang=sr`;

  try{
    setLoadingState();

    const [cRes, fRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    if(!cRes.ok || !fRes.ok) throw new Error("Bad response");

    const current = await cRes.json();
    const forecast = await fRes.json();

    // CURRENT
    $("place").textContent = current.name || "Zlatibor";
    $("temp").textContent = `${Math.round(current.main.temp)}°C`;
    $("desc").textContent = current.weather?.[0]?.description ?? "—";
    $("hum").textContent = `${Math.round(current.main.humidity)}%`;
    $("wind").textContent = `${toKmH(current.wind.speed)} km/h`;
    $("press").textContent = `${Math.round(current.main.pressure)} hPa`;

    const iconCode = current.weather?.[0]?.icon;
    if(iconCode){
      $("icon").src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
      $("icon").alt = current.weather?.[0]?.main || "";
    }

    $("updated").textContent = formatUpdated(Date.now());

    // FORECAST: iz 3-satnih blokova vadimo 3 naredna dana oko 12:00
    const byDay = new Map();
    for(const item of forecast.list){
      const dt = new Date(item.dt * 1000);
      const dayKey = dt.toISOString().slice(0,10);
      const hour = dt.getHours();
      // ciljamo 12h (ili najbliže)
      const score = Math.abs(hour - 12);
      if(!byDay.has(dayKey) || score < byDay.get(dayKey).score){
        byDay.set(dayKey, { score, item });
      }
    }

    const days = Array.from(byDay.values())
      .map(x => x.item)
      .slice(0, 3); // 3 dana

    const dow = ["Ned","Pon","Uto","Sre","Čet","Pet","Sub"];

    $("forecast").innerHTML = days.map(d => {
      const dt = new Date(d.dt * 1000);
      const icon = d.weather?.[0]?.icon;
      const tmin = Math.round(d.main.temp_min);
      const tmax = Math.round(d.main.temp_max);
      return `
        <div class="day">
          <div class="dow">${dow[dt.getDay()]}</div>
          ${icon ? `<img class="ficon" alt="" src="https://openweathermap.org/img/wn/${icon}.png">` : ``}
          <div class="minmax">${tmin}° / ${tmax}°</div>
        </div>
      `;
    }).join("");

  }catch(e){
    setErrorState("Greška pri učitavanju prognoze");
  }
}

fetchWeather();

setInterval(fetchWeather, REFRESH_MIN * 60 * 1000);

