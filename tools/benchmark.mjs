import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { compileSettings, isSearchUrl } from '../rules.js';

const samples = [
  'https://example.com/', 'https://example.com/article?q=keep',
  'https://www.google.com/search?q=synthetic+query&sourceid=chrome',
  'https://duckduckgo.com/?q=synthetic', 'https://www.bing.com/search?q=synthetic',
  'https://search.yahoo.com/search?p=synthetic', 'https://www.google.com/maps?q=keep',
  'https://google.com.evil.test/search?q=keep'
];
const compiled = compileSettings();
let matches = 0;
for (let i = 0; i < 50000; i++) isSearchUrl(samples[i % samples.length], compiled);
const rounds = [];
for (let round = 0; round < 7; round++) {
  const start = performance.now();
  for (let i = 0; i < 100000; i++) matches += Number(isSearchUrl(samples[i % samples.length], compiled));
  rounds.push((performance.now() - start) * 1000 / 100000);
}
rounds.sort((a, b) => a - b);
console.log(JSON.stringify({
  runtime: process.version, platform: `${process.platform} ${process.arch}`, cpu: cpus()[0]?.model,
  iterationsPerRound: 100000, rounds: rounds.length, matched: matches,
  medianMicrosecondsPerUrl: Number(rounds[3].toFixed(3)),
  fastestMicrosecondsPerUrl: Number(rounds[0].toFixed(3)),
  slowestMicrosecondsPerUrl: Number(rounds.at(-1).toFixed(3)),
  scope: 'Warm matcher only; excludes Chrome startup, storage, history API, and Omnibox latency.'
}, null, 2));
