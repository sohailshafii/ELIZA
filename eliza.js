var readLine = require('readline');
var readLineInterface = readLine.createInterface(process.stdin, process.stdout, null);
var prefix = '>';

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

console.log(prefix + "Hello, I'm Dr. ELIZA. Do you have any problems you want to discuss?");
readLineInterface.setPrompt(prefix, prefix.length);
readLineInterface.prompt();
