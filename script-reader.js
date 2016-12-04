
function ScriptReader(scriptFileName) {
  this.scriptFileName = scriptFileName;
}

ScriptReader.prototype =
{

  readFile: function(speechEngine) {
    var fs = require('fs');

    try {
      var fileData = fs.readFileSync(this.scriptFileName, 'utf8');
      var lines = fileData.split('\n');
      speechEngine.analyzeScript(lines);
    } 
    catch(e) 
    {
      console.log("Script read error: ", e.stack);
    }
    speechEngine.barf();
  }
};

exports.refToScriptReader = ScriptReader;



