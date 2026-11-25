#!/usr/bin/env node
/*
  Rebuilds the campaign and the random-mode banks in index.html from generated puzzles.
    node tools/build-levels.js bank1.json [bank2.json ...]

  Keeps the first TUTORIAL levels already in index.html as they are, then fills one level per
  entry in CAMPAIGN with the most interesting puzzle at that par (the one whose shortest
  solution moves the most different vehicles). Every second level prefers a puzzle with a
  4-long truck or bus. Run tools/check-levels.js afterwards.
*/
const fs = require('fs');
const { loadEngine, loadLevels, writeLevels, decode } = require('./game');
const RH = loadEngine(), { LEVELS } = loadLevels();

const TUTORIAL = 3;
const CAMPAIGN = [
  ['Side Street', 5], ['Fender Bender', 6], ['Double Parked', 7], ['Loading Zone', 8], ['Valet', 9],
  ['Cul-de-Sac', 10], ['Roundabout', 11], ['Merge Lane', 12], ['Toll Booth', 13], ['Bottleneck', 14],
  ['Traffic Jam', 15], ['Jackknife', 16], ['Detour', 18], ['Lane Closure', 20], ['Pileup', 22],
  ['Double Jam', 24], ['Stadium Lot', 27], ['Grand Prix', 35],
];
const BANKS = { easy:[6, 9, 60], medium:[10, 15, 60], hard:[16, 99, 140] };   // par range and size
const SHARE_WITH_BUS = 0.3;

const files = process.argv.slice(2);
if(!files.length){ console.error('usage: node tools/build-levels.js bank.json [more.json ...]'); process.exit(1); }
const all = {};
for(const f of files){
  const b = JSON.parse(fs.readFileSync(f, 'utf8'));
  for(const p in b){ all[p] = all[p] || {}; Object.assign(all[p], b[p]); }
}

const has4 = e => /[hv]\d\d4/.test(e);
const used = new Set();
function interest(e){
  const { meta, pos } = RH.parse(decode(e)), s = RH.solve(meta, pos);
  return new Set(s.path.map(m => m.car)).size*10 - meta.length;
}
function pick(par, wantBus){
  let c = Object.keys(all[par] || {}).filter(e => !used.has(e));
  if(wantBus && c.some(has4)) c = c.filter(has4);
  if(!c.length) throw new Error(`no unused puzzle with par ${par}; generate more or change CAMPAIGN`);
  let best = c[0], bs = -1e9;
  for(const e of c.slice(0, 80)){ const s = interest(e); if(s > bs){ bs = s; best = e; } }
  used.add(best);
  return best;
}

const campaign = LEVELS.slice(0, TUTORIAL).map(L => ({ name:L.name, cars:L.cars }));
CAMPAIGN.forEach(([name, par], i) => campaign.push({ name, cars:decode(pick(par, i % 2 === 1)) }));

let seed = 7;
const rnd = () => ((seed = (seed*1664525 + 1013904223) >>> 0) / 4294967296);
const shuffle = a => { for(let i=a.length-1; i>0; i--){ const j = Math.floor(rnd()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const banks = {};
for(const [name, [lo, hi, n]] of Object.entries(BANKS)){
  const bus = [], other = [];
  for(let p=lo; p<=hi; p++) for(const e of Object.keys(all[p] || {})) if(!used.has(e)) (has4(e) ? bus : other).push(e);
  const k = Math.min(bus.length, Math.round(n*SHARE_WITH_BUS));
  banks[name] = shuffle(shuffle(bus).slice(0, k).concat(shuffle(other).slice(0, n-k)));
}

const code =
  'const LEVELS = [\n' +
  campaign.map(L => `  { name:${JSON.stringify(L.name)}, cars:${JSON.stringify(L.cars).replace(/"/g, "'")} }`).join(',\n') +
  '\n];\n' +
  '// Random-mode puzzles, generated and solver-checked offline. Each vehicle is 4 characters: direction, row, col, length.\n' +
  'const BANK = {\n' + Object.entries(banks).map(([k, v]) => `  ${k}: ${JSON.stringify(v.join(' '))}`).join(',\n') + '\n};\n';
writeLevels(code);
console.log(`Wrote ${campaign.length} campaign levels and ` +
  Object.entries(banks).map(([k, v]) => `${v.length} ${k}`).join(', ') + ' puzzles into index.html.');
