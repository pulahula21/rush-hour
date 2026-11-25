// Shared helpers for the level tools. The game's engine and level data live inside index.html
// (in <script id="engine"> and <script id="levels">), so the tools read them from there
// instead of keeping a second copy that could drift out of date.
const fs = require('fs'), path = require('path'), vm = require('vm');

const GAME = path.join(__dirname, '..', 'index.html');
const readGame = () => fs.readFileSync(GAME, 'utf8');

function block(html, id){
  const open = `<script id="${id}">`, a = html.indexOf(open);
  if(a < 0) throw new Error(`index.html has no <script id="${id}"> block`);
  const start = a + open.length, end = html.indexOf('</script>', start);
  return { start, end, code: html.slice(start, end) };
}

// the engine (RH): parse, validate, solve, explore, generate
function loadEngine(){
  return vm.runInNewContext(block(readGame(), 'engine').code + '\n;RH', {});
}

// the campaign levels and the random-mode puzzle banks
function loadLevels(){
  return vm.runInNewContext(block(readGame(), 'levels').code + '\n;({ LEVELS, BANK })', {});
}

// replace the contents of the levels block in index.html
function writeLevels(code){
  const html = readGame(), b = block(html, 'levels');
  fs.writeFileSync(GAME, html.slice(0, b.start) + '\n' + code + html.slice(b.end));
}

// bank puzzles are stored as 4 characters per vehicle: direction, row, column, length
const decode = s => s.match(/[hv]\d\d\d/g).map(t => [t[0], +t[1], +t[2], +t[3]]);
const encode = def => def.map(c => c.join('')).join('');

module.exports = { GAME, readGame, loadEngine, loadLevels, writeLevels, decode, encode };
