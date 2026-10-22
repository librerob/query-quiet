import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINES, compileSettings, isSearchUrl, normalizeSettings, parseCustomRules } from '../rules.js';

const defaults = compileSettings();
const matches = raw => isSearchUrl(raw, defaults);

for (const engine of ENGINES) {
  test(`${engine.name}: every declared host and path`, () => {
    for (const route of [engine, ...(engine.routes ?? [])]) {
      for (const host of route.hosts) for (const path of route.paths) {
        assert.equal(matches(`https://${host}${path}?${route.param}=test`), true);
        assert.equal(matches(`https://${host}${path}?${route.param}=`), false);
        assert.equal(matches(`https://${host}${path}?other=test`), false);
        assert.equal(matches(`https://${host}.example.com${path}?${route.param}=test`), false);
      }
    }
  });
}

test('query parsing: encoding, duplicates, nonempty values, and exact keys', () => {
  for (const query of ['q=a+b', 'q=%E6%97%A5%E6%9C%AC', '%71=test', 'q=&q=test', 'q=0', 'x=1&q=test&y=2']) {
    assert.equal(matches(`https://www.google.com/search?${query}`), true, query);
  }
  for (const query of ['q', 'q=', 'q=+%20', 'Q=test', 'query=test', 'x=q%3Dtest', 'x=test#q=secret']) {
    assert.equal(matches(`https://www.google.com/search?${query}`), false, query);
  }
});

test('web, image, video, and news URLs match independent real-world fixtures', () => {
  for (const raw of [
    'https://www.google.com/search?q=oak&udm=2',
    'https://www.google.cz/search?q=oak',
    'https://google.com.ar/search?q=oak',
    'https://www.bing.com/images/search?q=oak',
    'https://bing.com/videos/search?q=oak',
    'https://www.bing.com/news/search?q=oak',
    'https://search.brave.com/images?q=oak',
    'https://search.brave.com/videos?q=oak',
    'https://search.brave.com/news?q=oak',
    'https://kagi.com/images?q=oak',
    'https://kagi.com/videos?q=oak',
    'https://kagi.com/news?q=oak',
    'https://www.ecosia.org/images?q=oak',
    'https://www.ecosia.org/videos?q=oak',
    'https://www.ecosia.org/news?q=oak',
    'https://images.search.yahoo.com/search/images?p=oak',
    'https://video.search.yahoo.com/search/video?p=oak',
    'https://news.search.yahoo.com/search?p=oak'
  ]) assert.equal(matches(raw), true, raw);
});

test('Yahoo tracking suffixes only normalize on enabled built-in search routes', () => {
  for (const raw of [
    'https://search.yahoo.com/search;_ylt=A2RS_test.123;_ylu=Y29sbw--?p=oak',
    'https://uk.search.yahoo.com/search;_ylt=A2RS_test?p=oak',
    'https://images.search.yahoo.com/search/images;_ylt=A2RS_test;_ylc=abc%2Bdef%3D?p=oak',
    'https://video.search.yahoo.com/search/video;_ylt=A2RS_test?p=oak',
    'https://news.search.yahoo.com/search;_ylt=A2RS_test?p=oak'
  ]) assert.equal(matches(raw), true, raw);
  for (const raw of [
    'https://search.yahoo.com/preferences/preferences;_ylt=abc?p=keep',
    'https://search.yahoo.com/searching;_ylt=abc?p=keep',
    'https://search.yahoo.com/search;other=abc?p=keep',
    'https://search.yahoo.com/search;_ylt=abc/other?p=keep',
    'https://search.yahoo.com/search;_ylt=abc;other=x?p=keep',
    'https://search.yahoo.com/search;_ylt=?p=keep',
    'https://search.yahoo.com/search;_ylt=abc?q=keep',
    'https://images.search.yahoo.com/search?p=keep',
    'https://search.yahoo.com/search/images?p=keep',
    'https://www.bing.com/search;_ylt=abc?q=keep',
    'https://search.yahoo.com.evil.test/search;_ylt=abc?p=keep'
  ]) assert.equal(matches(raw), false, raw);
  const custom = compileSettings({ customRules: [{ host: 'search.yahoo.com', path: '/search', param: 'custom' }] });
  assert.equal(isSearchUrl('https://search.yahoo.com/search?custom=x', custom), true);
  assert.equal(isSearchUrl('https://search.yahoo.com/search;_ylt=abc?custom=x', custom), false);
  const disabled = compileSettings({ disabledEngines: ['yahoo'], customRules: [{ host: 'search.yahoo.com', path: '/search', param: 'p' }] });
  assert.equal(isSearchUrl('https://search.yahoo.com/search;_ylt=abc?p=x', disabled), false);
});

test('nearby media pages and unlisted Google lookalikes remain untouched', () => {
  for (const raw of [
    'https://bing.com/images?q=keep', 'https://bing.com/images/searching?q=keep',
    'https://search.brave.com/images/about?q=keep', 'https://search.brave.com/maps/search?q=keep',
    'https://kagi.com/settings?q=keep', 'https://ecosia.org/images/help?q=keep',
    'https://google.example/search?q=keep', 'https://google.com.invalid/search?q=keep',
    'https://google.co.fake/search?q=keep', 'https://www.google.cz/maps?q=keep'
  ]) assert.equal(matches(raw), false, raw);
});

test('full-line rule comments are ignored; non-ASCII paths explain encoding', () => {
  assert.deepEqual(parseCustomRules('# Private search\n  # Another note\nsearx.test /search q'), [{ host: 'searx.test', path: '/search', param: 'q' }]);
  assert.throws(() => parseCustomRules('searx.test /café q'), /Percent-encode/);
  assert.deepEqual(parseCustomRules('searx.test /caf%C3%A9 q'), [{ host: 'searx.test', path: '/caf%C3%A9', param: 'q' }]);
});

test('the same aggregate length limit applies to stored and submitted rules', () => {
  const longRule = { host: 'a'.repeat(63) + '.test', path: '/' + 'x'.repeat(500), param: 'q' };
  assert.throws(() => normalizeSettings({ customRules: Array(30).fill(longRule) }), /16000/);
  const line = 'searx.test /search q';
  const boundary = line + '\n#' + 'x'.repeat(16000 - line.length - 2);
  assert.equal(parseCustomRules(boundary).length, 1);
  assert.throws(() => parseCustomRules(boundary + 'x'), /16000/);
  assert.equal(parseCustomRules('searx.test /search q\n'.repeat(100)).length, 100);
  assert.throws(() => normalizeSettings({ customRules: Array(101).fill({ host: 's.test', path: '/', param: 'q' }) }), /Invalid/);
});

test('ordinary browsing, unrelated queries, fragments, and hostile hosts survive', () => {
  for (const url of [
    'https://google.com/', 'https://www.bing.com/', 'https://duckduckgo.com/about?q=x',
    'https://example.com/search?q=test', 'https://www.google.com/maps?q=london',
    'https://accounts.google.com/search?q=test', 'https://mail.google.com/?q=test',
    'https://www.google.com/searching?q=test', 'https://www.google.com/search/other?q=x',
    'https://www.google.com/#q=test', 'https://google.com.evil.test/search?q=x',
    'https://google.com@evil.test/search?q=x', 'https://notgoogle.com/search?q=x',
    'https://gοοgle.com/search?q=x', 'file:///search?q=x', 'ftp://google.com/search?q=x',
    'chrome://history/?q=x', 'javascript:alert(1)?q=x', '', 'broken?q=x', undefined, null
  ]) assert.equal(matches(url), false, String(url));
});

test('native URL normalization handles case, ports, and DNS dot', () => {
  assert.equal(matches('https://WWW.GOOGLE.COM/search?q=test'), true);
  assert.equal(matches('http://www.google.com:8080/search?q=test'), true);
  assert.equal(matches('https://www.google.com./search?q=test'), true);
  assert.equal(matches('https://www.google.com/Search?q=test'), false);
});

test('global and individual switches, including explicit custom override', () => {
  assert.equal(isSearchUrl('https://google.com/search?q=x', compileSettings({ enabled: false })), false);
  const settings = { disabledEngines: ['google'], customRules: [{ host: 'google.com', path: '/search', param: 'q' }] };
  assert.equal(isSearchUrl('https://www.google.com/search?q=x', compileSettings(settings)), false);
  assert.equal(isSearchUrl('https://google.com/search?q=x', compileSettings(settings)), true);
  assert.equal(isSearchUrl('https://bing.com/search?q=x', compileSettings(settings)), true);
});

test('custom rules are exact and deduplicated in the matcher', () => {
  const rules = parseCustomRules('\n SEARX.EXAMPLE.ORG /search q\nsearx.example.org /search q\nsite.test / query\n');
  const compiled = compileSettings({ customRules: rules });
  assert.equal(isSearchUrl('https://searx.example.org/search?q=hello', compiled), true);
  assert.equal(isSearchUrl('https://www.searx.example.org/search?q=hello', compiled), false);
  assert.equal(isSearchUrl('https://searx.example.org/searching?q=hello', compiled), false);
  assert.equal(isSearchUrl('https://site.test/?query=hello', compiled), true);
  assert.equal(compiled.hosts.get('searx.example.org').get('/search').size, 1);
});

test('custom rule validation rejects broad or ambiguous rules', () => {
  for (const line of [
    '*.example.com / q', 'https://example.com / q', 'example.com:443 / q',
    'evil.com@google.com / q', 'example.com //evil.com q', 'example.com /x?y q',
    'example.com /x#y q', 'example.com /a/../b q', 'example.com / q.*',
    '-bad.test / q', 'bad..test / q', 'example.com /', 'example.com / q extra',
    'example.com /a\\b q'
  ]) assert.throws(() => parseCustomRules(line), /Line 1:/, line);
  assert.throws(() => parseCustomRules('x'.repeat(16001)), /characters/);
  assert.throws(() => parseCustomRules('site.test / q\n'.repeat(101)), /100/);
});

test('invalid stored settings fail closed rather than widening rules', () => {
  for (const value of [null, [], 1, { enabled: 'false' }, { disabledEngines: 'google' },
    { disabledEngines: ['unknown'] }, { customRules: null }, { customRules: [{}] }]) {
    assert.throws(() => normalizeSettings(value));
  }
  assert.deepEqual(normalizeSettings(), { enabled: true, disabledEngines: [], customRules: [] });
});
