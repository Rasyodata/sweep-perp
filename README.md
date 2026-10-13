# Sweep Perp

On-chain perpetual futures — paper trading on real Binance prices. Trade with up to
1000× leverage (Long/Short), advanced orders (Limit / Stop / Scale / TWAP + TP/SL and
chart trailing), a live order book and trade feed, candle/tick charts, a global
leaderboard with copy-trading, daily tasks & XP, and challenge → funded accounts.

> Paper trading only — balances and trades are virtual, no real funds are used.

## Run

```bash
npm install
npm start
# open http://localhost:3300
```

Requires Node 20+. The server binds `process.env.PORT` (defaults to 3300).

## Deploy

A `render.yaml` blueprint is included for Render (Node web service, `npm install` /
`npm start`).
