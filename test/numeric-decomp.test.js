// Tests for numeric ("n words") decomposition elements.
//
// A decomposition token that is a positive integer n means "exactly n words"
// (0 means "any number of words"). This branch previously referenced an
// undefined variable (a latent crash) and emitted a multi-word pattern, so it
// neither matched exactly n words nor mapped to a single reassembly fragment.
// The script ships only "0" tokens, so these tests drive the rule builder
// directly.

var test = require('node:test');
var assert = require('node:assert');

var KeywordRules = require('../keyword-rules').refToKeywordRules;

function decompRegexFor(decompositionString) {
  var rules = new KeywordRules('test', 0);
  rules.addDecompAndReconstructions({}, decompositionString, ['echo'], false, {});
  return rules.decompArray[0].decompositionRegEx;
}

test('"1" matches exactly one word', function() {
  var re = decompRegexFor('i 1 you');

  assert.ok(re.test('i love you'), 'one word should match');
  assert.strictEqual(re.test('i you'), false, 'zero words should not match');
  assert.strictEqual(re.test('i really love you'), false, 'two words should not match');
});

test('"2" matches exactly two words and is not split out of a single word', function() {
  var re = decompRegexFor('i 2 you');

  assert.ok(re.test('i really love you'), 'two words should match');
  assert.strictEqual(re.test('i love you'), false, 'one word should not match');
});

test('an n-word element is captured as a single reassembly fragment', function() {
  var re = decompRegexFor('i 2 you');
  var match = re.exec('i really love you');

  // groups: 1 = "i", 2 = the two-word span, 3 = "you"
  assert.strictEqual(match[1], 'i');
  assert.strictEqual(match[2], 'really love');
  assert.strictEqual(match[3], 'you');
});
