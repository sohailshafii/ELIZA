// Regression test for word-boundary anchoring of literal decomp tokens
// (stage 7).
//
// Literal keyword tokens in a decomposition were not anchored, so they matched
// inside larger words: "you are unhappy" matched the "0 YOU ARE 0 (HAPPY-...)
// 0" decomp because "happy" is a substring of "unhappy", producing replies
// like "How have I helped you to be happy?" for someone saying they are sad.

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

test('a literal decomp token does not match inside a larger word', function() {
  var engine = buildEngine();
  var iRules = engine.keywordToKeywordRules['i'];
  // the "0 YOU ARE 0 (HAPPY-...) 0" decomp, expanded to the happy permutation
  var happyDecomp = iRules.decompArray.filter(function(decomp) {
    return /\(happy\)/.test(decomp.decompositionRegEx.source);
  })[0];

  assert.ok(happyDecomp, 'expected a decomp containing the happy token');
  assert.strictEqual(happyDecomp.decompositionRegEx.test('you are unhappy'), false,
    'the happy decomp must not match "unhappy"');
  assert.strictEqual(happyDecomp.decompositionRegEx.test('you are happy'), true,
    'the happy decomp must still match the whole word "happy"');
});

test('apostrophe tokens still match as whole words', function() {
  var engine = buildEngine();
  var iRules = engine.keywordToKeywordRules['i'];
  var cantDecomp = iRules.decompArray.filter(function(decomp) {
    return /\(can't\)/.test(decomp.decompositionRegEx.source);
  })[0];

  assert.ok(cantDecomp, "expected a decomp containing the can't token");
  assert.strictEqual(cantDecomp.decompositionRegEx.test('you can\'t sleep'), true,
    "the can't decomp must still match \"can't\"");
});
