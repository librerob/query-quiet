import test from 'node:test';
import assert from 'node:assert/strict';

let sequence = 0;
async function worker({ settings, readError = false, deleteError = false } = {}) {
  let resolveRead, rejectRead;
  const reads = new Promise((resolve, reject) => { resolveRead = resolve; rejectRead = reject; });
  const deleted = [], warnings = [];
  let visit, change;
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  globalThis.chrome = {
    history: {
      onVisited: { addListener(fn) { visit = fn; } },
      deleteUrl({ url }) { deleted.push(url); return deleteError ? Promise.reject(new Error(`secret: ${url}`)) : Promise.resolve(); }
    },
    storage: {
      onChanged: { addListener(fn) { change = fn; } },
      local: { get(key) { assert.equal(key, 'settings'); return reads; } }
    }
  };
  await import(`../background.js?instance=${sequence++}`);
  assert.equal(typeof visit, 'function', 'visit listener registered before storage resolves');
  assert.equal(typeof change, 'function');
  return {
    deleted, warnings, visit, change,
    load() { readError ? rejectRead(new Error('secret read error')) : resolveRead({ settings }); },
    close() { console.warn = originalWarn; delete globalThis.chrome; }
  };
}
const search = 'https://www.google.com/search?q=private-test';

test('cold starts wait for persisted settings, then delete exact URL without scanning', async () => {
  const w = await worker();
  try {
    const pending = w.visit({ url: search });
    assert.deepEqual(w.deleted, []);
    w.load();
    await pending;
    assert.deepEqual(w.deleted, [search]);
    const next = w.visit({ url: search });
    assert.equal(w.deleted.length, 2, 'warm deletion is requested synchronously');
    await next;
    await w.visit({ url: 'https://example.com/?q=keep' });
    await w.visit({});
    assert.equal(w.deleted.length, 2);
  } finally { w.close(); }
});

test('a persisted pause survives worker restart', async () => {
  const w = await worker({ settings: { enabled: false } });
  try {
    const pending = w.visit({ url: search });
    w.load(); await pending;
    await w.visit({ url: search });
    assert.deepEqual(w.deleted, []);
  } finally { w.close(); }
});

test('multiple visits delivered during a cold start are all handled', async () => {
  const w = await worker();
  try {
    const urls = [search, 'https://bing.com/images/search?q=cold', 'https://search.yahoo.com/search;_ylt=abc?p=cold'];
    const pending = urls.map(url => w.visit({ url }));
    pending.push(w.visit({ url: 'https://example.com/search?q=keep' }));
    assert.deepEqual(w.deleted, []);
    w.load();
    await Promise.all(pending);
    assert.deepEqual(w.deleted.toSorted(), urls.toSorted());
  } finally { w.close(); }
});

test('storage change wins against an older cold-start read', async () => {
  const w = await worker({ settings: { enabled: true } });
  try {
    const pending = w.visit({ url: search });
    w.change({ settings: { newValue: { enabled: false } } }, 'local');
    w.load(); await pending;
    assert.deepEqual(w.deleted, []);
    w.change({ settings: { newValue: { enabled: true } } }, 'sync');
    await w.visit({ url: search });
    assert.deepEqual(w.deleted, []);
    w.change({ settings: { newValue: { enabled: true } } }, 'local');
    await w.visit({ url: search });
    assert.deepEqual(w.deleted, [search]);
  } finally { w.close(); }
});

test('read failure does not delete; a later valid settings event recovers', async () => {
  const w = await worker({ readError: true });
  try {
    const pending = w.visit({ url: search });
    w.load(); await pending;
    assert.deepEqual(w.deleted, []);
    assert.equal(w.warnings.length, 1);
    w.change({ settings: { newValue: {} } }, 'local');
    await w.visit({ url: search });
    assert.deepEqual(w.deleted, [search]);
  } finally { w.close(); }
});

test('invalid settings pause deletion; removing settings restores defaults', async () => {
  const w = await worker({ settings: { customRules: [{}] } });
  try {
    w.load(); await w.visit({ url: search });
    assert.deepEqual(w.deleted, []);
    assert.match(w.warnings[0], /invalid settings/);
    w.change({ settings: { newValue: {} } }, 'local');
    w.change({ settings: { newValue: { enabled: 'false' } } }, 'local');
    await w.visit({ url: search });
    assert.deepEqual(w.deleted, []);
    w.change({ settings: {} }, 'local');
    await w.visit({ url: search });
    assert.deepEqual(w.deleted, [search]);
  } finally { w.close(); }
});

test('a late failed read does not misreport a newer valid settings event', async () => {
  const w = await worker({ readError: true });
  try {
    const pending = w.visit({ url: search });
    w.change({ settings: { newValue: {} } }, 'local');
    w.load(); await pending;
    assert.deepEqual(w.deleted, [search]);
    assert.deepEqual(w.warnings, []);
  } finally { w.close(); }
});

test('deletion errors are handled without exposing queries', async () => {
  const w = await worker({ deleteError: true });
  try {
    w.load(); await w.visit({ url: search });
    assert.deepEqual(w.deleted, [search]);
    assert.equal(w.warnings.length, 1);
    assert.equal(w.warnings.join('').includes('private-test'), false);
    assert.equal(w.warnings.join('').includes('secret'), false);
  } finally { w.close(); }
});
