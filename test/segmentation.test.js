// Regression tests for punctuation segmentation (stage 3).
//
// Decomposition patterns are anchored and cannot match across punctuation, so
// before this fix a leading clause ("Well, ...") blocked every pattern and the
// engine fell back to a content-free remark. ELIZA instead decomposes a single
// clause: the first one that contains a keyword.
//
// analyzeInputLine still logs debug output unconditionally (a separate, later
// cleanup), so we silence console.log around the calls to keep test output
// readable.

var test = require('node:test');
var assert = require('node:assert');
var path = require('node:path');

var SpeechEngine = require('../speech-engine').refToSpeechEngine;
var ScriptReader = require('../script-reader').refToScriptReader;

function buildEngine() {
  var engine = new SpeechEngine();
  var reader = new ScriptReader(path.join(__dirname, '..', 'elizaScript.txt'));
  reader.readScriptAndBuildEngine(engine, false);
  return engine;
}

function silently(fn) {
  var original = console.log;
  console.log = function() {};
  try {
    return fn();
  } finally {
    console.log = original;
  }
}

function reassembliesFor(engine, keyword) {
  var out = [];
  engine.keywordToKeywordRules[keyword].decompArray.forEach(function(decomp) {
    decomp.reconstructionList.forEach(function(recon) {
      out.push(recon.rule.join(' '));
    });
  });
  return out;
}

test('a leading clause with punctuation no longer blocks decomposition', function() {
  var engine = buildEngine();
  // MY has only structured decomps (0 YOUR 0), so before segmentation the
  // leading "Well," made every pattern fail and the reply was content-free.
  var out = silently(function() {
    return engine.analyzeInputLine('Well, my boyfriend is here.');
  });

  assert.notStrictEqual(out, null, 'expected a reply');
  assert.strictEqual(engine.contentFreeRemarks.indexOf(out), -1,
    'expected a MY reassembly, not a content-free fallback: ' + out);
  assert.match(out, /your/i, 'expected the MY rule to fire');
});

test('the same input with and without a leading clause both match the keyword', function() {
  var engine = buildEngine();
  var withLead = silently(function() {
    return engine.analyzeInputLine('But anyway, my car is broken.');
  });
  var withoutLead = silently(function() {
    return engine.analyzeInputLine('My car is broken.');
  });

  [withLead, withoutLead].forEach(function(out) {
    assert.notStrictEqual(out, null);
    assert.strictEqual(engine.contentFreeRemarks.indexOf(out), -1,
      'both phrasings should reach the MY rule, got: ' + out);
  });
});

test('the first clause with a keyword wins over a higher-ranked later clause', function() {
  var engine = buildEngine();
  // MY (rank 2) is in the first clause; COMPUTER (rank 50) is in the second.
  // ELIZA stops at the first keyword-bearing clause, so MY must answer.
  var out = silently(function() {
    return engine.analyzeInputLine('My boyfriend is here. Computer.');
  });
  var computerReplies = reassembliesFor(engine, 'computer');

  assert.notStrictEqual(out, null);
  assert.strictEqual(computerReplies.indexOf(out), -1,
    'the later COMPUTER clause should not win over the earlier MY clause: ' + out);
});

test('a keyword-less leading clause is skipped to reach a later keyword clause', function() {
  var engine = buildEngine();
  // First clause has no keyword; the WHAT keyword is only in the second.
  var out = silently(function() {
    return engine.analyzeInputLine('Hmm okay. What should I do?');
  });
  var whatReplies = reassembliesFor(engine, 'what');

  assert.notStrictEqual(out, null);
  assert.notStrictEqual(whatReplies.indexOf(out), -1,
    'expected a WHAT reassembly from the second clause, got: ' + out);
});
