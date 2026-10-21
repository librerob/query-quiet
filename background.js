import { SETTINGS_KEY, compileSettings, isSearchUrl } from './rules.js';

let compiled = null;
let revision = 0;

// Register synchronously on every worker start, before the first storage read.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !Object.hasOwn(changes, SETTINGS_KEY)) return;
  revision++;
  try {
    compiled = compileSettings(changes[SETTINGS_KEY].newValue);
  } catch {
    compiled = null; // Invalid settings must never broaden deletion.
    console.warn('Query Quiet: invalid settings; deletion paused. Save valid options to resume.');
  }
});

function removeMatch(item) {
  if (!compiled || !isSearchUrl(item.url, compiled)) return;
  // No timer, history scan, storage write, or await before the deletion request.
  // Keep the original URL: deleteUrl removes every visit to this exact URL.
  return chrome.history.deleteUrl({ url: item.url }).catch(() => {
    // Never log URLs, queries, or raw API errors that could contain them.
    console.warn('Query Quiet: a history deletion failed.');
  });
}

chrome.history.onVisited.addListener(item => {
  if (compiled) return removeMatch(item);
  // Only a cold start waits for settings, so a persisted pause is always honored.
  return ready.then(() => removeMatch(item));
});

const initialRevision = revision;
const ready = chrome.storage.local.get(SETTINGS_KEY).then(data => {
  // A settings event may arrive before this snapshot. Never overwrite it.
  if (revision === initialRevision) compiled = compileSettings(data[SETTINGS_KEY]);
}).catch(() => {
  console.warn('Query Quiet: settings could not be loaded; deletion paused until settings are available.');
});
