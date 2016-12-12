var keywordRulesModule = require('./keyword-rules');
var keywordRulesRef = keywordRulesModule.refToKeywordRules;

function SpeechEngine(){
  this.keywordToKeywordRules = { };
  this.keywordToReplacementKeyword = { };
  this.keywordToFamily = { };

  this.introductoryLines = [];
  this.goodByeLines = [];
  this.memoryStack = [];
}

SpeechEngine.prototype =
{
  analyzeScript: function(lines)
  {
    var numLines = lines.length;
    var commentRegEx = /#.*/;
    var introRegEx = /Intro:\s*(.+)/;
    var goodByeRegEx = /Quit:\s*(.+)/;
    var replacementRegEx = /pre-replacement:\s*(\S+)=(.+)\s*/;
    var familyRegEx = /family:\s*(\S+)=(.+)\s*/;

    this.currentKeyword = null;
    this.currentDecompRule = "";
    this.currentReconstructions = [];
    this.replaceRule = null;
    this.memoryFunction = false;

    for(var lineIndex = 0; lineIndex < numLines; lineIndex++) 
    {
      var currentLine = lines[lineIndex];
      if (commentRegEx.test(currentLine)) continue;

      var introLineTest = introRegEx.exec(currentLine);
      var goodByeLineTest = goodByeRegEx.exec(currentLine);
      var replacementTest = replacementRegEx.exec(currentLine);
      var familyTest = familyRegEx.exec(currentLine);

      if (introLineTest != null)
      {
        this.introductoryLines.push(introLineTest[1]);
      }
      else if (goodByeLineTest != null)
      {
        this.goodByeLines.push(goodByeLineTest[1]);
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
      else if (familyTest != null)
      {
        var keyword = familyTest[1];
        var parsedFamilyMembers = familyTest[2].split(",");

        if (!this.keywordToFamily.hasOwnProperty(keyword))
        {
          this.keywordToFamily[keyword] = [];
        }
        for (var tokenIndex = 0, numTokens = parsedFamilyMembers.length;
          tokenIndex < numTokens; tokenIndex++)
        {
          this.keywordToFamily[keyword].push(parsedFamilyMembers[tokenIndex]);
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
    var trimmedSpacesRegEx = /(^\s+|\s+$)/g;
    var lineTrimmedSpaces = line.replace(trimmedSpacesRegEx, '');
    var keywordRegEx = /key:\s*(.+)/, decompRegEx = /decomp:\s*(.+)/,
      reassemblyRegEx = /reassembly:\s*(.+)/,
      replaceRegEx = /replace:\s*(.+)/;

    var keywordTest = keywordRegEx.exec(line);
    var decompTest = decompRegEx.exec(line);
    var replaceTest = replaceRegEx.exec(line);
    var reassemblyTest = reassemblyRegEx.exec(line);
    var endOfDecomp = line.includes("enddecomp");
    var endOfKeyword = line.includes("endkey");
    var foundMemoryLine = line.includes("memory");

    if (keywordTest != null)
    {
      var keywordPhrase = keywordTest[1];
      // if it contains a number, isolate that
      var rankRegExTest = /([^\d\s]+)\s+(\d+)/.exec(keywordPhrase);
      // equivalency
      var equivRegExTest = /([^\d\s]+)\s*=\s*([^\d\s]+)/.exec(keywordPhrase);

      if (equivRegExTest != null)
      {
        this.currentKeyword = equivRegExTest[1];
        this.createKeywordFromEquivalency(this.currentKeyword, equivRegExTest[2]);
      }
      else
      {
        var keywordRank = 0;
        if (rankRegExTest != null)
        {
          this.currentKeyword = rankRegExTest[1];
          keywordRank = rankRegExTest[2];
        }
        else 
        {
          this.currentKeyword = keywordPhrase.replace(trimmedSpacesRegEx,'');
        }
        this.makeNewKeywordRules(this.currentKeyword, keywordRank);
      }
    }
    else if (replaceTest != null)
    {
      this.keywordToKeywordRules[this.currentKeyword].replacementKeyword = replaceTest[1].replace(trimmedSpacesRegEx, '');
    }
    else if (decompTest != null)
    {
      this.currentDecompRule = decompTest[1].replace(trimmedSpacesRegEx,'');
    }
    else if (reassemblyTest != null)
    {
      var reconstruction = reassemblyTest[1].replace(trimmedSpacesRegEx, '');
      this.currentReconstructions.push(reconstruction);
    }
    else if (endOfDecomp)
    {
      this.addDecompRules(this.currentKeyword, this.currentDecompRule, 
        this.currentReconstructions, this.memoryFunction);
      this.currentReconstructions = [];
      this.memoryFunction = false;
    }
    else if (endOfKeyword)
    {
      this.currentKeyword = null;
      this.currentDecompRule = null;
      this.replaceRule = null;
    }
    else if (foundMemoryLine)
    {
      this.memoryFunction = true;
    }
  },

  getRandomIntroLine: function()
  {
    var randomIndex = parseInt(Math.random()*this.introductoryLines.length);
    return this.introductoryLines[randomIndex];
  },

  getRandomGoodbyeLine: function()
  {
    var randomIndex = parseInt(Math.random()*this.goodByeLines.length);
    return this.goodByeLines[randomIndex];
  },

  makeNewKeywordRules: function(keyword, ranking)
  {
    if (keyword === null) return;
    if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
    {
      this.keywordToKeywordRules[keyword] = new keywordRulesRef(keyword, ranking);
    }
  },

  createKeywordFromEquivalency: function(keyword, keywordAlias)
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
      keywordRules.setUpFromAlias(aliasKeywordRules);
    }
  },

  addDecompRules: function(keyword, decompositionString, 
    reconstructionStrings, memoryFunction)
  {
    var keywordRules = this.keywordToKeywordRules[keyword];
    keywordRules.addDecompAndReconstructions(this.keywordToKeywordRules, decompositionString, 
      reconstructionStrings, memoryFunction, this.keywordToFamily);
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

    // pre-replacements
    // TODO: fix this case nonsense
    for (var inputLineArrayIndex = 0, inputLineArrayLength = inputLineArray.length;
      inputLineArrayIndex < inputLineArrayLength; inputLineArrayIndex++)
    {
      var currentWordNormalCase = inputLineArray[inputLineArrayIndex];
      var currentWordUpperCase = inputLineArray[inputLineArrayIndex].toUpperCase();
      if (this.keywordToReplacementKeyword.hasOwnProperty(currentWordUpperCase))
      {
        var replacement = this.keywordToReplacementKeyword[currentWordUpperCase];
        inputLine = inputLine.replace(new RegExp(currentWordNormalCase), 
          replacement);
        inputLineArray[inputLineArrayIndex] = replacement;
      }
    }

    for (var inputLineArrayIndex = 0, inputLineArrayLength = inputLineArray.length;
      inputLineArrayIndex < inputLineArrayLength; inputLineArrayIndex++)
    {
      var currentWordNormalCase = inputLineArray[inputLineArrayIndex];
      var currentWord = currentWordNormalCase.toUpperCase();
      console.log("word: " + currentWord);

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

      // if we hit punctuation, then stop if keystack is not empty
      if (punctuationRegEx.test(currentWord) && keywordRulesStack.length > 0)
      {
        break;
      }
    }

    console.log("Line after keyword processing and all replacements: " + inputLine);

    if (keywordRulesStack.length == 0 && this.memoryStack.length > 0)
    {
      outputLine = this.memoryStack.pop();
    }
    else
    {
      //console.log("keystack: " + keywordRulesStack);
      for (var keywordStackIndex = 0, keywordStackLength = keywordRulesStack.length;
        keywordStackIndex < keywordStackLength; keywordStackIndex++)
      {
        var currentKeywordRules = keywordRulesStack[keywordStackIndex];
        var currentAttempt = currentKeywordRules.attemptReconstruction(inputLine);
        console.log("keyword " + currentKeywordRules.keyword + " attempt " + currentAttempt);
        if (currentAttempt !== null)
        {
          // memory function?
          if (currentAttempt[1])
          {
            this.memoryStack.push(currentAttempt[0]);
          }
          outputLine = currentAttempt[0];
          break;
        }
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