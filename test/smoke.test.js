// Smoke test: the app should start and respond without crashing.
//
// This is intentionally minimal. It guards the startup regression fixed in
// the "null readline completer" change. More comprehensive engine-level tests
// (keyword matching, decomposition/reassembly, punctuation segmentation,
// memory) should be added in later stages, once the matching logic itself is
// corrected and worth pinning down.

var test = require('node:test');
var assert = require('node:assert');
var path = require('node:path');
var spawnSync = require('node:child_process').spawnSync;

var elizaPath = path.join(__dirname, '..', 'eliza.js');

test('eliza starts, responds to a line, and exits cleanly', function() {
  var result = spawnSync('node', [elizaPath], {
    input: 'Men are all alike.\n',
    encoding: 'utf8',
    timeout: 10000
  });

  // It must not crash on startup (the null-completer bug exited non-zero
  // before printing anything).
  assert.strictEqual(result.status, 0,
    'expected clean exit, got status ' + result.status + '\nstderr:\n' + result.stderr);
  assert.strictEqual(result.signal, null, 'process should not be killed by a signal');

  // An intro line plus the prompt are printed (the exact intro/goodbye lines
  // are chosen at random, so we only assert on the always-present prompt and
  // that some output was produced).
  assert.ok(result.stdout.trim().length > 0, 'expected some output');
  assert.match(result.stdout, />/, 'expected the prompt to be printed');
});
