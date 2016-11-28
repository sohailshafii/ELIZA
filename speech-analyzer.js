function Reconstructions ()
{
  this.list = null;
  this.nextReconstructionToBeUsed = 0;
}

Reconstructions.prototype =
{
  // cycle through reconstructions
  getNextReconstruction: function()
  {
    if (this.list == null || this.list.length == 0) return null;
    if (this.nextReconstructionToBeUsed == this.list.length)
      this.nextReconstructionToBeUsed = 0;
    return this.list[this.nextReconstructionToBeUsed++];
  }
};


function KeywordRules ()
{
  this.keyword = null;
  this.replacementKeyword = null;
  this.decompToReconstruction = {};
  this.ranking = 0;
}

KeywordRules.prototype =
{
  addDecompAndReconstructions: function(decompositionString, reconstructionStrings, ranking)
  {
    if (decompositionString === null || reconstructionStrings === null) return;

    // create a regex out of the decomposition. first split the decomposition into separated by
    // spaces
    var decompositionArray = decompositionString.split(" ");
    var decompositionRegExString = "^";
    // create regex out of tokens in decomposition
    for (var tokenIndex = 0, numTokens = decompositionArray.length;
      tokenIndex < numTokens; tokenIndex++)
    {
      var currentToken = decompositionArray[tokenIndex];
      // space before second token
      if (currentToken == 1)
      {
        decompositionRegExString += " ";
      }

      if (/^\d+/.test(currentToken))
      {
        if (currentToken == 0)
        {
          decompositionRegExString += ".*";
        }
        else {
          decompositionRegExString += ".{" + currentToken + "}";
        }
      }
      else 
      {
        decompositionRegExString += currentToken;
      }
    }

    if (!this.decompToReconstruction.hasOwnProperty(decompositionRegExString))
    {
      // make a reg ex per reconstruction
      var reconsArray = [];
      for (var reconsIndex = 0, numRecons = reconstructionStrings.length; reconsIndex < numRecons;
        reconsIndex++)
      {
        var currentReconstr = reconstructionStrings[reconsIndex];
        reconsArray.push(currentReconstr.split(" "));
      }
      this.decompToReconstruction[decompositionRegExString] = new Reconstructions();
      this.decompToReconstruction[decompositionRegExString].list = reconsArray;
    }
  },

  attemptReconstruction: function(inputLine)
  {
    var reconstructedLine = null;
    for (var decomp in this.decompToReconstruction)
    {
      var decompRegEx = new RegExp(decomp);
      if (decompRegEx.test(inputLine.toUpperCase()))
      {
        // create a reconstruction
        var inputLineParsed = inputLine.split(" ");
        var reconstructionToBeUsed = this.decompToReconstruction[decomp].getNextReconstruction();
        if (reconstructionToBeUsed !== null)
        {
          reconstructedLine = "";
          for (var tokenIndex = 0, numTokens = reconstructionToBeUsed.length;
            tokenIndex < numTokens; tokenIndex++)
          {
            var currentToken = reconstructionToBeUsed[tokenIndex];
            if (tokenIndex > 0) reconstructedLine += " ";
            // if it's a number, look up token in original line
            if (/^\d./.test(currentToken))
            {
              reconstructedLine += inputLineParsed[parseInt(currentToken)];
            }
            else {
              reconstructedLine += currentToken;
            }
          }
          break;
        }
      }
    }

    return reconstructedLine;
  },

  barf: function()
  {
    for (var decomp in this.decompToReconstruction)
    {
      if (!this.decompToReconstruction.hasOwnProperty(decomp)) return;
      console.log("Decomposition: " + decomp);
      var reconstructions = this.decompToReconstruction[decomp].list;
      for (var reconsIndex = 0, reconstLength = reconstructions.length; 
        reconsIndex < reconstLength; reconsIndex++)
      {
        console.log("Reconstruction: " + reconstructions[reconsIndex]);
      }
    }
  }
};

function SpeechAnalyzer(){
  this.keywordToKeywordRules = { };
}

// TODO: modularize more
SpeechAnalyzer.prototype =
{
  addDecompRules: function(keyword, replacementKeyword, ranking, 
  	decompositionString, reconstructionStrings)
  {
    if (keyword === null) return;
    if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
    {
      this.keywordToKeywordRules[keyword] = new KeywordRules();
    }

    var keywordRules = this.keywordToKeywordRules[keyword];
    keywordRules.keyword = keyword;
    keywordRules.replacementKeyword = replacementKeyword;
    keywordRules.ranking = ranking;
    keywordRules.addDecompAndReconstructions(decompositionString, reconstructionStrings);
  },

  createDecompFromEquivalency: function(keyword, keywordAlias)
  {
    if (keywordAlias === null) return;
    if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
    {
      this.keywordToKeywordRules[keyword] = new KeywordRules();
    }
    var keywordRules = this.keywordToKeywordRules[keyword];
    keywordRules.keyword = keyword;

    if (this.keywordToKeywordRules.hasOwnProperty(keywordAlias))
    {
      var aliasKeywordRules = this.keywordToKeywordRules[keywordAlias];
      keywordRules.replacementKeyword = aliasKeywordRules.replacementKeyword;
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
      // if keyword encountered
      if (this.keywordToKeywordRules.hasOwnProperty(currentWord))
      {
        var keywordRules = this.keywordToKeywordRules[currentWord];

        if (keywordRules.replacementKeyword != null)
        {
          inputLine = inputLine.replace(new RegExp(currentWordNormalCase), keywordRules.replacementKeyword.toLowerCase());
        }

        // include keyword in stack only once
        if (!keywordsUsed.hasOwnProperty(currentWord))
        {
          console.log("keyword..." + currentWord);
          var newRankingIsGreater = keywordRules.ranking > currentMaxRanking;
          
          if (newRankingIsGreater)
          {
            console.log("new better keyword, hence new ranking " + keywordRules.ranking);
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

  barf: function()
  {
    if (this.keywordToKeywordRules === null) return;
    for (var key in this.keywordToKeywordRules)
    {
      if (!this.keywordToKeywordRules.hasOwnProperty(key)) return;
      console.log("Keyword: " + key);
      this.keywordToKeywordRules[key].barf();
    }
  }
};

exports.refToSpeechAnalyzer = SpeechAnalyzer;