// Tests for the list-based decomposition matcher (the "list" switch).
//
// The list matcher should agree with the default regex matcher on a fresh
// engine (first reassembly of each rule). It also reproduces one detail more
// faithfully: an alternation like (SAD-UNHAPPY-...) is a single decomposition
// with a single reassembly cycle, whereas the regex matcher pre-expands it into
// one decomposition per branch (each with its own cycle).

var test = require('node:test');
var assert = require('node:assert');
var path = require('node:path');

var SpeechEngine = require('../speech-engine').refToSpeechEngine;
var ScriptReader = require('../script-reader').refToScriptReader;
var ListRules = require('../keyword-rules-list').refToKeywordRules;

var SCRIPT = path.join(__dirname, '..', 'elizaScript.txt');

function buildEngine(rulesConstructor) {
  var engine = new SpeechEngine(rulesConstructor);
  new ScriptReader(SCRIPT).readScriptAndBuildEngine(engine, false);
  return engine;
}

function reply(rulesConstructor, input) {
  return buildEngine(rulesConstructor).analyzeInputLine(input);
}

test('the list matcher agrees with the regex matcher on fresh-engine replies', function() {
  var inputs = [
    'Men are all alike.',
    'My boyfriend made me come here.',
    'I am unhappy.',
    'I am happy.',
    "I'm sad.",
    "You're not helping me.",
    'I usually win at blackjack.',
    'Are you a computer?',
    'Everybody hates me.',
    'My mother takes care of me.',
    'Can you help me?',
    "Why can't you help me?"
  ];

  inputs.forEach(function(input) {
    assert.strictEqual(reply(ListRules, input), reply(undefined, input),
      'matchers disagree for: ' + input);
  });
});

test('a literal token does not match inside a larger word (inherent to list matching)', function() {
  // "unhappy" must not satisfy the "happy" branch of the alternation
  var engine = buildEngine(ListRules);
  var out = engine.analyzeInputLine('I am unhappy.');
  assert.strictEqual(out, 'I am sorry to hear you are unhappy.');
});

test('an alternation shares one reassembly cycle (more faithful than regex)', function() {
  // First a SAD-branch reply advances the shared cycle, so a later branch reply
  // uses the next reassembly. The regex matcher, which splits the branches,
  // would restart the cycle instead.
  var engine = buildEngine(ListRules);

  var first = engine.analyzeInputLine('I am unhappy.');
  assert.strictEqual(first, 'I am sorry to hear you are unhappy.');

  var second = engine.analyzeInputLine('I am sad.');
  assert.strictEqual(second, 'Do you think coming here will help you not to be sad?');
});
