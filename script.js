document.getElementById('clickMe').addEventListener('click', () => {
  alert('Button clicked!');
});

const exchangeCosts = {
  ny: 0.001,        // New York: 0.1%
  london: 0.005,    // London: 0.5%
  tokyo: 0.002,     // Tokyo: 0.2%
  frankfurt: 0.0015 // Frankfurt: 0.15%
};

function calculateCost() {
  const amount = parseFloat(document.getElementById('amount').value);
  const exchange = document.getElementById('exchange').value;
  if (isNaN(amount)) {
    alert('Please enter a valid amount');
    return;
  }
  const rate = exchangeCosts[exchange] || 0;
  const cost = amount * rate;
  document.getElementById('costOutput').textContent =
    `Transaction cost: ${cost.toFixed(2)}`;
}

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
document.getElementById('calcCost').addEventListener('click', calculateCost);
