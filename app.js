// ... (existing code till before "Mock Data Generators")

// ========== LIVE DATA FETCHING ==========
async function fetchQuote(symbol) {
  try {
    const response = await fetch(`/api/quote/${encodeURIComponent(symbol)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Quote error for', symbol, error);
    return { sym: symbol, last: 0, chg: 0, vol: 0 };
  }
}

async function fetchCandles(symbol) {
  try {
    const response = await fetch(`/api/candles/${encodeURIComponent(symbol)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Candles error for', symbol, error);
    return [];
  }
}

// Batch fetch quotes for table updates
async function fetchQuotes(symbols) {
  try {
    const query = symbols.join(',');
    const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Batch quotes error', error);
    // Fallback: fetch individually
    return await Promise.all(symbols.map(fetchQuote));
  }
}

// Update render functions to use live data
async function renderWatchlist() {
  const currentSymbolsList = watchlists[activeWatchlist] || [];
  const stockData = await fetchQuotes(currentSymbolsList);
  let wlHTML = '';
  stockData.forEach(stock => {
    const colorClass = stock.chg > 0 ? 'text-green' : 'text-red';
    wlHTML += `<tr draggable="true" ondragstart="dragWatchSymbol(event, '${stock.sym}')" onclick="loadChart('${stock.sym}')">
      <td>${stock.sym}</td><td>${stock.last.toFixed(2)}</td>
      <td class="${colorClass}">${stock.chg.toFixed(2)}%</td>
    </tr>`;
  });
  document.getElementById('watchlist-body').innerHTML = wlHTML;
}

async function updateTables() {
  const stockData = await fetchQuotes(currentSymbols);
  let scHTML = '';
  stockData.forEach(stock => {
    const chgClass = stock.chg > 0 ? 'bg-green' : 'bg-red';
    scHTML += `<tr draggable="true" ondragstart="dragSymbol(event, '${stock.sym}')" onclick="loadChart('${stock.sym}')">
      <td>${stock.sym}</td><td>${stock.last.toFixed(2)}</td>
      <td class="${chgClass}">${stock.chg.toFixed(2)}%</td>
      <td>${(stock.vol/1000000).toFixed(1)}M</td>
      <td class="btn-add" onclick="event.stopPropagation(); addToWatchlist('${stock.sym}')">+</td>
    </tr>`;
  });
  document.getElementById('screener-table').innerHTML = scHTML;
  renderWatchlist();
}

// Live chart loading
async function loadChart(symbol) {
  try {
    const candles = await fetchCandles(symbol);
    if (candleSeries) {
      candleSeries.setData(candles);
    }
  } catch (error) {
    console.error('Chart loading failed:', error);
  }
}

// Auto-refresh every 30 seconds
let refreshTimer = null;
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    await updateTables();
  }, 30000);
}

// Initial load
renderDynamicButtons();
updateTables();
loadChart(psxList[0]);
startAutoRefresh();
