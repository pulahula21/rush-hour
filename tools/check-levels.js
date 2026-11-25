#!/usr/bin/env node
/*
  Checks every puzzle in index.html with the game's own solver.
    node tools/check-levels.js

  For each campaign level: valid layout (nothing off the board or overlapping), solvable,
  not already solved, and its par (fewest moves). Then the same for every random-mode puzzle.
  Exits with an error code if anything is wrong, so it can run in CI.
*/
const { loadEngine, loadLevels, decode } = require('./game');
const RH = loadEngine(), { LEVELS, BANK } = loadLevels();

let problems = 0;
function check(def){
  const errs = RH.validate(def);
  if(errs.length) return { err: errs.join('; ') };
  const { meta, pos } = RH.parse(def);
  const s = RH.solve(meta, pos, 2000000);
  if(!s) return { err: 'solver gave up (too many positions)' };
  if(s.moves < 0) return { err: 'unsolvable' };
  if(s.moves === 0) return { err: 'already solved at the start' };
  return { par: s.moves, lens: def.map(c => c[3]) };
}

console.log('Campaign');
LEVELS.forEach((L, i) => {
  const r = check(L.cars);
  if(r.err){ problems++; console.log(`  ${String(i+1).padStart(2)}. ${L.name.padEnd(14)} PROBLEM: ${r.err}`); return; }
  const big = r.lens.filter(n => n >= 3).length;
  console.log(`  ${String(i+1).padStart(2)}. ${L.name.padEnd(14)} par ${String(r.par).padStart(2)}  ${L.cars.length} vehicles` +
              (big ? `, ${big} of them 3-4 long` : ''));
});

console.log('\nRandom-mode banks');
for(const [name, packed] of Object.entries(BANK)){
  const list = packed.split(' '), pars = [];
  list.forEach((p, n) => {
    const r = check(decode(p));
    if(r.err){ problems++; console.log(`  ${name} #${n+1} PROBLEM: ${r.err}`); }
    else pars.push(r.par);
  });
  console.log(`  ${name.padEnd(7)} ${list.length} puzzles, par ${Math.min(...pars)}–${Math.max(...pars)}`);
}

console.log(problems ? `\n${problems} problem(s) found.` : '\nAll puzzles check out.');
process.exit(problems ? 1 : 0);
