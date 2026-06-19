// Regression test for reconstruction fallthrough (stage 5).
//
// attemptReconstruction returns [null, ...] when a keyword's decompositions
// don't match the selected phrase. The reconstruction loop used to treat that
// as a final answer (outputLine = null) and stop, ignoring lower-ranked
// keywords in the stack that could still match. It now falls through to the
// next keyword.

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

test('a higher-ranked keyword that fails to match falls through to a lower-ranked one', function() {
  var engine = buildEngine();
  // DREAMED (rank 4) only has the decomp "0 I DREAMED 0", which cannot match
  // "she dreamed of me" (there is no "I dreamed"). YOU (rank 0) is also in the
  // clause and matches "0 I 0" (after me -> you -> i). The reply must come from
  // YOU rather than collapsing to a content-free remark.
  var out = engine.analyzeInputLine('She dreamed of me.');

  assert.notStrictEqual(out, null, 'expected a reply');
  assert.strictEqual(engine.contentFreeRemarks.indexOf(out), -1,
    'expected the YOU rule to answer, not a content-free fallback: ' + out);
});
