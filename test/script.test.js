// Regression tests for the script-parsing fixes (stage 2).
//
// These introspect the parsed engine structure rather than the chat output,
// because reassembly lines are chosen at random and would make output-based
// assertions flaky. They pin down the bugs caused by mistyped block
// terminators (enddecmp / endecomp / bare "decomp") that silently dropped
// rules or leaked reassemblies across decomp boundaries.

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

// All reassembly strings for a keyword, flattened across its decomps.
function reassembliesFor(engine, keyword) {
  var rules = engine.keywordToKeywordRules[keyword];
  var out = [];
  rules.decompArray.forEach(function(decomp) {
    decomp.reconstructionList.forEach(function(recon) {
      out.push(recon.rule.join(' '));
    });
  });
  return out;
}

test('ALIKE keyword registers its decomp (bare "decomp" terminator was dropping it)', function() {
  var engine = buildEngine();
  var alike = engine.keywordToKeywordRules['alike'];
  assert.ok(alike, 'ALIKE keyword should exist');
  assert.ok(alike.decompArray.length >= 1,
    'ALIKE should have at least one decomp, got ' + alike.decompArray.length);
});

test('YOUR keyword registers its decomp (enddecmp typo was dropping the first block)', function() {
  var engine = buildEngine();
  var your = engine.keywordToKeywordRules['your'];
  assert.ok(your, 'YOUR keyword should exist');
  assert.ok(your.decompArray.length >= 1,
    'YOUR should have at least one decomp, got ' + your.decompArray.length);
});

test('BELIEF reassemblies do not leak into a non-BELIEF decomp under I', function() {
  var engine = buildEngine();
  var iRules = engine.keywordToKeywordRules['i'];
  var beliefVerbs = /(feel|think|believe|wish)/;

  // "0 YOU /BELIEF YOU 0" expands into one decomp per family member, so the
  // BELIEF reassembly legitimately appears once per belief verb. The endecomp
  // typo previously also leaked it into the following plain "0 YOU ARE 0"
  // decomp. So: every decomp carrying the BELIEF line must be a BELIEF decomp,
  // and the plain "you are" decomp must not carry it.
  var decompsWithBelief = iRules.decompArray.filter(function(decomp) {
    return decomp.reconstructionList.some(function(recon) {
      return recon.rule.join(' ') === 'Do you really think so?';
    });
  });

  assert.ok(decompsWithBelief.length > 0, 'BELIEF reassembly should exist somewhere');
  decompsWithBelief.forEach(function(decomp) {
    assert.match(decomp.decompositionRegEx.source, beliefVerbs,
      'BELIEF reassembly leaked into a non-BELIEF decomp: ' + decomp.decompositionRegEx.source);
  });
});

test('the dropped "What are you feelings now?" reassembly is registered under YOU', function() {
  var engine = buildEngine();
  var reassemblies = reassembliesFor(engine, 'you');
  assert.ok(reassemblies.indexOf('What are you feelings now?') !== -1,
    'the reasesmbly-typo line should now be parsed as a reassembly');
});
