# Mr D Search API

Small Express + TypeScript API for searching a local food catalog, enriched with live price,
availability and delivery estimates from a simulated upstream provider.

## Run locally

Requires Node 18+.

```bash
npm install
npm run dev      # watch mode on http://localhost:3000
# or
npm run build && npm start
```

Set `PORT` to change the port. Then open http://localhost:3000 for the search UI.

```bash
npm test         # vitest (service + route tests)
npm run typecheck
```

## UI

`public/index.html` is a single vanilla JS page (Bootstrap via CDN) served by Express. It has a
search box that queries the API as you type (300ms debounce, Enter searches immediately), a
category filter, a sort control and a pager. Newer searches cancel older requests, and
there are loading, empty and error (with retry) states. Items whose live lookup failed still show
with their listed price and a "Live info unavailable" badge.

## Endpoints

### `GET /api/health`

```json
{ "status": "ok", "uptime": 12.3 }
```

### `GET /api/search`

| Param      | Default      | Notes                                                         |
| ---------- | ------------ | ------------------------------------------------------------- |
| `q`        | -            | Free text. Every word must match name, restaurant or category |
| `category` | -            | Exact category (case-insensitive)                             |
| `sort`     | `popularity` | `popularity`, `price_asc`, `price_desc`, `name`               |
| `page`     | `1`          |                                                               |
| `pageSize` | `10`         | Max 50                                                        |

```bash
curl "http://localhost:3000/api/search?q=chicken&sort=price_asc&pageSize=3"
```

```json
{
  "items": [
    {
      "id": 24,
      "name": "Grilled Chicken Wrap",
      "restaurant": "Flame Grill",
      "category": "Healthy",
      "description": "Grilled chicken, hummus, salad in a wholewheat wrap",
      "basePrice": 75,
      "popularity": 63,
      "upstream": { "price": 100, "available": true, "deliveryEstimateMins": 35 }
    },
    {
      "id": 37,
      "name": "Hot Wings (10 pc)",
      "restaurant": "Flame Grill",
      "category": "Chicken",
      "description": "Crispy wings tossed in hot sauce",
      "basePrice": 99,
      "popularity": 78,
      "upstream": null,
      "upstreamError": "Upstream provider unavailable"
    }
  ],
  "page": 1,
  "pageSize": 3,
  "total": 6,
  "totalPages": 2
}
```

If the upstream call fails or times out for an item, that item is still returned with
`upstream: null` and an `upstreamError`, so the UI can show a per-item "unavailable" state
instead of failing the whole page.

Invalid params return `400` with `{ "error": "..." }`.

### `GET /api/search/categories`

```json
{ "categories": ["Burgers", "Chicken", "Curry", "Desserts", "Drinks", "Healthy", "Pizza", "Sushi"] }
```

## Structure

```
public/index.html        vanilla JS UI
src/
  data/catalog.json      38 items, 8 categories
  models/                interfaces
  routes/                health + search
  services/              catalog, upstream (simulated), search
  app.ts                 express setup + error handling
  server.ts              entry point
tests/                   vitest tests (services + routes)
```
