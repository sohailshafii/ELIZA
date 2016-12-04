var readLine = require('readline');
var scriptReaderModule = require('./script-reader');
var scriptReader = scriptReaderModule.refToScriptReader;
var speechEngineModule = require('./speech-engine');
var speechEngine = speechEngineModule.refToSpeechEngine;
var readLineInterface = readLine.createInterface(process.stdin, process.stdout, null);
var prefix = '>';


var speechEngine = new speechEngine();

scriptReader = new scriptReader("./elizaScript.txt");
scriptReader.readFile(speechEngine);

readLineInterface.on('line', function(line) {
  
  console.log(speechEngine.analyzeInputLine(line));

  readLineInterface.setPrompt(prefix, prefix.length);
  readLineInterface.prompt();
}).on('close', function() {
  console.log("\nHave a nice day.");
  process.exit(0);
});

console.log(speechEngine.getRandomIntroLine());
readLineInterface.setPrompt(prefix, prefix.length);
readLineInterface.prompt();
