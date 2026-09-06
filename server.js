const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));

// API proxy for Yahoo Finance (example)
app.get('/api/quote/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
