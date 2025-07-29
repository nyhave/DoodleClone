document.getElementById('clickMe').addEventListener('click', () => {
  alert('Button clicked!');
});

async function clearCacheAndReload() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  // Force reload from the network
  window.location.reload(true);
}

document.getElementById('clearCache').addEventListener('click', clearCacheAndReload);
