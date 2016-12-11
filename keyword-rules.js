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

function Reconstructions (decompositionRegExString, reconstructionList, memoryFunction)
{
  this.decompositionRegExString = decompositionRegExString;
  this.reconstructionList = reconstructionList;
  this.nextReconstructionToBeUsed = 0;
  this.memoryFunction = memoryFunction;
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
    console.log(this.decompositionRegExString + " " + this.memoryFunction);
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
  this.replacementKeyword = null;
  this.decompArray = [];
  this.allKeywordToKeywordRules = null;
}

KeywordRules.prototype =
{
  addDecompAndReconstructions: function(allKeywordToKeywordRules,
    decompositionString, reconstructionStrings, memoryFunction, keywordToFamily)
  {
    if (decompositionString === null || reconstructionStrings === null) return;
    this.allKeywordToKeywordRules = allKeywordToKeywordRules;
    // create a regex out of the decomposition. first split the decomposition into separated by
    // spaces
    var decompositionArray = decompositionString.split(" ");
    var decompositionRegExArray = [];
    // all regexes are separated into groups
    var nonPunctuation = "([^.,\/#!?$%\\^&\\*;:{}=\\-_`~()]*)";
    var spaces = "\\s*";

    // TODO: if one token satisfies family test, make multiple decompositions for
    // these set of reconstructions
    var familyTest = /(\/\S+)/;
    // if there is a family keyword, need to make an array of reg exs
    // if there are multiple, then a permutation of them need to be made

    var currRegEx = "^";
    // create regex out of tokens in decomposition
    for (var tokenIndex = 0, numTokens = decompositionArray.length;
      tokenIndex < numTokens; tokenIndex++)
    {
      var currentToken = decompositionArray[tokenIndex];
      // space before second token
      if (tokenIndex >= 1)
      {
        currRegEx += spaces;
      }

      if (/\/\S+/.test(currentToken))
      {
        // use an extra slash to delineate with single slash tokens
        currRegEx += "!+!/" + currentToken + "!+!";
      }
      else if (/^\d+/.test(currentToken))
      {
        var numWords = parseInt(currentToken);
        // use groups to split decomposition into several items
        // an indifinite number of words
        if (numWords == 0)
        {
          currRegEx += nonPunctuation;
        }
        else {
          // a certain number of words separated by spaces
          for (var wordIndex = 0; wordIndex < numWords; wordIndex++)
          {
            if (wordIndex > 0) decompositionRegExString += spaces;
            currRegEx += nonPunctuation;
          }
        }
      }
      else 
      {
        currRegEx += "(" + currentToken + ")";
      }
    }

    // find special tokens, like family nouns
    var currRegExSpecialTokens = currRegEx.split("!+!");
    var setupRegEx = function(specialTokens, keywordToFamily,
      decompositionRegExArray) {
      var foundAlternativeRegEx = false;

      console.log("set up reg ex tokens: " + specialTokens);
      for (var tokenIndex = 0, numTokens = specialTokens.length;
        tokenIndex < numTokens; tokenIndex++)
      {
        var currentToken = specialTokens[tokenIndex];
        // use two slashes in case there are tokens with one slash!
        var testFamily = /\/\/(\S+)/.exec(currentToken);
        console.log(currentToken + " test family: " + testFamily);
        if (testFamily != null)
        {
          foundAlternativeRegEx = true;
          var newSpecialTokens = specialTokens.slice();
          var familyMembers = keywordToFamily[testFamily[1]];
          console.log("family: " + testFamily[1] + " " + familyMembers);
          for (var familyIndex = 0, numFamily = familyMembers.length;
            familyIndex < numFamily; familyIndex++)
          {
            newSpecialTokens[tokenIndex] = familyMembers[familyIndex];
            setupRegEx(newSpecialTokens, keywordToFamily,
              decompositionRegExArray);
          }
        }
      }
      // if we didn't find alternative reg exs, just return joined version 
      // of tokens as reg ex
      if (!foundAlternativeRegEx)
        decompositionRegExArray.push(specialTokens.join(''));
    };

    if (currRegExSpecialTokens.length > 1)
    {
      setupRegEx(currRegExSpecialTokens, keywordToFamily, decompositionRegExArray);
    }
    else 
    {
      decompositionRegExArray.push(currRegEx);
    }

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

    // for each decomposition, assign the reconsarray to it...
    for (var decompIndex = 0, numDecomps = decompositionRegExArray.length;
        decompIndex < numDecomps; decompIndex++)
    {
      this.decompArray.push(new Reconstructions(decompositionRegExArray[decompIndex],
        reconsArray, memoryFunction));
    }
  },

  attemptReconstruction: function(inputLine)
  {
    var reconstructedLine = null;
    var numberRegEx = /^(\d+)/;
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]/;
    var trimmedSpacesRegEx = /(^\s+|\s+$)/g;

    inputLine = inputLine.toUpperCase();

    if (this.replacementKeyword != null)
    {
      console.log("pre: " + inputLine + " " + this.replacementKeyword);
      // do necessary replacements...
      inputLine = inputLine.replace(this.keyword, this.replacementKeyword);
      console.log("post: " + inputLine);
      var memoryFunction = false;
    }

    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];

      var decompRegEx = new RegExp(decompRules.decompositionRegExString);
      var decompPasses = decompRegEx.test(inputLine);
      if (decompPasses)
      {
        var decompResult = decompRegEx.exec(inputLine);
        console.log("Decomp result: " + decompResult + " decomp: " + decompRegEx);

        // create a reconstruction
        var reconstructionToBeUsed = decompRules.getNextReconstruction();
       
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
                var realTokenIndex = parseInt(numberMatch) + 1;
                // trim any spaces at ends
                var tokenUsed = decompResult[realTokenIndex].toLowerCase().replace(trimmedSpacesRegEx, '');
                //trimmedSpacesRegEx = /(^\s+|\s+$)/g
                reconstructedLine += tokenUsed;
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
          memoryFunction = decompRules.memoryFunction;
          break;
        }
      }
    }

    return [reconstructedLine, memoryFunction];
  },

  print: function()
  {
    console.log("replacement: " + this.replacementKeyword);
    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];
      console.log("Decomposition: " + decompRules);
      decompRules.print();
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