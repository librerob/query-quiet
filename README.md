# Query Quiet

Remove search result URLs from Chrome history as you visit them. A small Manifest V3 extension, written in vanilla JavaScript, with no dependencies or build step.

Chrome uses browsing history to suggest previous searches in the address bar, often with a clock icon. There is no dedicated native switch to hide only past local search entries while preserving other history suggestions: even disabling [Improve search suggestions](https://support.google.com/chrome/answer/13730681?hl=en) can leave local history suggestions visible. Query Quiet removes their underlying history URLs while keeping ordinary browsing history.

**Deletion is permanent.** A matching visit removes every recorded visit to that exact URL, including older visits. Bookmarks themselves are untouched; a bookmarked search can still appear as a bookmark suggestion.

## Install

Requires desktop Chrome 110 or newer.

1. Download/extract the extension ZIP, or use this source folder directly.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Open the extension's **Details → Extension options** to pause removal, select engines, or add rules.

No Node.js, npm install, compilation, or server is needed to run the extension. Removal is enabled for all supported engines by default. Changes take effect after **Save settings**. Reload the extension after editing its source.

## Matching

Built in: Google, DuckDuckGo, Bing, Brave Search, Yahoo, Ecosia, Startpage, Qwant, Kagi, and Mojeek. The exact host and path allowlists are in [rules.js](rules.js), including selected regional Google and Yahoo domains. Unlisted domains and routes are preserved.

The matcher accepts only HTTP(S), an allowed hostname, an exact search path, and a nonempty decoded query parameter. It handles encoded parameters and repeated keys without treating arbitrary `?q=` URLs as searches. Protocols and ports do not change hostname matching; paths and parameter names are case sensitive. Fragments are not inspected.

| URL | Default behavior |
| --- | --- |
| `https://www.google.com/search?q=example` | Remove |
| `https://duckduckgo.com/?q=example` | Remove |
| `https://search.yahoo.com/search?p=example` | Remove |
| `https://www.google.com/` | Keep |
| `https://www.google.com/maps?q=London` | Keep |
| `https://example.com/search?q=example` | Keep |
| `https://google.com.example.org/search?q=example` | Keep |

Custom rules use three space-separated fields, one rule per line:

```text
searx.example.org /search q
search.example.org / query
```

Hosts and paths match exactly. Add `www` or other subdomains separately. Wildcards, regular expressions, URL schemes, ports, fragments, and path prefixes are not supported. International hostnames must use punycode. Limit: 100 rules / 16,000 input characters. Custom rules are additional matches, including on unchecked engines; the global pause disables everything.

Matching applies regardless of how you arrived at a search URL: address bar, link, reload, or direct navigation. Search result destinations and unrelated pages are kept. There is no retroactive history scan: old search URLs remain unless revisited. POST-only searches, fragment-based searches, and unsupported engine routes cannot be cleaned by these URL rules.

## Timing and memory

Listeners register synchronously at worker startup. One `storage.local.get` loads settings, with pending visits waiting for that read so a saved pause is respected. Later storage changes rebuild a hostname/path lookup map. Warm visits perform no storage access; a match immediately requests `history.deleteUrl` before yielding to its returned Promise. Invalid or unreadable settings pause deletion. Failures log a generic warning without the URL or search term.

Chrome's [history API](https://developer.chrome.com/docs/extensions/reference/api/history) fires `onVisited` before a page finishes loading, but offers **no guarantee that deletion precedes Omnibox caching**. Extensions cannot access the Shortcuts database directly. Brief suggestions, open-tab matches, bookmarks, provider suggestions, and account activity can still appear. This extension reduces local history suggestions; it cannot promise that every clock icon disappears in every Chrome version. It does not erase search engine account history or securely overwrite browser database files.

No polling, alarms, content scripts, offscreen pages, persistent connections, per-visit counters, or keepalive calls. Chrome [normally terminates idle workers after about 30 seconds](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle). A terminated worker has no live JavaScript heap; Chrome retains its own extension bookkeeping. This is not a measured guarantee of 0 MB total browser memory. Frequent browsing events can keep the worker active, and inspecting it in DevTools affects its lifetime.

## Footprint and verification

The installable package has seven files, **15,975 bytes unpacked** and **7,375 bytes zipped** in this build: well below 100 KB. Documentation, tests, and development tools are excluded from the install ZIP. The packager enforces a strict 100,000-byte ceiling for both forms.

Warm matcher benchmark on Windows x64, AMD Ryzen 7 7435HS, Node 24.19.0: **0.637 microseconds per URL median**, seven rounds of 100,000 mixed synthetic URLs following 50,000 warmup calls. This measures only matching with default settings; it excludes worker startup, settings reads, Chrome API calls, deletion completion, and Omnibox timing. It is not a Chrome end-to-end latency benchmark.

Development requires Node.js 22 or newer; no packages to install:

```sh
node --test
node tools/benchmark.mjs
node tools/package.mjs
```

The final command writes a deterministic `dist/query-quiet-1.0.0.zip`. Native `URL` / `URLSearchParams` handle parsing; bounded static checks validate rules. A Rust/Wasm layer would add a compiler toolchain, startup cost, and bytes without a demonstrated benefit for this workload.

See [TESTING.md](TESTING.md) for tested behavior and browser verification limits.

## Privacy and permissions

**100% offline execution: zero network calls, analytics, telemetry, or remote code.** The extension stores settings only in `storage.local`, never `storage.sync`, and does not persist or log visited URLs. Its content security policy also blocks network connections. Search terms are processed only in transient memory for matching and the history deletion request.

- `history`: receive visits and delete matching URLs. Chrome grants broader history access with this permission; the extension does not enumerate history or call bulk deletion APIs.
- `storage`: persist local settings.

No host, tabs, bookmarks, scripting, or webRequest permissions. Chrome itself can propagate history deletions through browser history sync; the extension does not control that browser feature. The offline guarantee describes the extension, not Chrome or the search engine you visit.

## Publish on GitHub

Install [Git](https://git-scm.com/downloads) and [GitHub CLI](https://cli.github.com/). Open a terminal in this source folder. These commands initialize the repository, commit it, and create and push a **public** repository in the authenticated account:

```sh
git init --initial-branch=main
git add .
git commit -m "Add Query Quiet MV3 extension"
gh auth login
gh repo create query-quiet --public --source=. --remote=origin --push
gh repo view --web
```

Run the commands one at a time and stop if one fails. Git must already have your commit name/email configured. Choose another repository name if `query-quiet` already exists. The generated `dist/` folder is ignored. The [`gh repo create` documentation](https://cli.github.com/manual/gh_repo_create) describes the source, remote, and push flags. Publishing on GitHub is separate from Chrome Web Store submission.

MIT licensed. See [LICENSE](LICENSE).
