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
    var numberRegEx = /^(\d+)/;
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]/;

    for (var decomp in this.decompToReconstruction)
    {
      var decompRegEx = new RegExp(decomp);
      var decompPasses = decompRegEx.test(inputLine.toUpperCase());
      console.log("decomp to try: " + decompRegEx);
      if (decompPasses)
      {
        var decompResult = decompRegEx.exec(inputLine.toUpperCase());

        // create a reconstruction
        var reconstructionToBeUsed = this.decompToReconstruction[decomp].getNextReconstruction();

        if (reconstructionToBeUsed !== null)
        {
          // if we encounter NEWKEY, don't try this keyword anymore
          if (reconstructionToBeUsed == "NEWKEY") return null;

          reconstructedLine = "";
          for (var tokenIndex = 0, numTokens = reconstructionToBeUsed.length;
            tokenIndex < numTokens; tokenIndex++)
          {
            var currentToken = reconstructionToBeUsed[tokenIndex];
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

function ReplacementKeword ()
{
  this.keyword = null;
  this.replacementKeyword = null;
}


exports.refToKeywordRules = KeywordRules;
exports.refToReplaceKeyword = ReplacementKeword;