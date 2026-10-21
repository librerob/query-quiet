import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINES, compileSettings, isSearchUrl, normalizeSettings, parseCustomRules } from '../rules.js';

const defaults = compileSettings();
const matches = raw => isSearchUrl(raw, defaults);

for (const engine of ENGINES) {
  test(`${engine.name}: every declared host and path`, () => {
    for (const host of engine.hosts) for (const path of engine.paths) {
      assert.equal(matches(`https://${host}${path}?${engine.param}=test`), true);
      assert.equal(matches(`https://${host}${path}?${engine.param}=`), false);
      assert.equal(matches(`https://${host}${path}?other=test`), false);
      assert.equal(matches(`https://${host}.example.com${path}?${engine.param}=test`), false);
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
