# Query Quiet privacy policy

Updated: 22 October 2026

Query Quiet removes supported search result URLs from Chrome history as you visit them. It runs entirely on your device.

## History access

Chrome's history permission allows the extension to receive visit events. Query Quiet uses the URL from each event to check your enabled search rules and asks Chrome to delete matching URLs. URLs can contain search terms and other personal information.

This processing happens locally in memory. The extension does not maintain a browsing log or a search-term archive, and it does not send URLs, search terms, or other browsing data to the developer or third parties. Diagnostic warnings do not include visited URLs.

Deleting a matching URL removes all recorded history visits to that URL and cannot be undone by the extension. Existing history is not scanned. Bookmarks themselves are not deleted. Chrome may sync history deletions when browser history sync is enabled; that behavior is controlled by Chrome.

## Settings

Your enabled or paused state, selected engines, and custom matching rules are saved in `chrome.storage.local` on your device. Query Quiet does not use Chrome's settings sync storage. You can change these settings in the extension's options or remove the extension to stop processing future visits.

## No external services

Query Quiet makes no network requests and has no analytics, advertising, accounts, or remotely loaded code. The developer receives no browsing data or settings from the extension. No such data is sold or shared, used for unrelated purposes, or used for creditworthiness or lending decisions.

## Scope and contact

This policy covers the extension. Chrome, your search provider, GitHub, and the Chrome Web Store operate under their own policies. Query Quiet does not delete search-provider account history.

Questions can be raised through [GitHub issues](https://github.com/librerob/query-quiet/issues). Issues are public; do not include private search terms or browsing URLs.
