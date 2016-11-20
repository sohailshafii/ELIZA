function ScriptReader(scriptFileName) {
  this.scriptFileName = scriptFileName;
  this.introductoryLines = [];

  this.openingParenCount = 0;
  this.closingParenCount = 0;
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

  handleWord: function(trimmedLine) {
    // grab next word
    console.log(trimmedLine + "--" + trimmedLine.match(/^[^\s\)]+/));
  },

  analyzeScriptLine: function(line) {
    for (var charIndex = 0, lineLength = line.length;
      charIndex < lineLength; charIndex++) {
      var currentCharacter = line[charIndex];

      if (currentCharacter == '(')
        this.openingParenCount++;
      else if (currentCharacter == ')')
        this.closingParenCount++;
      else {
        this.handleWord(line.substr(charIndex, lineLength-1));
      }
    }
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
          {
            var trimmedIntroLine = currentLine.replace(/(^\()|(\)$)/g, "");
            this.introductoryLines.push(trimmedIntroLine);
          }
        }
        else
        {
          this.analyzeScriptLine(currentLine);
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



