var readLine = require('readline');
var scriptReaderModule = require('./script-reader');
var scriptReader = scriptReaderModule.refToScriptReader;
var speechEngineModule = require('./speech-engine');
var speechEngine = speechEngineModule.refToSpeechEngine;

var readLineInterface = readLine.createInterface(process.stdin, process.stdout, null);
var prompt = '>';

var speechEngine = new speechEngine();

scriptReader = new scriptReader("./elizaScript.txt");
scriptReader.readScriptAndBuildEngine(speechEngine);

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
