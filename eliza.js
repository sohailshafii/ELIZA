var readLine = require('readline');
var scriptReaderModule = require('./script-reader');
var scriptReader = scriptReaderModule.refToScriptReader;
var speechAnalyzerModule = require('./speech-analyzer');
var speechAnalyzer = speechAnalyzerModule.refToSpeechAnalyzer;
var readLineInterface = readLine.createInterface(process.stdin, process.stdout, null);
var prefix = '>';


var speechAnalyzer = new speechAnalyzer();

scriptReader = new scriptReader("./elizaScript.txt");
scriptReader.readFile(speechAnalyzer);

readLineInterface.on('line', function(line) {
  
  console.log(speechAnalyzer.analyzeInputLine(line));

  readLineInterface.setPrompt(prefix, prefix.length);
  readLineInterface.prompt();
}).on('close', function() {
  console.log("\nHave a nice day.");
  process.exit(0);
});

console.log(scriptReader.getRandomIntroLine());
readLineInterface.setPrompt(prefix, prefix.length);
readLineInterface.prompt();
