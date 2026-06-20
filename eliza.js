var readLine = require('readline');
var scriptReaderModule = require('./script-reader');
var scriptReader = scriptReaderModule.refToScriptReader;
var speechEngineModule = require('./speech-engine');
var SpeechEngine = speechEngineModule.refToSpeechEngine;

var readLineInterface = readLine.createInterface(process.stdin, process.stdout);
var prompt = '>';

// command-line switches (any order): "debug" for step-by-step tracing,
// "list" for the more faithful list-based decomposition matcher
var args = process.argv.slice(2);
var debugMode = args.indexOf("debug") !== -1;
var useListMatcher = args.indexOf("list") !== -1;
var keywordRulesConstructor = useListMatcher ?
  require('./keyword-rules-list').refToKeywordRules : undefined;

var speechEngine = new SpeechEngine(keywordRulesConstructor);

scriptReader = new scriptReader("./elizaScript.txt");
scriptReader.readScriptAndBuildEngine(speechEngine, debugMode);

readLineInterface.on('line', function(line) {
  var response = speechEngine.analyzeInputLine(line);
  console.log(response);
  readLineInterface.setPrompt(prompt);
  readLineInterface.prompt();
}).on('close', function() {
  console.log("\n" + speechEngine.getRandomGoodbyeLine());
  process.exit(0);
});

console.log(speechEngine.getRandomIntroLine());
readLineInterface.setPrompt(prompt);
readLineInterface.prompt();
