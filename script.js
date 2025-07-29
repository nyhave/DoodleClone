document.getElementById('clickMe').addEventListener('click', () => {
  alert('Button clicked!');
});

const portfolioData = [
  { ticker: 'AMZN', weight: 7.0, amount: 105000 },
  { ticker: 'AXP', weight: 7.0, amount: 105000 },
  { ticker: 'C', weight: 5.25, amount: 78750 },
  { ticker: 'GE', weight: 6.0, amount: 90000 },
  { ticker: 'GOOG', weight: 7.7, amount: 115500 },
  { ticker: 'GS', weight: 5.0, amount: 75000 },
  { ticker: 'IAG.L', weight: 6.4, amount: 96000 },
  { ticker: 'JPM', weight: 5.42, amount: 81300 },
  { ticker: 'META', weight: 5.92, amount: 88800 },
  { ticker: 'MSFT', weight: 7.29, amount: 109350 },
  { ticker: 'NFLX', weight: 9.25, amount: 138750 },
  { ticker: 'NVDA', weight: 3.09, amount: 46350 },
  { ticker: 'PLTR', weight: 5.18, amount: 77700 },
  { ticker: 'RR.L', weight: 6.28, amount: 94200 },
  { ticker: 'SNOW', weight: 6.88, amount: 103200 },
  { ticker: 'Cash', weight: 6.34, amount: 95100 }
];

function renderPortfolio() {
  const container = document.getElementById('portfolio');
  if (!container) return;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headerRow = document.createElement('tr');
  ['Ticker', 'Weight (%)', 'Amount (DKK)'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  portfolioData.forEach(item => {
    const tr = document.createElement('tr');
    const tdTicker = document.createElement('td');
    tdTicker.textContent = item.ticker;
    const tdWeight = document.createElement('td');
    tdWeight.textContent = item.weight.toFixed(2);
    const tdAmount = document.createElement('td');
    tdAmount.textContent = item.amount.toLocaleString();
    tr.append(tdTicker, tdWeight, tdAmount);
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  container.appendChild(table);
}

// Render the portfolio table when the page loads
renderPortfolio();

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
