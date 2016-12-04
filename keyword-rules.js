function ReconstructionRule(rule, equivalentKeyword)
{
  this.rule = rule;
  this.equivalentKeyword = equivalentKeyword;
}

ReconstructionRule.prototype = 
{
  print: function()
  {
    console.log("Reconstruction: " + this.rule + " " + this.equivalentKeyword);
  }
};

function Reconstructions (reconstructionList)
{
  this.reconstructionList = reconstructionList;
  this.nextReconstructionToBeUsed = 0;
}

Reconstructions.prototype =
{
  // cycle through reconstructions
  getNextReconstruction: function()
  {
    if (this.reconstructionList == null || this.reconstructionList.length == 0) return null;
    if (this.nextReconstructionToBeUsed == this.reconstructionList.length)
      this.nextReconstructionToBeUsed = 0;
    return this.reconstructionList[this.nextReconstructionToBeUsed++];
  },

  print: function()
  {
    for (var reconsIndex = 0, numRecons = this.reconstructionList.length; reconsIndex < numRecons;
        reconsIndex++)
    {
      this.reconstructionList[reconsIndex].print();
    }
  }
};

function KeywordRules (keyword, ranking)
{
  this.keyword = keyword;
  this.ranking = ranking;
  this.decompToReconstruction = {};
  this.allKeywordToKeywordRules = null;
}

KeywordRules.prototype =
{
  addDecompAndReconstructions: function(allKeywordToKeywordRules,
    decompositionString, reconstructionStrings, ranking)
  {
    if (decompositionString === null || reconstructionStrings === null) return;
    this.allKeywordToKeywordRules = allKeywordToKeywordRules;

    // create a regex out of the decomposition. first split the decomposition into separated by
    // spaces
    var decompositionArray = decompositionString.split(" ");
    var decompositionRegExString = "^";
    // all regexes are separated into groups
    var nonPunctuation = "([^.,\/#!?$%\\^&\\*;:{}=\\-_`~()]+)";

    // create regex out of tokens in decomposition
    for (var tokenIndex = 0, numTokens = decompositionArray.length;
      tokenIndex < numTokens; tokenIndex++)
    {
      var currentToken = decompositionArray[tokenIndex];
      // space before second token
      if (tokenIndex >= 1)
      {
        decompositionRegExString += " ";
      }

      if (/^\d+/.test(currentToken))
      {
        var numWords = parseInt(currentToken);
        // use groups to split decomposition into several items
        // an indifinite number of words
        if (numWords == 0)
        {
          decompositionRegExString += nonPunctuation;
        }
        else {
          // a certain number of words separated by sapces
          for (var wordIndex = 0; wordIndex < numWords; wordIndex++)
          {
            if (wordIndex > 0) decompositionRegExString += " ";
            decompositionRegExString += nonPunctuation;
          }
        }
      }
      else 
      {
        decompositionRegExString += "(" + currentToken + ")";
      }
    }

    if (!this.decompToReconstruction.hasOwnProperty(decompositionRegExString))
    {
      var testEquivalency = /\s*=\s*(\S+)/;
      // make a reg ex per reconstruction
      var reconsArray = [];
      for (var reconsIndex = 0, numRecons = reconstructionStrings.length; reconsIndex < numRecons;
        reconsIndex++)
      {
        var currentReconstr = reconstructionStrings[reconsIndex];
        var equivaResult = testEquivalency.exec(currentReconstr);
        var equivalentKeyword = null;
        if (equivaResult != null)
        {
          equivalentKeyword = equivaResult[1];
        }

        reconsArray.push(new ReconstructionRule(currentReconstr.split(" "), equivalentKeyword));
      }
      this.decompToReconstruction[decompositionRegExString] = new Reconstructions(reconsArray);
    }
  },

  attemptReconstruction: function(inputLine)
  {
    var reconstructedLine = null;
    var numberRegEx = /^(\d+)/;
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]/;

    for (var decomp in this.decompToReconstruction)
    {
      var decompRegEx = new RegExp(decomp);
      var decompPasses = decompRegEx.test(inputLine.toUpperCase());
      if (decompPasses)
      {
        var decompResult = decompRegEx.exec(inputLine.toUpperCase());

        // create a reconstruction
        var reconstructionToBeUsed = this.decompToReconstruction[decomp].getNextReconstruction();
       
        if (reconstructionToBeUsed !== null)
        {
          var rule = reconstructionToBeUsed.rule;
          var equivalentKeyword = reconstructionToBeUsed.equivalentKeyword;

          // if we encounter NEWKEY, don't try this keyword anymore
          if (rule == "NEWKEY") return null;

          // if equivalency, use that instead
          if (equivalentKeyword != null)
          {
            var equivalentkeywordRules = this.allKeywordToKeywordRules[equivalentKeyword];
            return equivalentkeywordRules.attemptReconstruction(inputLine);
          }
          else 
          {
            reconstructedLine = "";
            for (var tokenIndex = 0, numTokens = rule.length;
              tokenIndex < numTokens; tokenIndex++)
            {
              var currentToken = rule[tokenIndex];
              console.log("Current token: " + currentToken);
              if (tokenIndex > 0) reconstructedLine += " ";
              // if it's a number, look up token in original line
              if (numberRegEx.test(currentToken))
              {
                var numberMatch = numberRegEx.exec(currentToken)[1];
                // first token of deconstruction is decompResult[1]; remaining tokens follow
                var realToken = parseInt(numberMatch) + 1;
                reconstructedLine += decompResult[realToken].toLowerCase();
                // add any punctuation
                var punctuationMatch = punctuationRegEx.exec(currentToken);
                if (punctuationMatch !== null)
                {
                  reconstructedLine += punctuationMatch;
                }
              }
              else {
                reconstructedLine += currentToken;
              }
            }
          }
          break;
        }
      }
    }

    return reconstructedLine;
  },

  print: function()
  {
    for (var decomp in this.decompToReconstruction)
    {
      if (!this.decompToReconstruction.hasOwnProperty(decomp)) return;
      console.log("Decomposition: " + decomp);
      this.decompToReconstruction[decomp].print();
    }
  }
};

function ReplacementKeword ()
{
  this.keyword = null;
  this.replacementKeyword = null;
}


exports.refToKeywordRules = KeywordRules;
exports.refToReplaceKeyword = ReplacementKeword;