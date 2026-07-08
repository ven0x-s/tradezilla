# Pugzilla Journal

A local trading journal for NQ / ES futures. Express backend with a file-based JSON
datastore so your data persists on disk and survives reloads (nothing is kept in
fragile browser storage). The frontend is branded **Pugzilla**.

## Requirements

Node.js 18 or newer (includes npm). Check with `node --version`.

## First-time setup

From this folder, run once:

```
npm run setup
```

This installs the backend and frontend dependencies and builds the app.

## Start the app

```
npm start
```

Then open http://localhost:3001 in your browser.

Shortcuts: on Windows double-click `start-windows.bat`; on Mac/Linux run `./start-mac-linux.sh`.
They build on first run if needed, then start the server.

## Features

- Personal login: the first time you open the app you create a username and password.
  Everything (trades, settings, sync) is locked behind that login; only accounts you
  create yourself (from an already-logged-in session) can be added afterwards.
- Log trades with date, time, symbol (NQ/ES quick-select plus free field), direction,
  entry/exit, contracts, stop loss, take profit, commissions, setup tag, model, entry
  model, HTF delivery, session (London/NY/Asia) and notes. Result in points and dollars
  plus R multiple are computed automatically.
- Mark a trade with red-folder news (CPI, NFP, FOMC, PMI, etc, quick-select or free
  text). Filter trades by news event, see a "By news event" breakdown in Analysis, and
  spot news days at a glance with a red dot on the Calendar - all to make it easy to
  look back at how you traded previous red-folder days.
- Trading psychology: tag your emotion at entry and exit (FOMO, Patient, Revenge
  trade, Confident, etc, or type your own), grade the trade yourself, and log a
  mental mistake (moved stop early, overleveraged, strategy not followed, ...). The
  Psychology tab breaks down win rate and average $/trade per emotion, grade and
  mistake, plus auto-generated callouts like "You lose an average of $200 per trade
  with FOMO".
- Share card: export any trade as a clean image (entry, exit, P&L, R, tags and its
  first screenshot) with one click - download as PNG or copy straight to the
  clipboard to paste into Twitter/X or Discord.
- Deeper analytics: holding time vs profitability scatter chart, best/worst days of
  the week and hours of the day, and a drawdown chart under the equity curve.
- Attach entry/exit chart screenshots per trade (saved on the server).
- Edit and delete trades.
- Dashboard: total P&L, win rate, profit factor, average win/loss, largest win/loss,
  expectancy and an equity curve.
- Calendar with daily P&L colouring.
- Analysis broken down by symbol (NQ vs ES), setup, session and direction.
- Filters by symbol, date range, setup, session and direction.
- CSV export and import, plus full JSON backup and restore.
- Responsive layout that works on mobile.

## Point values

Dollar-per-point defaults are applied automatically: NQ = 20, ES = 50, MNQ = 2, MES = 5.
Any other symbol defaults to 1 and you can override the point value on any trade.

## Where your data lives

- Trades: `server/data/trades.json`
- Login accounts (hashed passwords, never plaintext): `server/data/users.json`
- Screenshots: `server/uploads/`
- Automatic safety backups (made before restore and on each backup download): `server/data/backups/`

`server/data/` and `server/uploads/` are gitignored, so trades, screenshots and login
accounts never end up in the git repo.

Back these up by copying the `server/data` and `server/uploads` folders, or use the
Data tab in the app to download a JSON backup.

## Try it with sample data

Open the Data tab and import `sample-trades.csv` to see the app populated, then delete
those trades or restore an empty backup when you want a clean journal.

## Running in development (optional)

Two terminals:

```
npm run dev:server   # API on http://localhost:3001
npm run dev:client   # Vite dev server with hot reload, proxies /api to the backend
```

## Tradovate sync

The Data tab has a Tradovate section. Click Settings, choose Demo or Live, and enter your
Tradovate username, password and API key (cid + secret). This needs Tradovate's paid
"API Access" add-on and an API key created in your Tradovate account. Credentials are
stored only on the server, in the mounted `server/data/tradovate.json` (file permission
600), never in the browser.

Then pick a date and press "Sync from Tradovate". The app pulls that day's fills, pairs
them into round-trip trades (entry, exit, contracts, direction, symbol) and adds them to
the journal. Re-running is safe: trades already imported are detected by their source id
and skipped. Contracts still open at day's end are not imported until they are closed.

Point values default from the symbol root (NQ=20, ES=50, MNQ=2, MES=5); commissions come
in as 0 so you can add them, and setup/session are left blank for you to fill in.
