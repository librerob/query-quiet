# Verification

## Automated checks

Run `node --test` using Node.js 22 or newer. The suite uses only the built-in test runner and assertion library.

The 31 tests cover every declared provider host/path, independent media-search fixtures, Yahoo tracking suffixes and their boundaries, unrelated pages and deceptive hosts, encoded and repeated query parameters, empty queries, settings validation, rule limits on both input and load, exact custom rules, comments, toggles, and manifest permission restrictions. Worker tests mock the Chrome API to verify synchronous listener registration, multiple first-visit events waiting for settings, warm deletion dispatch, a persisted pause, storage-read/change races, settings failure and recovery, and query-free error logging.

`node tools/benchmark.mjs` prints machine/runtime details and the scope of the warm matcher measurement. `node tools/package.mjs` creates a deterministic ZIP and rejects packages at or above 100,000 bytes unpacked or zipped.

Version 1.0.1: 24,299 bytes unpacked; 13,392 bytes zipped. Two consecutive builds were byte-identical, and independent ZIP validation confirmed CRCs and exact source contents.

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

Branding checks on 22 October 2026: verified manifest PNG dimensions (16, 32, 48, 128), alpha transparency, 16-pixel padding around the 128-pixel icon, and the 440×280 promotional tile. Reviewed the mark on light/dark backgrounds and at each shipped size. Confirmed that the packager includes every manifest icon and excludes README/store artwork. Rechecked extension loading and the options-page favicon in isolated Chrome.

## Load and reload regression — 22 October 2026

Chrome 156.0.8078.48, isolated profile, real extension/history APIs. Search responses were local fixtures, not live provider responses. A delayed image kept each page loading after DOM readiness. The fixture changed its title on `load`, then again 150 ms later. History was checked after the delayed title update, after a full reload, and again after the remaining navigations.

All ten fixtures retained zero visits at those checks:

- Google `/search`, including `google.cz` and `google.com.ar`.
- Bing `/images/search` and `/news/search`.
- Brave, Kagi, and Ecosia `/images`.
- Yahoo `images.search.yahoo.com/search/images;_ylt=fixture;_ylu=abc123` and `news.search.yahoo.com/search;_ylt=fixture`.

Chrome DevTools Fetch response fixtures also exercised two HTTP 302 chains. A matching search redirected to another matching search: both URLs had zero visits after load and delayed title updates. A matching search redirected to an ordinary `example.com` destination: the search URL had zero visits, and the ordinary destination retained its visit. These check Chrome's redirect/history behavior without depending on a provider's current redirect service.

Live provider inspection separately confirmed Yahoo's `;_ylt=` / `;_ylu=` links and its distinct image/video/news hosts, plus Brave and Ecosia media-tab paths. All 187 Google domains were compared with Google's [published list](https://www.google.com/supported_domains). Authenticated Kagi provider behavior was not exercised; its routes were checked with URL fixtures. Unlisted routes remain outside the guarantee.

Options-page checks also confirmed that oversized rules loaded from storage show the invalid-settings message with removal paused. Saving a valid rule with a full-line comment repaired settings and resumed deletion.

## Manual acceptance check

Use a temporary Chrome profile because deletion cannot be undone.

1. Load the extension unpacked and leave worker DevTools closed.
2. Search for a distinctive test phrase on each enabled engine. Check `chrome://history` for the result URL.
   Repeat for image, video, and news tabs where supported. Let the page finish loading, wait for title changes, reload it, navigate away, and check that the URL is still absent.
3. Navigate to a normal page and an unrelated site's page with `?q=test`; both should remain in history.
4. Bookmark a search result URL. Revisit it. The bookmark must remain even though its history visits are removed.
5. Pause removal, save, and repeat a search. The history entry should remain. Close/reopen Chrome and confirm pause still applies.
6. Add an exact custom rule, save, re-enable removal, and verify that only its exact host/path/parameter matches.
7. Test a distinctive search phrase in the address bar after closing its search tab. Distinguish local history suggestions from bookmarks, open tabs, and provider/account suggestions. A brief cache race is possible.
8. With no options tab or worker inspector open, wait at least 30 seconds without browsing. The extension details should eventually show an inactive worker. Chrome controls the actual termination time.

If an engine changes its route or parameter, add an exact custom rule or update `rules.js`, extend the matching fixtures, and rerun these checks.
