// Deliberately explicit: never treat an arbitrary site's ?q= as a web search.
// Static snapshot of https://www.google.com/supported_domains (2026-10-22).
// Never use a wildcard TLD or fetch this list from the running extension.
const googleDomains = `
google.com google.ad google.ae google.com.af google.com.ag google.al google.am
google.co.ao google.com.ar google.as google.at google.com.au google.az google.ba
google.com.bd google.be google.bf google.bg google.com.bh google.bi google.bj
google.com.bn google.com.bo google.com.br google.bs google.bt google.co.bw google.by
google.com.bz google.ca google.cd google.cf google.cg google.ch google.ci google.co.ck
google.cl google.cm google.cn google.com.co google.co.cr google.com.cu google.cv
google.com.cy google.cz google.de google.dj google.dk google.dm google.com.do google.dz
google.com.ec google.ee google.com.eg google.es google.com.et google.fi google.com.fj
google.fm google.fr google.ga google.ge google.gg google.com.gh google.com.gi google.gl
google.gm google.gr google.com.gt google.gy google.com.hk google.hn google.hr google.ht
google.hu google.co.id google.ie google.co.il google.im google.co.in google.iq google.is
google.it google.je google.com.jm google.jo google.co.jp google.co.ke google.com.kh
google.ki google.kg google.co.kr google.com.kw google.kz google.la google.com.lb
google.li google.lk google.co.ls google.lt google.lu google.lv google.com.ly google.co.ma
google.md google.me google.mg google.mk google.ml google.com.mm google.mn google.com.mt
google.mu google.mv google.mw google.com.mx google.com.my google.co.mz google.com.na
google.com.ng google.com.ni google.ne google.nl google.no google.com.np google.nr
google.nu google.co.nz google.com.om google.com.pa google.com.pe google.com.pg
google.com.ph google.com.pk google.pl google.pn google.com.pr google.ps google.pt
google.com.py google.com.qa google.ro google.ru google.rw google.com.sa google.com.sb
google.sc google.se google.com.sg google.sh google.si google.sk google.com.sl google.sn
google.so google.sm google.sr google.st google.com.sv google.td google.tg google.co.th
google.com.tj google.tl google.tm google.tn google.to google.com.tr google.tt
google.com.tw google.co.tz google.com.ua google.co.ug google.co.uk google.com.uy
google.co.uz google.com.vc google.co.ve google.co.vi google.com.vn google.vu google.ws
google.rs google.co.za google.co.zm google.co.zw google.cat
`.trim().split(/\s+/);

export const ENGINES = [
  { id: 'google', name: 'Google', hosts: googleDomains.flatMap(h => [h, `www.${h}`]), paths: ['/', '/search', '/webhp'], param: 'q' },
  { id: 'duckduckgo', name: 'DuckDuckGo', hosts: ['duckduckgo.com', 'www.duckduckgo.com', 'html.duckduckgo.com', 'lite.duckduckgo.com'], paths: ['/', '/html', '/html/', '/lite', '/lite/'], param: 'q' },
  { id: 'bing', name: 'Bing', hosts: ['bing.com', 'www.bing.com'], paths: ['/search', '/images/search', '/videos/search', '/news/search'], param: 'q' },
  { id: 'brave', name: 'Brave Search', hosts: ['search.brave.com'], paths: ['/search', '/images', '/videos', '/news'], param: 'q' },
  { id: 'yahoo', name: 'Yahoo', hosts: ['search.yahoo.com', ...['uk', 'de', 'fr', 'es', 'it', 'ca', 'au', 'in', 'sg', 'tw', 'hk'].map(r => `${r}.search.yahoo.com`)], paths: ['/search'], param: 'p', matrix: true,
    routes: [
      { hosts: ['images.search.yahoo.com'], paths: ['/search/images'], param: 'p' },
      { hosts: ['video.search.yahoo.com'], paths: ['/search/video'], param: 'p' },
      { hosts: ['news.search.yahoo.com'], paths: ['/search'], param: 'p' }
    ] },
  { id: 'ecosia', name: 'Ecosia', hosts: ['ecosia.org', 'www.ecosia.org'], paths: ['/search', '/images', '/videos', '/news'], param: 'q' },
  { id: 'startpage', name: 'Startpage', hosts: ['startpage.com', 'www.startpage.com'], paths: ['/sp/search', '/do/search', '/do/dsearch'], param: 'query' },
  { id: 'qwant', name: 'Qwant', hosts: ['qwant.com', 'www.qwant.com'], paths: ['/'], param: 'q' },
  { id: 'kagi', name: 'Kagi', hosts: ['kagi.com', 'www.kagi.com'], paths: ['/search', '/images', '/videos', '/news'], param: 'q' },
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
    throw new Error('Use an exact URL path beginning with /, without a query or fragment. Percent-encode spaces and non-ASCII characters.');
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
  const rules = customRules.map(validateRule);
  // Also bound settings loaded from storage, not just text submitted by the UI.
  if (rules.map(rule => `${rule.host} ${rule.path} ${rule.param}`).join('\n').length > MAX_RULE_TEXT) {
    throw new Error(`Keep custom rules under ${MAX_RULE_TEXT} characters.`);
  }
  return { enabled, disabledEngines: [...new Set(disabledEngines)], customRules: rules };
}

export function parseCustomRules(text) {
  if (text.length > MAX_RULE_TEXT) throw new Error(`Keep custom rules under ${MAX_RULE_TEXT} characters.`);
  const rules = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
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
  const matrixPaths = new Map();
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
      for (const route of [engine, ...(engine.routes ?? [])]) {
        for (const host of route.hosts) {
          for (const path of route.paths) add(host, path, route.param);
          if (engine.matrix) matrixPaths.set(host, new Map(route.paths.map(path => [path, new Set([route.param])])));
        }
      }
    }
    for (const rule of settings.customRules) add(rule.host, rule.path, rule.param);
  }
  return { enabled: settings.enabled, hosts, matrixPaths };
}

export function isSearchUrl(raw, compiled) {
  if (!compiled.enabled || typeof raw !== 'string' || !raw.includes('?')) return false;
  let url;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  // A final DNS dot is equivalent to the same hostname without that dot.
  const host = url.hostname.replace(/\.$/, '');
  const paths = compiled.hosts.get(host);
  if (!paths) return false;
  let params = paths.get(url.pathname);
  if (!params && compiled.matrixPaths.has(host)) {
    const separator = url.pathname.indexOf(';');
    const base = url.pathname.slice(0, separator);
    // Yahoo adds these tracking fields to its search paths. Restrict this
    // exception to enabled built-in routes; custom rules always stay exact.
    if (separator !== -1 && compiled.matrixPaths.get(host).has(base) &&
        /^(?:;_yl[ctu]=[A-Za-z0-9._~%+=-]+)+$/.test(url.pathname.slice(separator))) {
      params = compiled.matrixPaths.get(host).get(base);
    }
  }
  if (!params) return false;
  for (const [key, value] of url.searchParams) {
    if (params.has(key) && value.trim().length > 0) return true;
  }
  return false;
}
