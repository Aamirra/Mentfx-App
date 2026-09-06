// ---------- Storage ----------
let storage;
try { storage = window.localStorage; storage.setItem('__test', '1'); storage.removeItem('__test'); } catch (e) { storage = { getItem: () => null, setItem: () => {} }; }

// ---------- Watchlists ----------
let watchlists = { 1: ["SYS.PSX", "UBL.PSX", "BTC-USD"], 2: [] };
let activeWatchlist = 1;
let maxWatchlistKey = 2;
const savedWatchlists = storage.getItem('watchlists');
if (savedWatchlists) { try { watchlists = JSON.parse(savedWatchlists); } catch(e) {} }
function saveWatchlists() { storage.setItem('watchlists', JSON.stringify(watchlists)); }

// ---------- UI Toggles ----------
function toggleLongShort() {
    const label = document.getElementById('long-short-label');
    const switchBtn = document.getElementById('long-short-switch');
    switchBtn.classList.toggle('short');
    label.classList.toggle('short');
    label.textContent = switchBtn.classList.contains('short') ? 'SHORT' : 'LONG';
}

function setScenario(btn, name) {
    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ---------- Context Menu for Watchlist Tabs ----------
let contextTargetKey = null;
document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'BUTTON' && e.target.parentElement.id === 'dynamic-wl-buttons') {
        e.preventDefault();
        contextTargetKey = parseInt(e.target.textContent);
        const menu = document.getElementById('context-menu');
        menu.style.display = 'block';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
    }
});
document.addEventListener('click', function(e) {
    const menu = document.getElementById('context-menu');
    if (menu && !menu.contains(e.target)) menu.style.display = 'none';
});

document.getElementById('ctx-delete').addEventListener('click', function() {
    if (contextTargetKey !== null) {
        delete watchlists[contextTargetKey];
        saveWatchlists();
        if (activeWatchlist === contextTargetKey) {
            const keys = Object.keys(watchlists).map(Number).sort((a,b) => a-b);
            if (keys.length > 0) switchWatchlist(keys[keys.length-1]);
            else { watchlists = { 1: [], 2: [] }; saveWatchlists(); switchWatchlist(1); }
        }
        renderDynamicButtons();
        renderWatchlist();
    }
    contextTargetKey = null;
    document.getElementById('context-menu').style.display = 'none';
});

// ---------- Symbol Context Menu (Right-click on watchlist rows) ----------
let contextSymbol = null;

document.addEventListener('contextmenu', function(e) {
    const row = e.target.closest('#watchlist-body tr');
    if (row) {
        e.preventDefault();
        const symbolCell = row.cells[0];
        contextSymbol = symbolCell.textContent.trim();
        const menu = document.getElementById('symbol-context-menu');
        menu.style.display = 'block';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
    }
});

document.addEventListener('click', function(e) {
    const menu = document.getElementById('symbol-context-menu');
    if (menu && !menu.contains(e.target)) menu.style.display = 'none';
});

document.getElementById('ctx-delete-symbol').addEventListener('click', function() {
    if (contextSymbol) {
        removeFromWatchlist(contextSymbol);
        contextSymbol = null;
    }
    document.getElementById('symbol-context-menu').style.display = 'none';
});

// ---------- Create New Watchlist ----------
function createNewWatchlist() {
    const nextKey = maxWatchlistKey + 1;
    if (nextKey > 10) return;
    watchlists[nextKey] = [];
    saveWatchlists();
    renderDynamicButtons();
    switchWatchlist(nextKey);
}

// ---------- Dynamic Buttons ----------
function renderDynamicButtons() {
    const container = document.getElementById('dynamic-wl-buttons');
    container.innerHTML = '';
    const keys = Object.keys(watchlists).map(Number).sort((a, b) => a - b);
    maxWatchlistKey = keys.length > 0 ? keys[keys.length - 1] : 2;
    keys.forEach(key => {
        if (key > 2) {
            const btn = document.createElement('button');
            btn.textContent = key;
            btn.onclick = () => switchWatchlist(key);
            if (key === activeWatchlist) btn.classList.add('active');
            container.appendChild(btn);
        }
    });
    document.getElementById('wl-add-btn').style.display = maxWatchlistKey >= 10 ? 'none' : 'block';
}

// ---------- Switch Watchlist ----------
function switchWatchlist(num) {
    activeWatchlist = num;
    const allButtons = document.querySelectorAll('.watchlist-tabs button');
    allButtons.forEach(btn => {
        if (btn.textContent === String(num)) btn.classList.add('active');
        else if (btn.textContent !== '+') btn.classList.remove('active');
    });
    renderWatchlist();
}

// ---------- Resizer ----------
const resizer = document.getElementById('watchlist-resizer');
const watchlistContainer = document.getElementById('watchlist-body-container');
const savedHeight = storage.getItem('watchlistHeight');
watchlistContainer.style.height = savedHeight ? savedHeight + 'px' : '200px';

resizer.addEventListener('mousedown', function(e) {
    e.preventDefault(); 
    e.stopPropagation();
    resizer.classList.add('active');
    document.body.style.userSelect = 'none';
    let startY = e.clientY;
    let startHeight = watchlistContainer.offsetHeight;
    function onMouseMove(e) {
        let newHeight = startHeight + (e.clientY - startY);
        if (newHeight < 50) newHeight = 50;
        if (newHeight > window.innerHeight - 100) newHeight = window.innerHeight - 100;
        watchlistContainer.style.height = newHeight + 'px';
    }
    function onMouseUp() {
        resizer.classList.remove('active');
        document.body.style.userSelect = '';
        storage.setItem('watchlistHeight', watchlistContainer.offsetHeight);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

// ---------- Heatmap Toggle ----------
const heatmapContainer = document.getElementById('heatmap-container');
const heatmapBtn = document.getElementById('heatmap-toggle-btn');
function toggleHeatmap() {
    heatmapContainer.classList.toggle('collapsed');
    try {
        const newWidth = Math.max(300, window.innerWidth - 320);
        const newHeight = heatmapContainer.classList.contains('collapsed')
            ? Math.max(200, window.innerHeight - 50)
            : Math.max(200, window.innerHeight - 120 - 50);
        if (typeof chart !== 'undefined' && chart) {
            chart.applyOptions({ width: newWidth, height: newHeight });
        }
        if (heatmapContainer.classList.contains('collapsed')) {
            heatmapBtn.innerHTML = '▲';
            heatmapBtn.style.bottom = '5px';
        } else {
            heatmapBtn.innerHTML = '▼';
            heatmapBtn.style.bottom = '120px';
        }
    } catch(e) { console.log("Chart not ready"); }
}

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

async function fetchQuotes(symbols) {
  try {
    const query = symbols.join(',');
    const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Batch quotes error', error);
    return await Promise.all(symbols.map(fetchQuote));
  }
}

// ---------- Add/Remove Watchlist ----------
function addToWatchlist(symbol) {
    if (!watchlists[activeWatchlist].includes(symbol)) {
        watchlists[activeWatchlist].push(symbol);
        saveWatchlists();
        renderWatchlist();
    }
}

function removeFromWatchlist(symbol) {
    watchlists[activeWatchlist] = watchlists[activeWatchlist].filter(s => s !== symbol);
    saveWatchlists();
    renderWatchlist();
}

// ---------- Render Functions ----------
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

// ---------- Drag & Drop (Screener → Watchlist) ----------
let draggedSymbol = null;

function dragSymbol(event, symbol) {
    draggedSymbol = symbol;
    event.dataTransfer.setData('text/plain', symbol);
    event.dataTransfer.effectAllowed = 'copy';
}

const watchlistBodyContainer = document.getElementById('watchlist-body-container');
watchlistBodyContainer.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    this.classList.add('drag-over');
});

watchlistBodyContainer.addEventListener('dragleave', function(e) {
    this.classList.remove('drag-over');
});

watchlistBodyContainer.addEventListener('drop', function(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const symbol = e.dataTransfer.getData('text/plain') || draggedSymbol;
    if (symbol) {
        addToWatchlist(symbol);
        draggedSymbol = null;
    }
});

// ---------- Drag & Drop (Watchlist → Chart area for deletion) ----------
function dragWatchSymbol(event, symbol) {
    event.dataTransfer.setData('text/plain', symbol);
    event.dataTransfer.effectAllowed = 'move';
}

const chartArea = document.getElementById('chart-area');
chartArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
});

chartArea.addEventListener('drop', function(e) {
    e.preventDefault();
    const symbol = e.dataTransfer.getData('text/plain');
    if (symbol) {
        removeFromWatchlist(symbol);
    }
});

// ---------- Chart Init (try-catch wrapped) ----------
let chart = null;
let candleSeries = null;
try {
    const chartWidth = Math.max(300, window.innerWidth - 320);
    const chartHeight = Math.max(200, window.innerHeight - 120 - 50);
    chart = LightweightCharts.createChart(document.getElementById('chart'), {
        width: chartWidth,
        height: chartHeight,
        layout: { background: { type: 'solid', color: '#0e1117' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
        timeScale: { timeVisible: true, secondsVisible: false }
    });
    candleSeries = chart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false });
} catch(e) {
    console.log("Chart init failed:", e);
}

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

// ---------- Category Change ----------
const categoryDropdown = document.getElementById('asset-category');
categoryDropdown.addEventListener('change', function() {
    const selected = this.value;
    if (selected === 'psx') currentSymbols = psxList;
    else if (selected === 'crypto') currentSymbols = cryptoList;
    else if (selected === 'forex') currentSymbols = forexList;
    else if (selected === 'indices') currentSymbols = indicesList;
    updateTables();
    if (currentSymbols.length > 0) loadChart(currentSymbols[0]);
});

// ---------- Initial Load ----------
renderDynamicButtons();
updateTables();
loadChart(psxList[0]);

// ---------- Auto Refresh (every 30 sec) ----------
setInterval(async () => {
    await updateTables();
}, 30000);

// ---------- Resize Handler ----------
window.addEventListener('resize', () => {
    try {
        if (chart) {
            const newWidth = Math.max(300, window.innerWidth - 320);
            const newHeight = heatmapContainer.classList.contains('collapsed')
                ? Math.max(200, window.innerHeight - 50)
                : Math.max(200, window.innerHeight - 120 - 50);
            chart.applyOptions({ width: newWidth, height: newHeight });
        }
    } catch(e) {
        console.log("Resize error:", e);
    }
});
