// Deliberately explicit: never treat an arbitrary site's ?q= as a web search.
const googleDomains = [
  'google.com', 'google.co.uk', 'google.ca', 'google.com.au', 'google.co.nz',
  'google.de', 'google.fr', 'google.es', 'google.it', 'google.nl', 'google.be',
  'google.ch', 'google.at', 'google.ie', 'google.pt', 'google.pl', 'google.se',
  'google.no', 'google.dk', 'google.fi', 'google.co.in', 'google.co.jp',
  'google.co.kr', 'google.com.br', 'google.com.mx', 'google.co.za',
  'google.com.sg', 'google.com.tr', 'google.com.tw', 'google.com.hk'
];

export const ENGINES = [
  { id: 'google', name: 'Google', hosts: googleDomains.flatMap(h => [h, `www.${h}`]), paths: ['/', '/search', '/webhp'], param: 'q' },
  { id: 'duckduckgo', name: 'DuckDuckGo', hosts: ['duckduckgo.com', 'www.duckduckgo.com', 'html.duckduckgo.com', 'lite.duckduckgo.com'], paths: ['/', '/html', '/html/', '/lite', '/lite/'], param: 'q' },
  { id: 'bing', name: 'Bing', hosts: ['bing.com', 'www.bing.com'], paths: ['/search'], param: 'q' },
  { id: 'brave', name: 'Brave Search', hosts: ['search.brave.com'], paths: ['/search'], param: 'q' },
  { id: 'yahoo', name: 'Yahoo', hosts: ['search.yahoo.com', ...['uk', 'de', 'fr', 'es', 'it', 'ca', 'au', 'in', 'sg', 'tw', 'hk'].map(r => `${r}.search.yahoo.com`)], paths: ['/search'], param: 'p' },
  { id: 'ecosia', name: 'Ecosia', hosts: ['ecosia.org', 'www.ecosia.org'], paths: ['/search'], param: 'q' },
  { id: 'startpage', name: 'Startpage', hosts: ['startpage.com', 'www.startpage.com'], paths: ['/sp/search', '/do/search', '/do/dsearch'], param: 'query' },
  { id: 'qwant', name: 'Qwant', hosts: ['qwant.com', 'www.qwant.com'], paths: ['/'], param: 'q' },
  { id: 'kagi', name: 'Kagi', hosts: ['kagi.com', 'www.kagi.com'], paths: ['/search'], param: 'q' },
  { id: 'mojeek', name: 'Mojeek', hosts: ['mojeek.com', 'www.mojeek.com'], paths: ['/search'], param: 'q' }
];

export const SETTINGS_KEY = 'settings';
export const MAX_RULES = 100;
export const MAX_RULE_TEXT = 16000;

// Shared validation protects the worker even if storage was edited outside the UI.
export function validateRule(rule) {
  if (!rule || typeof rule !== 'object' ||
      typeof rule.host !== 'string' || typeof rule.path !== 'string' ||
      typeof rule.param !== 'string') throw new Error('Each rule needs a host, path, and parameter.');
  const { host, path, param } = rule;
  if (host.length > 253 || !/^[a-z0-9.-]+$/i.test(host) ||
      host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    throw new Error('Use an exact hostname, without a scheme, port, or wildcard. Use punycode for international domains.');
  }
  if (path.length > 512 || !path.startsWith('/') || path.startsWith('//') || /[\s?#\\]/.test(path) ||
      new URL(`https://${host}${path}`).pathname !== path) {
    throw new Error('Use an exact URL path beginning with /, without a query or fragment.');
  }
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(param)) throw new Error('Use a parameter name of 1–64 letters, numbers, underscores, or hyphens.');
  return { host: host.toLowerCase(), path, param };
}

export function normalizeSettings(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid settings.');
  const { enabled = true, disabledEngines = [], customRules = [] } = value;
  if (typeof enabled !== 'boolean' || !Array.isArray(disabledEngines) ||
      disabledEngines.length > ENGINES.length ||
      disabledEngines.some(id => !ENGINES.some(engine => engine.id === id)) ||
      !Array.isArray(customRules) || customRules.length > MAX_RULES) throw new Error('Invalid settings.');
  return { enabled, disabledEngines: [...new Set(disabledEngines)], customRules: customRules.map(validateRule) };
}

export function parseCustomRules(text) {
  if (text.length > MAX_RULE_TEXT) throw new Error(`Keep custom rules under ${MAX_RULE_TEXT} characters.`);
  const rules = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    try {
      if (parts.length !== 3) throw new Error('Expected: hostname /path parameter');
      rules.push(validateRule({ host: parts[0], path: parts[1], param: parts[2] }));
    } catch (error) {
      throw new Error(`Line ${index + 1}: ${error.message}`);
    }
    if (rules.length > MAX_RULES) throw new Error(`Use at most ${MAX_RULES} custom rules.`);
  }
  return rules;
}

export function compileSettings(value) {
  const settings = normalizeSettings(value);
  const hosts = new Map();
  const add = (host, path, param) => {
    let paths = hosts.get(host);
    if (!paths) hosts.set(host, paths = new Map());
    let params = paths.get(path);
    if (!params) paths.set(path, params = new Set());
    params.add(param);
  };
  if (settings.enabled) {
    for (const engine of ENGINES) {
      if (settings.disabledEngines.includes(engine.id)) continue;
      for (const host of engine.hosts) for (const path of engine.paths) add(host, path, engine.param);
    }
    for (const rule of settings.customRules) add(rule.host, rule.path, rule.param);
  }
  return { enabled: settings.enabled, hosts };
}

export function isSearchUrl(raw, compiled) {
  if (!compiled.enabled || typeof raw !== 'string' || !raw.includes('?')) return false;
  let url;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  // A final DNS dot is equivalent to the same hostname without that dot.
  const params = compiled.hosts.get(url.hostname.replace(/\.$/, ''))?.get(url.pathname);
  if (!params) return false;
  for (const [key, value] of url.searchParams) {
    if (params.has(key) && value.trim().length > 0) return true;
  }
  return false;
}
