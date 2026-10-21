# Verification

## Automated checks

Run `node --test` using Node.js 22 or newer. The suite uses only the built-in test runner and assertion library.

The 24 tests cover every declared provider host/path, unrelated pages and deceptive hosts, encoded and repeated query parameters, empty queries, settings validation, rule limits, exact custom rules, toggles, and manifest permission restrictions. Worker tests mock the Chrome API to verify synchronous listener registration, first-visit settings loading, warm deletion dispatch, a persisted pause, storage-read/change races, settings failure and recovery, and query-free error logging.

`node tools/benchmark.mjs` prints machine/runtime details and the scope of the warm matcher measurement. `node tools/package.mjs` creates a deterministic ZIP and rejects packages at or above 100,000 bytes unpacked or zipped.

## Browser checks

Checked on 21 October 2026 using desktop Chrome 156.0.8078.48 in an isolated, disposable profile. Search navigation fixtures were fulfilled locally without visiting a search provider.

Verified with real Chrome APIs:

- The MV3 module worker registered and the options page loaded without JavaScript errors.
- A matching `history.addUrl` event was deleted; an ordinary `example.com` URL containing `?q=` remained.
- A search navigation fulfilled with a local fixture was removed from history.
- Global pause preserved a matching search URL.
- An invalid wildcard rule was rejected; a valid custom rule removed its matching history URL.
- Settings persisted after reloading the options page.
- A bookmark pointing at a matching search URL survived history deletion.
- History deletion resumed after explicitly stopping the service worker and triggering another visit.
- Light and dark layouts rendered; the 360-pixel layout had no horizontal overflow.

These checks establish actual history API behavior. They do not establish the ordering of Chrome's Shortcuts writes, guarantee all Omnibox suggestions disappear, or measure total browser memory after idle termination. Those remain browser-controlled properties.

## Manual acceptance check

Use a temporary Chrome profile because deletion cannot be undone.

1. Load the extension unpacked and leave worker DevTools closed.
2. Search for a distinctive test phrase on each enabled engine. Check `chrome://history` for the result URL.
3. Navigate to a normal page and an unrelated site's page with `?q=test`; both should remain in history.
4. Bookmark a search result URL. Revisit it. The bookmark must remain even though its history visits are removed.
5. Pause removal, save, and repeat a search. The history entry should remain. Close/reopen Chrome and confirm pause still applies.
6. Add an exact custom rule, save, re-enable removal, and verify that only its exact host/path/parameter matches.
7. Test a distinctive search phrase in the address bar after closing its search tab. Distinguish local history suggestions from bookmarks, open tabs, and provider/account suggestions. A brief cache race is possible.
8. With no options tab or worker inspector open, wait at least 30 seconds without browsing. The extension details should eventually show an inactive worker. Chrome controls the actual termination time.

If an engine changes its route or parameter, add an exact custom rule or update `rules.js`, extend the matching fixtures, and rerun these checks.
