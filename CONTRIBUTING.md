# Contributing

## Add a search route

1. Open the engine and copy a real web, image, video, or news result URL. Remove personal queries and tracking identifiers before sharing it.
2. Add the exact hostname, path, and search parameter to `ENGINES` in `rules.js`. Use `routes` for endpoints that live on different hosts. Include only hosts owned by that engine; avoid suffix patterns or wildcard country domains.
3. Add a literal URL fixture to `tests/rules.test.mjs`, plus nearby URLs that must remain: homepages, unrelated paths, empty parameters, and lookalike domains. Keep fixtures independent of the engine table.
4. Run `node --test`, package the extension, and check the new route in a temporary Chrome profile. Confirm that history stays empty after page load and reload.

The Google allowlist is a static snapshot of Google's [supported domains](https://www.google.com/supported_domains), including bare and `www` hosts. Update that snapshot when needed; the extension never downloads it. Regional Yahoo hosts are listed explicitly. Yahoo's recognized `;_ylt=`, `;_ylu=`, and `;_ylc=` suffixes are accepted only on enabled built-in Yahoo search endpoints.

## Custom rules

Options accept `hostname /path parameter`, one rule per line:

```text
# My search instance
searx.example.org /search q
search.example.org / query
```

Hostnames and paths match exactly. Add `www` and other subdomains separately. Use punycode for international hostnames and percent-encode spaces or non-ASCII path characters. Blank lines and full-line `#` comments are ignored; inline comments are not supported.

Limits are 100 rules and 16,000 input characters. The same rule-count and normalized-text limits apply when settings are loaded from storage. Custom rules add matches even on unchecked engines; global pause disables all deletion. Invalid settings pause deletion until valid settings are saved.

## Keep it small

Use native browser APIs and local assets. Preserve the `history` / `storage` permission limit, avoid network calls and per-visit writes, and do not add keepalive timers. Include behavior tests for matcher or worker changes. See [development notes](docs/DEVELOPMENT.md) for packaging and performance details.
