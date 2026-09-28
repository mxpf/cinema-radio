// Only bundled content can access RadioNative; Android owns all audio and timers.
(() => {
  if (!window.RadioNative) return;
  const send = (action, value) => RadioNative.postMessage(JSON.stringify({action, value}));
  const drawSleep = updateSleep;
  startListening = () => send('power', true);
  stop = () => send('power', false);
  setStation = index => send('station', Math.max(0, Math.min(stations.length - 1, index)));
  setRing = (control, fraction) => {
    fraction = Math.max(0, Math.min(1, fraction));
    if (control === sleepButton) send('sleep', Math.round(fraction * 60));
    else send('volume', Math.round(fraction * 100) / 100);
  };
  // Some shared listeners retain the original tick callback. Never let those
  // start a second, browser-owned player after a native state update.
  join = async () => {};
  prepareNext = () => {};
  tick = () => send('state');
  window.renderNativeRadio = state => {
    listening = state.powered;
    stationIndex = state.station;
    baseVolume = state.volume;
    sleepDeadline = 0;
    sleepMinutes = state.sleepSeconds / 60;
    document.body.classList.toggle('powered', state.powered);
    document.body.classList.toggle('playing', state.playing);
    setBuffering(state.powered && !state.playing && !state.error);
    button.setAttribute('aria-pressed', String(state.powered));
    button.setAttribute('aria-label', state.powered ? 'Turn radio off' : 'Turn radio on');
    updateStation();
    drawSleep();
    const track = tracks.find(t => t.slug === state.slug);
    if (track) display({track});
    status.textContent = state.error || '';
    fitTitle();
  };
  const css = document.createElement('style');
  css.textContent = '.download-link,#solar-location{display:none!important}';
  document.head.appendChild(css);
  document.querySelectorAll('a[href*="/releases/"]').forEach(a => a.remove());
  // Drop any browser audio. The original script never powers itself on.
  pauseDecks();
  setInterval(tick, 500);
  tick();
})();
