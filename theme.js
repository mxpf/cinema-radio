// Use the listener's local wall clock; station schedules remain anchored to UTC.
(() => {
  function updateTheme() {
    const hour = new Date().getHours();
    const theme = hour >= 7 && hour < 19 ? 'day' : 'night';
    if (document.documentElement.dataset.timeTheme !== theme) {
      document.documentElement.dataset.timeTheme = theme;
    }
  }
  updateTheme();
  setInterval(updateTheme, 60000);
  window.addEventListener('pageshow', updateTheme);
  document.addEventListener('visibilitychange', updateTheme);
})();
