function ScriptReader(scriptFileName) {
  this.scriptFileName = scriptFileName;
  this.introductoryLines = [];
}

ScriptReader.prototype =
{
  analyzeLine: function(line) {
  
  },

  getRandomIntroLine: function()
  {
    var numTotalLines = this.introductoryLines.length;
    var randomIndex = parseInt(Math.random()*numTotalLines);
    return this.introductoryLines[randomIndex];
  },

  readFile: function() {
    var fs = require('fs');
    try {
      var fileData = fs.readFileSync(this.scriptFileName, 'utf8');
      var lines = fileData.split('\n');
      var numLines = lines.length;
     
      var commentRe = /#.*/;
      var startIndicator = /START/;
      var finishedIntroductorySection = false;

      for(var lineIndex = 0; lineIndex < numLines; lineIndex++) 
      {
        var currentLine = lines[lineIndex];
        if (commentRe.exec(currentLine) !== null) continue;
        
        if (!finishedIntroductorySection)
        {
          finishedIntroductorySection = startIndicator.exec(currentLine);
          if (!finishedIntroductorySection)
            this.introductoryLines.push(currentLine);
        }
        else
        {

        }
      }
    } 
    catch(e) 
    {
      console.log("Script read error: ", e.stack);
    }

  }
};

exports.refToScriptReader = ScriptReader;



