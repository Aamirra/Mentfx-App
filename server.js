const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(__dirname));

// Favicon handle
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Fallback mock data generator (agar Yahoo par data nahi hai)
function getMockQuote(symbol) {
  const last = Math.random() * 1000 + 10;
  const chg = (Math.random() - 0.5) * 10;
  const vol = Math.floor(Math.random() * 5000000) + 100000;
  return { sym: symbol, last, chg, vol };
}

function getMockCandles(symbol) {
  const candles = [];
  let price = Math.random() * 200 + 50;
  const today = new Date();
  for (let i = 100; i >= 0; i--) {
    const time = today.getTime() / 1000 - i * 86400;
    const open = price;
    const change = (Math.random() - 0.5) * 5;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    candles.push({ time, open, high, low, close });
    price = close;
  }
  return candles;
}

// API: Single quote (with fallback)
app.get('/api/quote/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`);
    const data = await response.json();
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.log(`No Yahoo data for ${symbol}, using mock`);
      return res.json(getMockQuote(symbol));
    }
    const meta = data.chart.result[0].meta;
    const quote = {
      sym: symbol,
      last: meta.regularMarketPrice,
      chg: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      vol: meta.regularMarketVolume
    };
    res.json(quote);
  } catch (error) {
    console.error(`Error fetching quote ${symbol}:`, error.message);
    res.json(getMockQuote(symbol));
  }
});

// API: Candles (with fallback)
app.get('/api/candles/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`);
    const data = await response.json();
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.log(`No Yahoo candles for ${symbol}, using mock`);
      return res.json(getMockCandles(symbol));
    }
    const result = data.chart.result[0];
    const candles = result.timestamp.map((time, index) => ({
      time,
      open: result.indicators.quote[0].open[index],
      high: result.indicators.quote[0].high[index],
      low: result.indicators.quote[0].low[index],
      close: result.indicators.quote[0].close[index]
    }));
    res.json(candles);
  } catch (error) {
    console.error(`Error fetching candles ${symbol}:`, error.message);
    res.json(getMockCandles(symbol));
  }
});

// API: Batch quotes (with fallback for each symbol)
app.get('/api/quotes', async (req, res) => {
  const symbols = req.query.symbols?.split(',').filter(s => s);
  if (!symbols || symbols.length === 0) {
    return res.status(400).json({ error: 'No symbols provided' });
  }
  try {
    const results = await Promise.all(symbols.map(async (sym) => {
      try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1mo`);
        const data = await response.json();
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          console.log(`No Yahoo data for ${sym}, using mock`);
          return getMockQuote(sym);
        }
        const meta = data.chart.result[0].meta;
        return {
          sym,
          last: meta.regularMarketPrice,
          chg: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
          vol: meta.regularMarketVolume
        };
      } catch (err) {
        console.error(`Error fetching ${sym}, using mock:`, err.message);
        return getMockQuote(sym);
      }
    }));
    res.json(results);
  } catch (error) {
    console.error('Batch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
