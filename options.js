import { ENGINES, SETTINGS_KEY, normalizeSettings, parseCustomRules } from './rules.js';

const form = document.querySelector('#settings');
const controls = document.querySelector('#controls');
const enabled = document.querySelector('#enabled');
const custom = document.querySelector('#custom');
const status = document.querySelector('#status');
const save = document.querySelector('#save');
const engineInputs = new Map();

for (const engine of ENGINES) {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = `engine-${engine.id}`;
  label.append(input, document.createTextNode(engine.name));
  document.querySelector('#engines').append(label);
  engineInputs.set(engine.id, input);
}

function report(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

try {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  let settings;
  try {
    settings = normalizeSettings(data[SETTINGS_KEY]);
    report('');
  } catch {
    settings = normalizeSettings({ enabled: false });
    report('Stored settings were invalid. Review these defaults and save to repair them.', true);
  }
  enabled.checked = settings.enabled;
  for (const [id, input] of engineInputs) input.checked = !settings.disabledEngines.includes(id);
  custom.value = settings.customRules.map(rule => `${rule.host} ${rule.path} ${rule.param}`).join('\n');
  controls.disabled = false;
} catch {
  report('Settings could not be read. Reload this page to try again.', true);
}

form.addEventListener('input', () => report('Unsaved changes.'));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (controls.disabled || save.disabled) return;
  let settings;
  try {
    settings = normalizeSettings({
      enabled: enabled.checked,
      disabledEngines: [...engineInputs].filter(([, input]) => !input.checked).map(([id]) => id),
      customRules: parseCustomRules(custom.value)
    });
  } catch (error) {
    report(error.message, true);
    custom.focus();
    return;
  }
  controls.disabled = true;
  save.disabled = true;
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    report(settings.enabled ? 'Saved. Search URL removal is on.' : 'Saved. Search URL removal is paused.');
  } catch {
    report('Settings could not be saved. Your changes are still here; try again.', true);
  } finally {
    controls.disabled = false;
    save.disabled = false;
  }
});
