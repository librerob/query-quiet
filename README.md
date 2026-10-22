<p><img src="assets/readme-header.svg" alt="Query Quiet — Search URLs out of history." width="960"></p>

Automatically removes search result URLs from Chrome history, reducing past-search suggestions with clock icons in the address bar. Ordinary browsing history and bookmarks stay intact.

Vanilla JavaScript. No dependencies, network calls, or analytics. Only `history` and `storage` permissions. Under 100 KB unpacked.

## Install

Requires desktop Chrome 110 or newer.

1. Download and extract the [source ZIP](https://github.com/librerob/query-quiet/archive/refs/heads/main.zip).
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.

Removal is on by default. Open **Details → Extension options** to pause it or choose engines. No build step is needed.

## Search engines

Google, DuckDuckGo, Bing, Brave Search, Yahoo, Ecosia, Startpage, Qwant, Kagi, and Mojeek. Includes image, video, and news routes where explicitly listed in [rules.js](rules.js).

Matching uses exact hostnames and paths, plus a nonempty search parameter. Google Maps and an unrelated site's `?q=` are left alone.

For another search endpoint, add a custom rule in options and save:

```text
searx.example.org /search q
```

One `hostname /path parameter` per line; no wildcards. [Rule format and contributing domains →](CONTRIBUTING.md)

## Before you use it

- Deletion is permanent and removes all history visits to a matching URL.
- Existing history is not scanned. Old entries remain unless revisited.
- Chrome controls Omnibox caching. Bookmarks, open tabs, and provider/account suggestions can still appear.
- Unlisted routes, POST-only searches, and fragment-based queries are not covered.
- Settings stay local. Chrome may sync history deletions if browser history sync is enabled.

## Development

Run `node --test` with Node.js 22+. No packages to install.

[Architecture and packaging](docs/DEVELOPMENT.md) · [Testing](TESTING.md) · [Brand assets](assets/README.md) · [MIT license](LICENSE)
