# Country Search — Architecture & Design Decisions

## 1. Request Cancellation Mechanism (`AbortController`)

Live search introduces a classic race condition: if an earlier request (e.g., `"sp"`) resolves later than a subsequent request (e.g., `"spain"`), the stale response overwrites newer results on screen.

Instead of masking this issue with a post-hoc flag or timestamp check (which still wastes bandwidth and allows stale responses to complete), this application cancels outdated network requests at the transport level:

- **Immediate abort on every keystroke (`src/searchController.ts`):** Whenever `handleInput()` is called—even before the new `debounce` timer expires—`abortCurrentRequest()` invokes `activeAbortController.abort()`. Any in-flight `fetch()` immediately aborts (`canceled` in DevTools Network tab).
- **Combined cancellation & timeout (`src/api.ts`):** `searchCountries()` composes the user cancellation signal with `AbortSignal.timeout(8000)` via `AbortSignal.any([signal, timeoutSignal])` (with an event-listener fallback).
- **Explicit error differentiation (`classifySearchError`):** In `catch`, `DOMException` with `name === 'AbortError'` is treated as an intentional cancellation and ignored silently, whereas `name === 'TimeoutError'`, `HttpError` (non-404), and network failures transition the UI into an error state with a **Retry** button.

## 2. Debounce Delay Rationale (`350ms`)

The input handler uses a `350ms` debounce delay (`DEFAULT_DEBOUNCE_MS = 350`):

- **Too short / removed (`0–50ms`):** Nearly every keystroke triggers a network round-trip, flooding the API with partial prefixes (`"s"`, `"sp"`, `"spa"`) and causing unnecessary aborts and UI flicker.
- **Too long (`800ms+`):** The search feels sluggish and unresponsive; users pause and wonder if the input is broken before seeing feedback.
- **`350ms` sweet spot:** Matches typical inter-keystroke intervals during active typing while feeling instantaneous once the user finishes a word or syllable.

## 3. Algorithmic Complexity (Big O)

- **`mapCountryResponse(raw)` (`src/mapper.ts`):**
  - **Time Complexity:** $O(L + C + B)$, where $L$ is the number of languages, $C$ is the number of currencies, and $B$ is the number of bordering countries for a single country record (each typically $\le 15$, making it $O(1)$ bounded per country, and $O(N \cdot (L + C + B))$ across $N$ returned countries).
  - **Space Complexity:** $O(L + C + B)$ to allocate the normalized arrays on the `Country` object.
- **Query Cache & In-Flight Deduplication (`src/searchController.ts`):**
  - **Time Complexity:** $O(1)$ average-case lookup, insertion, and deletion using JavaScript `Map` (`cache` and `inFlight`) keyed by lowercased trimmed query strings.
  - **Space Complexity:** $O(K \cdot M)$, where $K$ is the number of distinct cached queries and $M$ is the average payload size per query.

## 4. Clean Code Principles Applied

- **Single Responsibility Principle (SRP):**
  - `src/utils.ts` handles generic timing (`debounce`).
  - `src/mapper.ts` handles pure data transformation (`mapCountryResponse`) with zero DOM or network dependencies.
  - `src/api.ts` encapsulates HTTP transport, status handling (`404` vs `HttpError`), and `AbortSignal` composition.
  - `src/searchController.ts` manages state transitions, caching, deduplication, and request lifecycle independently of the DOM.
  - `src/ui.ts` is solely responsible for safe DOM creation (`document.createElement`, no `innerHTML`) and rendering states.
- **Explicit Error Modeling:** Custom `HttpError` class (`src/api.ts`) and typed `ClassifiedError` union (`src/types.ts`, `src/searchController.ts`) prevent silent error swallowing or conflating user aborts with timeouts.
- **XSS-Safe DOM Construction:** All dynamic nodes in `src/ui.ts` are built with `document.createElement` and `textContent`.
