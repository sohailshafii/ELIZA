function ReconstructionRule(rule, equivalentKeyword)
{
  this.rule = rule;
  this.equivalentKeyword = equivalentKeyword;
}

ReconstructionRule.prototype = 
{
  print: function()
  {
    console.log("Reconstruction rule: " + this.rule + ", equivalentKeyword: " + this.equivalentKeyword + ".");
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
    console.log("Decomposition reg ex: " + this.decompositionRegExString + ", memory?: " + this.memoryFunction + ".");
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

  // shared among every keyword--should be class variable or something
  this.allKeywordToKeywordRules = null;
}

KeywordRules.prototype =
{
  setUpFromAlias: function(aliasKeywordRules)
  {
    this.ranking = aliasKeywordRules.ranking;
    this.replacementKeyword = aliasKeywordRules.replacementKeyword;
    this.decompArray = aliasKeywordRules.decompArray;
  },

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
    var numberRegEx = /^\d+/;
    // if there is a family keyword, need to make an array of reg ex
    // if there are multiple, then a permutation of them need to be made
    // usually a family keyword is in the form /FAMILY
    var familyRegEx = /(\/\S+)/;
    var familyDelimiter = "!+!";

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

      if (familyRegEx.test(currentToken))
      {
        // use an extra slash in front of /FAMILY to delineate with single slash tokens
        // in regex test
        currRegEx += familyDelimiter + currentToken + familyDelimiter;
      }
      else if (numberRegEx.test(currentToken))
      {
        var numWords = parseInt(currentToken);
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

    // find special tokens, like family nouns, that may have been set up above
    // first split reg ex into family and non-family items
    var currRegExSpecialTokens = currRegEx.split(familyDelimiter);
    var setupRegExPermutations = function(specialTokens, keywordToFamily,
      decompositionRegExArray) {
      var foundNewPermutation = false;

      for (var tokenIndex = 0, numTokens = specialTokens.length;
        tokenIndex < numTokens; tokenIndex++)
      {
        var currentToken = specialTokens[tokenIndex];
        // family regexs have two slashes in front of them!
        var testFamily = /\/\/(\S+)/.exec(currentToken);
        if (testFamily != null)
        {
          foundAlternativeRegEx = true;
          var newSpecialTokens = specialTokens.slice();
          var familyMembers = keywordToFamily[testFamily[1]];
          for (var familyIndex = 0, numFamily = familyMembers.length;
            familyIndex < numFamily; familyIndex++)
          {
            newSpecialTokens[tokenIndex] = familyMembers[familyIndex];
            setupRegExPermutations(newSpecialTokens, keywordToFamily,
              decompositionRegExArray);
          }
        }
      }
      // if we didn't find alternative reg exs, that means that
      // we have substituted all /<FAMILY>-based keywords with members of
      // those specific families
      if (!foundNewPermutation)
        decompositionRegExArray.push(specialTokens.join(''));
    };

    if (currRegExSpecialTokens.length > 1)
    {
      setupRegExPermutations(currRegExSpecialTokens, keywordToFamily, decompositionRegExArray);
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

    var memoryFunction = false;
    if (this.replacementKeyword != null)
    {
      console.log("Pre-replacement: " + inputLine + " " + this.replacementKeyword);
      // do necessary replacements...
      inputLine = inputLine.replace(this.keyword, this.replacementKeyword);
      console.log("Post-replacement: " + inputLine);
    }

    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];

      var decompRegEx = new RegExp(decompRules.decompositionRegExString);
      var decompResult = decompRegEx.exec(inputLine);
      if (decompResult != null)
      {
        console.log("Decomp result: " + decompResult + " decomp: " + decompRegEx);

        // create a reconstruction
        var reconstructionToBeUsed = decompRules.getNextReconstruction();
       
        if (reconstructionToBeUsed != null)
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
          // otherwise, do reconstruction as usual
          else 
          {
            reconstructedLine = "";
            for (var tokenIndex = 0, numTokens = rule.length; tokenIndex < numTokens; tokenIndex++)
            {
              var currentReconToken = rule[tokenIndex];
              console.log("Current reconstruction rule token: " + currentReconToken);
              if (tokenIndex > 0) reconstructedLine += " ";
              // if it's a number, look up token in original line
              if (numberRegEx.test(currentReconToken))
              {
                var numberMatch = numberRegEx.exec(currentReconToken)[1];
                // first token of deconstruction is decompResult[1]; remaining tokens follow
                // decompResult[0] is the whole string
                var realTokenIndex = parseInt(numberMatch) + 1;
                // trim any spaces at ends
                var tokenUsed = decompResult[realTokenIndex].toLowerCase().replace(trimmedSpacesRegEx, '');
                reconstructedLine += tokenUsed;
                // add any punctuation
                var punctuationMatch = punctuationRegEx.exec(currentReconToken);
                if (punctuationMatch !== null)
                {
                  reconstructedLine += punctuationMatch;
                }
              }
              else {
                reconstructedLine += currentReconToken;
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
    console.log("Keyword: " + this.keyword + ", ranking: " + this.ranking +
      ", replacement: " + this.replacementKeyword + ".");
    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];
      decompRules.print();
    }
  }
};


exports.refToKeywordRules = KeywordRules;