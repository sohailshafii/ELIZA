// End-to-end conversation tests.
//
// These drive analyzeInputLine the way a real session does. Two of them pin
// exact replies that are deterministic for a fresh engine (only one
// decomposition matches, and reassemblies are returned in order starting from
// the first). The last one replays the canonical Weizenbaum dialogue and just
// checks the engine always answers -- a regression net for crashes or silent
// (null/empty) turns.

var test = require('node:test');
var assert = require('node:assert');
var path = require('node:path');

var SpeechEngine = require('../speech-engine').refToSpeechEngine;
var ScriptReader = require('../script-reader').refToScriptReader;

function buildEngine() {
  var engine = new SpeechEngine();
  new ScriptReader(path.join(__dirname, '..', 'elizaScript.txt'))
    .readScriptAndBuildEngine(engine, false);
  return engine;
}

var CANONICAL_CONVERSATION = [
  'Men are all alike.',
  "They're always bugging us about something or other.",
  'Well, my boyfriend made me come here.',
  "He says I'm depressed much of the time.",
  "It's true. I am unhappy.",
  'I need some help, that much seems certain.',
  'Perhaps I could learn to get along with my mother.',
  'My mother takes care of me.',
  'You are like my father in some ways.'
];

test('reflects "me" to "you", never back to "I"', function() {
  var engine = buildEngine();
  // The MY rule echoes the rest of the clause via token 2. "me" must reflect to
  // "you" exactly once -- the old bug cascaded "me" -> "you" -> "i" and printed
  // "...made I come here."
  var out = engine.analyzeInputLine('Well, my boyfriend made me come here.');

  assert.strictEqual(out, 'Your boyfriend made you come here?');
});

test('canonical opening line gets the expected reply', function() {
  var engine = buildEngine();
  var out = engine.analyzeInputLine('Men are all alike.');

  // ALIKE (rank 10) outranks ARE and is equivalent to DIT.
  assert.strictEqual(out, 'In what way?');
});

test('a specific decomposition wins over the generic catch-all', function() {
  var engine = buildEngine();
  // "you are unhappy" matches the specific "0 YOU ARE 0 (SAD-UNHAPPY-...) 0"
  // rule, the plain "0 YOU ARE 0", and the catch-all "0". The most specific
  // rule (listed first in the script) must win -- decomposition selection used
  // to be random and often produced the generic "You say ."
  var out = engine.analyzeInputLine('I am unhappy.');

  assert.strictEqual(out, 'I am sorry to hear you are unhappy.');
});

test('holds the canonical conversation without crashing or going silent', function() {
  var engine = buildEngine();
  CANONICAL_CONVERSATION.forEach(function(line) {
    var out = engine.analyzeInputLine(line);
    assert.strictEqual(typeof out, 'string', 'no reply to: ' + line);
    assert.ok(out.length > 0, 'empty reply to: ' + line);
  });
});
