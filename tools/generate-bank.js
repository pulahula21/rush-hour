#!/usr/bin/env node
/*
  Generates candidate puzzles into a JSON bank, grouped by par.
    node tools/generate-bank.js --seconds 300 --out bank.json [--seed 42] [--trucks 0.26] [--buses 0.09]

  Each attempt scatters 11-14 vehicles at random, maps every position reachable from that layout,
  and keeps the one farthest from a solution. Running it again with the same --out adds to the file.
  It is single-threaded, so run a few copies with different seeds to use more CPU cores,
  then pass all the files to build-levels.js.
*/
const fs = require('fs');
const { loadEngine, encode } = require('./game');
const RH = loadEngine();

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i+1] : def; };
const seconds = +arg('seconds', 120), out = arg('out', 'bank.json');
let seed = +arg('seed', Date.now() % 1e9);
const rng = () => ((seed = (seed*1664525 + 1013904223) >>> 0) / 4294967296);

const bank = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
const end = Date.now() + seconds*1000;
let boards = 0, kept = 0;
while(Date.now() < end){
  const r = RH.generate({ rng, minPar:4, maxPar:99, minCars:11, maxCars:14,
                          trucks:+arg('trucks', 0.26), buses:+arg('buses', 0.09), attempts:1, cap:200000 });
  boards++;
  if(!r) continue;
  const k = encode(r.def);
  bank[r.par] = bank[r.par] || {};
  if(!(k in bank[r.par])){ bank[r.par][k] = r.states; kept++; }
}
fs.writeFileSync(out, JSON.stringify(bank));
const pars = Object.keys(bank).map(Number).sort((a,b) => a-b);
console.log(`${boards} boards tried, ${kept} new puzzles saved to ${out}`);
console.log('puzzles by par: ' + pars.map(p => `${p}:${Object.keys(bank[p]).length}`).join('  '));
