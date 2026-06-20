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

test('MY answers normally and stashes a distinct memory that is recalled later', function() {
  var engine = buildEngine();

  // MY replies normally...
  var reply = engine.analyzeInputLine('My cat died.');
  assert.strictEqual(reply, 'Your cat died?');

  // ...and a keyword-less line surfaces the stored memory, not a content-free
  // remark, with a phrasing distinct from the immediate reply.
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
