const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Yahoo Finance endpoints
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Get quote data (last price, change %, volume)
app.get('/api/quote/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const response = await fetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1mo`);
    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = {
      sym: symbol,
      last: meta.regularMarketPrice,
      chg: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      vol: meta.regularMarketVolume
    };
    res.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get candlestick data for chart
app.get('/api/candles/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const response = await fetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=3mo`);
    const data = await response.json();
    const result = data.chart.result[0];
    const candles = result.timestamp.map((time, index) => ({
      time: time,
      open: result.indicators.quote[0].open[index],
      high: result.indicators.quote[0].high[index],
      low: result.indicators.quote[0].low[index],
      close: result.indicators.quote[0].close[index]
    }));
    res.json(candles);
  } catch (error) {
    console.error('Candles error:', error);
    res.status(500).json({ error: 'Failed to fetch candles' });
  }
});

// Batch quote for multiple symbols
app.get('/api/quotes', async (req, res) => {
  const symbols = req.query.symbols?.split(',').filter(s => s);
  if (!symbols || symbols.length === 0) {
    return res.status(400).json({ error: 'No symbols provided' });
  }
  try {
    const results = await Promise.all(symbols.map(async (sym) => {
      const response = await fetch(`${YAHOO_BASE}/${sym}?interval=1d&range=1mo`);
      const data = await response.json();
      const meta = data.chart.result[0].meta;
      return {
        sym,
        last: meta.regularMarketPrice,
        chg: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
        vol: meta.regularMarketVolume
      };
    }));
    res.json(results);
  } catch (error) {
    console.error('Batch error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
