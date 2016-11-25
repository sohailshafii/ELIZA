
function ScriptReader(scriptFileName) {
  this.scriptFileName = scriptFileName;
  this.introductoryLines = [];

  this.phraseRegEx = /^[^\(\)]+/;
}

ScriptReader.prototype =
{
  getRandomIntroLine: function()
  {
    var numTotalLines = this.introductoryLines.length;
    var randomIndex = parseInt(Math.random()*numTotalLines);
    return this.introductoryLines[randomIndex];
  },

  testSnippetAgainstPhraseRegEx: function(snippet) {
    return this.phraseRegEx.exec(snippet);
  },

  analyzeScriptLine: function(line, speechAnalyzer) {

    for (var charIndex = 0, lineLength = line.length;
      charIndex < lineLength; charIndex++) {
      var currentCharacter = line[charIndex];

      if (currentCharacter == '(')
      {
        this.openParenCount++;
      }
      else if (currentCharacter == ')')
      {
        this.openParenCount--;
      }
      else {
        var regExResult = this.testSnippetAgainstPhraseRegEx(line.substr(charIndex, lineLength-1));
        if (regExResult != null)
        {
          var matchTrimmedSpaces = regExResult[0].replace(/(^\s+|\s+$)/g,'');
          if (matchTrimmedSpaces.length > 0)
          {
            // exclude substitutions for now
            if (matchTrimmedSpaces.includes("=")) return;

            if (this.currentKeyword == null)
            {
              this.currentKeyword = matchTrimmedSpaces;
            }
            else if (this.curentDecompRule == null)
            {
              this.curentDecompRule = matchTrimmedSpaces;
            }
            else
            {
              // if the open paren count is 3, that means continue last
              // reconstruction
              if (this.trailingSentence)
              {
                var lastReconstrIndex = this.currentReconstructions.length-1;
                var lastReconstr = this.currentReconstructions[lastReconstrIndex];
                this.trailingSentence = false;
                lastReconstr += " " + matchTrimmedSpaces;
                this.currentReconstructions[lastReconstrIndex] = lastReconstr;
              }
              else
                this.currentReconstructions.push(matchTrimmedSpaces);
            }
          }
          // move to last character
          charIndex += regExResult.index + regExResult[0].length-1;
        }
      }

      // after last open paren is closed, look for new keyword
      if (this.openParenCount == 0)
      {
        this.currentKeyword = null;
      }
      // when we have closed all but one parenthesis,
      // we have to look for reconstruction again
      if (this.openParenCount == 1)
      {
        console.log(this.currentKeyword + ", decomp rules for " + this.curentDecompRule + ": " +
          this.currentReconstructions);
        speechAnalyzer.addDecompRules(this.currentKeyword, 1, this.curentDecompRule, this.currentReconstructions);
        this.curentDecompRule = null;
        this.currentReconstructions = [];
      }

    }
  },

  readFile: function(speechAnalyzer) {
    var fs = require('fs');

    try {
      var fileData = fs.readFileSync(this.scriptFileName, 'utf8');
      var lines = fileData.split('\n');
      var numLines = lines.length;
     
      var commentRe = /#.*/;
      var startIndicator = /START/;

      var finishedIntroductorySection = false;

      this.openParenCount = 0;
      this.currentKeyword = null;
      this.curentDecompRule = "";
      this.currentReconstructions = [];
      this.lastLineHadClosingParen = false;

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
          this.analyzeScriptLine(currentLine, speechAnalyzer);
          var trimmedLine = currentLine.trim();
          this.trailingSentence = (trimmedLine[trimmedLine.length-1] !== ')' &&
            this.currentKeyword != null);
        }
      }
    } 
    catch(e) 
    {
      console.log("Script read error: ", e.stack);
    }
    speechAnalyzer.barf();
  }
};

exports.refToScriptReader = ScriptReader;



