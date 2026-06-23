# Trendlyne ETF Analyzer

A small Node.js script that fetches ETF category data from Trendlyne using Puppeteer and ranks ETFs by trade value.

The project is configurable through `.env`, so it can analyze gold ETFs, silver ETFs, or a similar Trendlyne ETF category URL.

## What It Does

- Opens Chrome through Puppeteer so the request is made from a browser-like environment.
- Fetches ETF table data from the Trendlyne URL configured in `.env`.
- Requests JSON data and retries with `format=json` if Trendlyne returns the Django REST Framework HTML page.
- Extracts `result.data.body.tableData`.
- Calculates trade value as:

```txt
price * 3 month average volume
```

- Returns the top 5 ETFs by highest trade value.
- Shows price, 3-month average volume, trade value, expense ratio, and remarks.
- Calculates the category average expense ratio.

## Tech Used

- Node.js
- Puppeteer
- JavaScript ES modules
- Trendlyne ETF API/page data
- `.env` configuration using Node's built-in `loadEnvFile`

## Setup

Install dependencies:

```bash
npm install --ignore-scripts
```

Create a `.env` file:

```env
API_URL=https://trendlyne.com/equity/api/get-etfs-tabledata-v2/byslug/gold/?perPageCount=100&groupType=all&groupName=all
API_METHOD=GET
PUPPETEER_HEADLESS=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

Run the project:

```bash
npm start
```

To analyze silver ETFs instead, replace `API_URL` with the silver ETF category URL:

```env
API_URL=https://trendlyne.com/equity/api/get-etfs-tabledata-v2/byslug/silver/?perPageCount=100&groupType=all&groupName=all
```

## Example Output

```json
{
  "data": [
    {
      "name": "Nippon India ETF Gold BeES",
      "price": 118.9,
      "threeMonthAvgVolume": "34.29M",
      "tradeValue": "4077M",
      "expenseRatio": 0.69,
      "remarks": "HIGH (expense ratio above category avg)"
    }
  ],
  "avgExpenseRatio": 0.48
}
```

## GitHub Description

Node.js Puppeteer script to fetch Trendlyne ETF category data and rank top ETFs by trade value with expense ratio insights.
