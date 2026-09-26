// Location stays in this browser. Solar calculations use the bundled SunCalc 2.0.2.
(() => {
  const key = 'cinema-radio-solar-location';
  const preview = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(window.location?.search || '').get('appearance') : null;
  let location = null, button = null, status = null, messageTimer;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Number.isFinite(saved.lat) && Math.abs(saved.lat)<=90 && Number.isFinite(saved.lng) && Math.abs(saved.lng)<=180) location=saved;
  } catch {}
  const clock = date => date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  function updateTheme() {
    const now = new Date();
    let day = now.getHours() >= 7 && now.getHours() < 19;
    let title = 'Use my location for sunrise and sunset. Approximate location is saved only in this browser.';
    if (location && typeof SunCalc !== 'undefined') {
      const times = SunCalc.getTimes(now, location.lat, location.lng);
      if (times.alwaysUp) {day=true;title='Following local polar daylight.';}
      else if (times.alwaysDown) {day=false;title='Following local polar night.';}
      else if (times.sunrise && times.sunset && Number.isFinite(+times.sunrise) && Number.isFinite(+times.sunset)) {
        day = now >= times.sunrise && now < times.sunset;
        title = 'Sunrise '+clock(times.sunrise)+' · Sunset '+clock(times.sunset)+'.';
      }
      title += ' Click to turn off and forget this location.';
    }
    document.documentElement.dataset.timeTheme = ['day','night'].includes(preview) ? preview : (day ? 'day' : 'night');
    if (button) {
      button.setAttribute('aria-pressed',String(Boolean(location)));
      button.setAttribute('aria-label',location?'Turn off location-based day and night mode':'Use my location for sunrise and sunset');
      button.title=title;
    }
  }
  function announce(text) {
    if(!status)return;
    status.textContent=text;status.hidden=false;
    clearTimeout(messageTimer);messageTimer=setTimeout(()=>{status.hidden=true;},9000);
  }
  function connectButton() {
    button=document.getElementById('solar-location');status=document.getElementById('solar-status');
    if(!button)return;
    updateTheme();
    button.addEventListener('click',()=>{
      if(location){
        location=null;try{localStorage.removeItem(key);}catch{}
        updateTheme();announce('Location forgotten. Using 7 a.m.–7 p.m.');return;
      }
      if(!navigator.geolocation){announce('Location isn’t available here. Using 7 a.m.–7 p.m.');return;}
      button.disabled=true;button.setAttribute('aria-busy','true');
      announce('Allow location to follow your sunrise and sunset.');
      const done=()=>{button.disabled=false;button.removeAttribute('aria-busy');};
      navigator.geolocation.getCurrentPosition(position=>{
        done();
        const {latitude,longitude}=position.coords;
        if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180){announce('Couldn’t read that location. Using 7 a.m.–7 p.m.');return;}
        // A coarse location is sufficient; discard the precise browser coordinates.
        location={lat:Math.round(latitude*10)/10,lng:Math.round(longitude*10)/10};
        try{localStorage.setItem(key,JSON.stringify(location));}catch{}
        updateTheme();announce('Following local sunrise and sunset. Click again to turn off.');
      },error=>{
        done();updateTheme();announce(error.code===1?'Location wasn’t allowed. Using 7 a.m.–7 p.m.':'Couldn’t find your location. Try again, or keep 7 a.m.–7 p.m.');
      },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
    });
  }
  updateTheme();
  setInterval(updateTheme,60000);
  window.addEventListener('pageshow',updateTheme);
  document.addEventListener('visibilitychange',updateTheme);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connectButton);else connectButton();
})();
