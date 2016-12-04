var keywordRulesModule = require('./keyword-rules');
var keywordRulesRef = keywordRulesModule.refToKeywordRules;
var replaceKeywordRef = keywordRulesModule.refToReplaceKeyword;

function SpeechEngine(){
  this.keywordToKeywordRules = { };
  this.keywordToReplacementKeyword = { };
  this.introductoryLines = [];
}

SpeechEngine.prototype =
{
  analyzeScript: function(lines)
  {
    var numLines = lines.length;
    var commentRegEx = /#.*/;
    var introRegEx = /Intro:\s*(.+)/;
    var replacementRegEx = /pre-replacement:\s*(.+)\s+(.+)\s*/;

    this.currentKeyword = null;
    this.currentRank = 0;
    this.curentDecompRule = "";
    this.currentReconstructions = [];

    for(var lineIndex = 0; lineIndex < numLines; lineIndex++) 
    {
      var currentLine = lines[lineIndex];
      if (commentRegEx.test(currentLine)) continue;

      var introLineTest = introRegEx.exec(currentLine);
      var replacementTest = replacementRegEx.exec(currentLine);

      if (introLineTest != null)
      {
        this.introductoryLines.push(introLineTest[1]);
      }
      else if (replacementTest != null)
      {
        var keyword = replacementTest[1],
          replacementKeyword = replacementTest[2];
        if (!this.keywordToReplacementKeyword.hasOwnProperty(keyword))
        {
          this.keywordToReplacementKeyword[keyword] = replacementKeyword;
        }
      }
      else 
      {
        this.analyzeScriptLineForKeywordRules(currentLine);
      }
    }
  },

  analyzeScriptLineForKeywordRules: function(line) {
    // trim spaces at beginning and end
    var lineTrimmedSpaces = line.replace(/(^\s+|\s+$)/g, '');
    var keywordRegEx = /key:\s*(.+)/, decompRegEx = /decomp:\s*(.+)/,
      reassemblyRegEx = /reassembly:\s*(.+)/,
      trimmedSpacesRegEx = /(^\s+|\s+$)/g;

    var keywordTest = keywordRegEx.exec(line);
    var decompTest = decompRegEx.exec(line);
    var reassemblyTest = reassemblyRegEx.exec(line);
    var endOfDecomp = line.includes("enddecomp");
    var endOfKeyword = line.includes("endkey");

    if (keywordTest != null)
    {
      var keywordPhrase = keywordTest[1];
      // if it contains a number, isolate that
      var rankRegExTest = /([^\d\s]+)\s+(\d+)/.exec(keywordPhrase);
      // equivalency
      var equivRegExTest = /([^\d\s]+)\s*==\s*([^\d\s]+)/.exec(keywordPhrase);
      this.currentRank = 0;

      if (equivRegExTest != null)
      {
        this.currentKeyword = equivRegExTest[1];
        this.createDecompFromEquivalency(this.currentKeyword, equivRegExTest[2]);
      }
      else
      {
        if (rankRegExTest != null)
        {
          this.currentKeyword = rankRegExTest[1];
          this.currentRank = rankRegExTest[2];
        }
        else 
          this.currentKeyword = keywordPhrase.replace(trimmedSpacesRegEx,'');
        this.makeNewKeywordRules(this.currentKeyword, this.currentRank);
      }
    }
    else if (decompTest != null)
    {
      this.curentDecompRule = decompTest[1].replace(trimmedSpacesRegEx,'');
    }
    else if (reassemblyTest != null)
    {
      var reconstruction = reassemblyTest[1].replace(trimmedSpacesRegEx, '');
      this.currentReconstructions.push(reconstruction);
    }
    else if (endOfDecomp)
    {
      this.addDecompRules(this.currentKeyword, this.curentDecompRule, 
        this.currentReconstructions);
      this.currentReconstructions = [];
    }
    else if (endOfKeyword)
    {
      this.currentKeyword = null;
      this.currentRank = 0;
      this.curentDecompRule = null;
    }
  },

  getRandomIntroLine: function()
  {
    var numTotalLines = this.introductoryLines.length;
    var randomIndex = parseInt(Math.random()*numTotalLines);
    return this.introductoryLines[randomIndex];
  },

  makeNewKeywordRules: function(keyword, ranking)
  {
    if (keyword === null) return;
    if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
    {
      this.keywordToKeywordRules[keyword] = new keywordRulesRef(keyword, ranking);
    }
  },

  addDecompRules: function(keyword, decompositionString, 
    reconstructionStrings)
  {
    var keywordRules = this.keywordToKeywordRules[keyword];
    keywordRules.addDecompAndReconstructions(this.keywordToKeywordRules, decompositionString, 
      reconstructionStrings);
  },

  createDecompFromEquivalency: function(keyword, keywordAlias)
  {
    if (keywordAlias === null || keyword === null) return;
    if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
    {
      this.keywordToKeywordRules[keyword] = new keywordRulesRef(keyword, 0);
    }
    var keywordRules = this.keywordToKeywordRules[keyword];
    if (this.keywordToKeywordRules.hasOwnProperty(keywordAlias))
    {
      var aliasKeywordRules = this.keywordToKeywordRules[keywordAlias];
      keywordRules.ranking = aliasKeywordRules.ranking;
      keywordRules.decompToReconstruction = aliasKeywordRules.decompToReconstruction;
    }
  },

  tokenizeBasedOnSpaceAndPunctuation: function(inputLine)
  {
    var currentInputLineArray = [];
    var newWord = true;
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]/;
    var spaceRegEx = /\s/;
    for (var inputLineIndex = 0, inputLineLength = inputLine.length;
      inputLineIndex < inputLineLength; inputLineIndex++)
    {
      var currentCharacter = inputLine[inputLineIndex];
      // skip spaces and indicate that we are on new word
      if (spaceRegEx.test(currentCharacter)) 
      { newWord = true; continue; }

      if (punctuationRegEx.test(currentCharacter))
      {
        currentInputLineArray.push(currentCharacter);
        newWord = true;
      }
      // new word encountered with new character, turn flag off so that we can
      // append to it on loops next iteration
      else if (newWord)
      {
        currentInputLineArray.push(currentCharacter);
        newWord = false;
      }
      else
      {
        currentInputLineArray[currentInputLineArray.length-1] += currentCharacter;
      }
    }
    return currentInputLineArray;
  },

  analyzeInputLine: function(inputLine)
  {
    var outputLine = "lol";
    var currentMaxRanking = -1;
    var keywordRulesStack = [];
    var keywordsUsed = {};
    
    var inputLineArray = this.tokenizeBasedOnSpaceAndPunctuation(inputLine);
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]/;

    for (var inputLineArrayIndex = 0, inputLineArrayLength = inputLineArray.length;
      inputLineArrayIndex < inputLineArrayLength; inputLineArrayIndex++)
    {
      var currentWordNormalCase = inputLineArray[inputLineArrayIndex];
      var currentWord = currentWordNormalCase.toUpperCase();
      console.log("word: " + currentWord);

      // unconditional replacement
      if (this.keywordToReplacementKeyword.hasOwnProperty(currentWord))
      {
        inputLine = inputLine.replace(new RegExp(currentWordNormalCase), 
          this.keywordToReplacementKeyword[currentWord].toLowerCase());
      }

      // if keyword encountered
      if (this.keywordToKeywordRules.hasOwnProperty(currentWord))
      {
        var keywordRules = this.keywordToKeywordRules[currentWord];
        
        // include keyword in stack only once
        if (!keywordsUsed.hasOwnProperty(currentWord))
        {
          var newRankingIsGreater = keywordRules.ranking > currentMaxRanking;
          
          if (newRankingIsGreater)
          {
            // highest ranked items at beginning
            currentMaxRanking = keywordRules.ranking;
            keywordRulesStack.splice(0, 0, keywordRules);
          }
          else
          {
            keywordRulesStack.push(keywordRules);
          }
          keywordsUsed[currentWord] = currentWord;
    	 }
      }

      // reset keystrack if punctuation encountered. but don't do it if it's the last
      // word
      if (punctuationRegEx.test(currentWord) && inputLineArrayIndex != inputLineArrayLength-1)
      {
        keywordRulesStack = [];
        keywordsUsed = {};
      }
    }

    console.log("Line after keyword processing and all replacements: " + inputLine);
    //console.log("keystack: " + keywordRulesStack);
    for (var keywordStackIndex = 0, keywordStackLength = keywordRulesStack.length;
      keywordStackIndex < keywordStackLength; keywordStackIndex++)
    {
      var currentKeywordRules = keywordRulesStack[keywordStackIndex];
      var currentAttempt = currentKeywordRules.attemptReconstruction(inputLine);
      console.log("keyword " + currentKeywordRules.keyword + " attempt " + currentAttempt);
      if (currentAttempt !== null)
      {
        outputLine = currentAttempt;
        break;
      }
    }

    return outputLine;
  },

  print: function()
  {
    if (this.keywordToKeywordRules === null) return;
    for (var key in this.keywordToKeywordRules)
    {
      if (!this.keywordToKeywordRules.hasOwnProperty(key)) return;
      console.log("Keyword: " + key);
      this.keywordToKeywordRules[key].print();
    }
  }
};

exports.refToSpeechEngine = SpeechEngine;