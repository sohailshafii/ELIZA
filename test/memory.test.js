// Tests for the MEMORY rule (R6).
//
// When a keyword with a MEMORY rule (MY) answers, ELIZA forms a separate phrase
// from the same clause and stashes it. Later, when an input yields no keyword,
// that stored phrase is recalled instead of a content-free remark. The recalled
// phrasing is distinct from the immediate reply.

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

test('the MEMORY rule is parsed into a separate rule set', function() {
  var engine = buildEngine();
  assert.ok(engine.keywordToMemoryRules.hasOwnProperty('my'),
    'expected a MEMORY rule for MY');
  assert.ok(!engine.keywordToKeywordRules.hasOwnProperty('memory'),
    'the memory block must not create a "memory" keyword');
});

test('MY answers normally and stashes a distinct memory, recalled on the LIMIT==4 turn', function() {
  var engine = buildEngine();

  // turn 1 (LIMIT 2): MY replies normally and stashes a memory
  var reply = engine.analyzeInputLine('My cat died.');
  assert.strictEqual(reply, 'Your cat died?');

  // turn 2 (LIMIT 3): a keyword-less line does NOT recall yet -- the memory is
  // delivered only on the deterministic 1-in-4 turn, so this is content-free
  var notYet = engine.analyzeInputLine('xyzzy');
  assert.notStrictEqual(engine.contentFreeRemarks.indexOf(notYet), -1,
    'memory should not surface before the LIMIT==4 turn');

  // turn 3 (LIMIT 4): now the stored memory surfaces, distinct from the reply
  var recalled = engine.analyzeInputLine('xyzzy');
  assert.strictEqual(recalled, "Let's discuss further why your cat died.");
  assert.notStrictEqual(recalled, reply);
});

test('with nothing remembered, a keyword-less line falls back to a content-free remark', function() {
  var engine = buildEngine();
  var out = engine.analyzeInputLine('xyzzy');

  assert.notStrictEqual(out, null);
  assert.notStrictEqual(engine.contentFreeRemarks.indexOf(out), -1,
    'expected a content-free remark when the memory stack is empty');
});
