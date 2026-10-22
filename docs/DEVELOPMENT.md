# Development

## Architecture

`background.js` is a Manifest V3 ES module service worker. All event listeners register synchronously during module evaluation. One `storage.local.get` loads settings; visits received before it completes wait for that read. A revision counter prevents a stale snapshot from overwriting a newer storage event.

`rules.js` validates settings and compiles hostname/path lookup maps. Warm visits perform no storage access. A matching visit immediately requests `history.deleteUrl` and handles its returned Promise. There are no history scans, counters, timers, content scripts, offscreen pages, persistent connections, or keepalive calls.

Unreadable or invalid settings pause deletion; a valid local settings change restores it. Logs never include URLs, queries, or raw API errors. A read failure and a validation failure have distinct messages, with consistent validation messages at startup and during settings changes.

Chrome's [history API](https://developer.chrome.com/docs/extensions/reference/api/history) removes every recorded visit to the exact URL passed to `deleteUrl`. The extension does not edit bookmarks, cookies, browser database files, or search engine account history. The `history` permission grants more access than the implementation uses; the code does not enumerate history or call bulk deletion methods.

## Timing and resources

Chrome normally [terminates idle workers after about 30 seconds](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle). A stopped worker has no live JavaScript heap, but Chrome retains extension bookkeeping. Frequent visits and open DevTools can keep the worker active. There is no measured guarantee of 0 MB total browser memory.

`onVisited` fires before page loading finishes. It provides no ordering guarantee relative to Omnibox's Shortcuts database. The browser tests check deletion after load, delayed title changes, redirects, and reloads; they do not prove that all suggestions disappear in every Chrome version. No speculative delayed retry or polling loop is used.

The extension processes search URLs only transiently and stores only settings in `storage.local`. It makes no network requests and has no analytics. Chrome's own history sync can propagate deletions to other devices. This is URL removal, not a secure overwrite of database files.

## Checks and package

Requires Node.js 22+. There are no dependencies to install.

```sh
node --test
node tools/benchmark.mjs
node tools/package.mjs
```

The benchmark reports the warm JavaScript matcher only. Worker startup, storage reads, Chrome API latency, deletion completion, and Omnibox timing are excluded; a sub-microsecond matcher result is not an end-to-end privacy guarantee. Native `URL` / `URLSearchParams` are sufficient; no Wasm compiler or runtime is needed.

The packager takes its version from `manifest.json` and writes `dist/query-quiet-VERSION.zip`. The ZIP is deterministic, contains only runtime files and the license, and rejects zipped or unpacked output at or above 100,000 bytes. README/store art, documentation, and tests are excluded. PNG icons are included. See [TESTING.md](../TESTING.md) for validation evidence and browser-test instructions.

## Publish a new repository

These commands are for maintainers creating a separate repository from this source, not for installing the extension. Install [Git](https://git-scm.com/downloads) and [GitHub CLI](https://cli.github.com/), configure your Git commit identity, and run these one at a time from the source folder:

```sh
git init --initial-branch=main
git add .
git commit -m "Add Query Quiet MV3 extension"
gh auth login
gh repo create query-quiet --public --source=. --remote=origin --push
gh repo view --web
```

Stop if a command fails. Choose an available name if `query-quiet` already exists in your account. For an existing checkout, use its configured remote instead of creating another repository. See [`gh repo create`](https://cli.github.com/manual/gh_repo_create) for the CLI flags. Publishing source on GitHub is separate from publishing on the Chrome Web Store.
