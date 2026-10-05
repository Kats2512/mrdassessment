# Solution notes

## Design choices

- **Layers:** routes handle HTTP and validation only; services hold the logic; models are plain
  interfaces. `searchService` is the only place that combines catalog and upstream data.
  - **Search:** the query is split into words and every word must appear in the item name,
    restaurant or category. Simple, predictable, no dependencies.
  - **Filter / sort:** category filter; sort by popularity, price (asc/desc) or name. Sorting uses
    the catalog `basePrice`, because sorting by live price would mean calling upstream for every
    match before pagination.
  - **Pagination:** `page` / `pageSize` with `total` and `totalPages`. Only the current page is
    enriched, which keeps upstream calls to at most `pageSize` per request.
- **Upstream simulation:** in-process module with 100-1000ms latency, a 10% failure rate, and a
  5% chance of being slow enough to hit the 2s timeout. Live prices move in R25 steps around the
  base price (never below half of it).
- **Failure handling:** upstream calls run in parallel and fail independently. A failed item comes
  back with `upstream: null` and an `upstreamError` rather than failing the request.

  ## Trade-offs

- Results can show a different live price each time the same item is requested, since the
  simulation is random. There is no caching, to keep things small.
- Sorting by base price means the order can differ slightly from the live prices shown.
- The UI is one HTML file with JS file referenced as well as bootstrap 5.
- Tests use Vitest and mock `Math.random` to make the simulated upstream deterministic. They
  cover the services (search, filter, sort, pagination, enrichment, upstream failure and timeout)
  via supertest (validation errors, defaults, 404).

  ## UI notes

- Search runs as you type with a 300ms debounce. Each new request aborts the previous one, so a
  slow response for an old query can never overwrite newer results.
- Changing the query, category or sort resets to page 1.
- The pager shows the first and last pages plus a window around the current one.
- All API text is HTML-escaped before rendering.

## AI assistance

Used AI to generate a catalog.
Used AI to create some of the CSS for the UI.
Used AI to assist with escaping of chars.
