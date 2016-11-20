var readLine = require('readline');
var scriptReaderModule = require('./script-reader');
var scriptReader = scriptReaderModule.refToScriptReader;
var readLineInterface = readLine.createInterface(process.stdin, process.stdout, null);
var prefix = '>';

scriptReader = new scriptReader("./elizaScript.txt");
scriptReader.readFile();

readLineInterface.on('line', function(line) {
  
  console.log(scriptReader.analyzeLine(line));

  readLineInterface.setPrompt(prefix, prefix.length);
  readLineInterface.prompt();
}).on('close', function() {
  console.log("\nHave a nice day.");
  process.exit(0);
});

console.log(scriptReader.getRandomIntroLine());
readLineInterface.setPrompt(prefix, prefix.length);
readLineInterface.prompt();
