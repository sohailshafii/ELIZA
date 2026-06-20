// Tests for R5 PRE rules.
//
// A PRE reassembly ("pre: <template> = <keyword>") rebuilds the text from the
// template (substituting decomposition fragments), then re-dispatches to
// another keyword on that rebuilt text. YOU'RE and I'M use it to reflect
// contractions: e.g. "I'm sad" -> substitute to "you're sad" -> rebuild
// "you are sad" -> answer with the I keyword.

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

test("I'M rebuilds the text and re-dispatches to the I keyword", function() {
  var engine = buildEngine();
  var out = engine.analyzeInputLine("I'm sad.");

  assert.strictEqual(out, 'I am sorry to hear you are sad.');
});

test("YOU'RE rebuilds the text and re-dispatches to the YOU keyword", function() {
  var engine = buildEngine();
  var out = engine.analyzeInputLine("You're not helping me.");

  assert.strictEqual(out, 'What makes you think I am not helping you?');
});
