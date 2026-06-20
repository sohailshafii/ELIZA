// Test for multi-word pre-replacement expansion.
//
// A pre-replacement may expand one token into several words (e.g.
// "gonna" -> "going to"). Those words must be re-split into separate tokens so
// the words inside can be matched as keywords. The DOCTOR script no longer uses
// a multi-word pre-replacement (YOU'RE/I'M are PRE rules now), so this drives a
// minimal in-memory script to exercise the feature directly.

var test = require('node:test');
var assert = require('node:assert');

var SpeechEngine = require('../speech-engine').refToSpeechEngine;

test('a multi-word pre-replacement is re-split into separate tokens', function() {
  var engine = new SpeechEngine();
  engine.analyzeScript([
    'pre-replacement: GONNA=GOING TO',
    'key: TO',
    '\tdecomp: 0',
    '\t\treassembly: Going somewhere, I see.',
    '\tenddecomp',
    'endkey'
  ]);

  // "gonna" must expand to two tokens so the "to" token matches the TO keyword;
  // if it stayed a single "going to" token, no keyword would match.
  var out = engine.analyzeInputLine('I am gonna leave.');

  assert.strictEqual(out, 'Going somewhere, I see.');
});
