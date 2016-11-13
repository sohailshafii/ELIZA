var readLine = require('readline');
var scriptReaderModule = require('./script-reader');
var scriptReader = scriptReaderModule.refToScriptReader;
var readLineInterface = readLine.createInterface(process.stdin, process.stdout, null);
var prefix = '>';

scriptReader = new scriptReader("./elizaScript.txt");
scriptReader.readFile();

readLineInterface.on('line', function(line) {
  switch(line.trim()) {
    case 'hello':
      console.log('world!');
      break;
    default:
      console.log('Say what? I might have heard `' + line.trim() + '`');
      break;
  }
  readLineInterface.setPrompt(prefix, prefix.length);
  readLineInterface.prompt();
}).on('close', function() {
  console.log("Have a nice day.");
  process.exit(0);
});

console.log(prefix + scriptReader.getRandomIntroLine());
readLineInterface.setPrompt(prefix, prefix.length);
readLineInterface.prompt();
