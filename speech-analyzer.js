function KeywordRules ()
{
  this.keyword = null;
  this.decompToReconstruction = {};
  this.ranking = 0;
}

KeywordRules.prototype =
{
  addDecompAndReconstructions(decompositionString, reconstructionStrings, ranking)
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

      if (/^\d*/.exec(currentToken))
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
      this.decompToReconstruction[decompositionRegExString] = reconsArray;
    }
  },

  attemptReconstruction: function(inputLine)
  {
    // TODO

  },

  barf: function()
  {
    for (var decomp in this.decompToReconstruction)
    {
      if (!this.decompToReconstruction.hasOwnProperty(decomp)) return;
      console.log("Decomposition: " + decomp);
      var reconstructions = this.decompToReconstruction[decomp];
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

SpeechAnalyzer.prototype =
{
  addDecompRules: function(keyword, ranking, decompositionString, reconstructionStrings)
  {
    if (keyword == null) return;
    if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
    {
      this.keywordToKeywordRules[keyword] = new KeywordRules();
    }

    var keywordRules = this.keywordToKeywordRules[keyword];
    keywordRules.keyword = keyword;
    keywordRules.ranking = ranking;
    keywordRules.addDecompAndReconstructions(decompositionString, reconstructionStrings);
  },

  analyzeInputLine: function(inputLine)
  {
    var outputLine = "lol";
    var inputLineArray = inputLine.split(" ");
    var currentMaxRanking = -1;
    var keywordRulesStack = [];

    for (var inputLineArrayIndex = 0, inputLineArrayLength = inputLineArray.length;
      inputLineArrayIndex < inputLineArrayLength; inputLineArrayIndex++)
    {
      var currentWord = inputLineArray[inputLineArrayIndex].toUpperCase();
      console.log(currentWord);
      if (this.keywordToKeywordRules.hasOwnProperty(currentWord))
      {
        var keywordRules = this.keywordToKeywordRules[currentWord];
        var newRankingIsGreater = keywordRules.ranking > currentMaxRanking;
        console.log("keyword rules: " + keywordRules);
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
      }
      // TODO: reset keystrack if "," or "." is encountered!
    }

    console.log("keystack: " + keywordRulesStack);
    for (var keywordStackIndex = 0, keywordStackLength = keywordRulesStack.length;
      keywordStackIndex < keywordStackLength; keywordStackIndex++)
    {
      var currentKeywordRules = keywordRulesStack[keywordStackIndex];
      currentKeywordRules.attemptReconstruction(inputLine);
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