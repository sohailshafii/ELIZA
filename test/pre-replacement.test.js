// Regression test for multi-word pre-replacement expansion (stage 6).
//
// Some pre-replacements expand one token into several words (e.g.
// "i'm" -> "i am", "you're" -> "you are"). Those words were left glued into a
// single "i am" token, so the keywords inside them ("i", "am") were never
// detected and the engine fell back to a content-free remark. The replacement
// is now re-split into separate tokens.

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

test('a contraction that expands to multiple words still matches its keywords', function() {
  var engine = buildEngine();
  // "i'm" -> "i am" must surface the I/AM keywords just like typing "I am".
  var out = engine.analyzeInputLine("I'm unhappy.");

  assert.notStrictEqual(out, null, 'expected a reply');
  assert.strictEqual(engine.contentFreeRemarks.indexOf(out), -1,
    'expected an I/AM reply, not a content-free fallback: ' + out);
});

test('"you\'re" expands and a keyword is detected', function() {
  var engine = buildEngine();
  var out = engine.analyzeInputLine("You're not helping me.");

  assert.notStrictEqual(out, null, 'expected a reply');
  assert.strictEqual(engine.contentFreeRemarks.indexOf(out), -1,
    'expected a keyword-driven reply, not a content-free fallback: ' + out);
});
