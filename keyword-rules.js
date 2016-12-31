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
    // all regexes are separated into groups
    var nonPunctuation = "([^.,\/#!?$%\\^&\\*;:{}=\\-_`~()]*)";
    // use lazy version as first token, just so that we don't match other items near the end of the 
    // string
    var nonPunctuationLazy = "([^.,\/#!?$%\\^&\\*;:{}=\\-_`~()]*?)";
    var spaces = "\\s*";
    var numberRegEx = /^\d+/;
    // if there is a family keyword, need to make an array of reg ex
    // if there are multiple, then a permutation of them need to be made
    // usually a family keyword is in the form /family
    var familyRegEx = /(\/\S+)/;
    // in case we encounter OR'd versions...
    var ordRegEx = /\((.+)\)/;
    var familyDelimiter = "!+!";


      if (this.keyword == "you")
      {
        console.log("decomp string: " + decompositionString);
        console.log("decomp array: " + decompositionArray);
      }

    var currRegEx = "^";
    // create regex out of tokens in decomposition
    for (var tokenIndex = 0, numTokens = decompositionArray.length;
      tokenIndex < numTokens; tokenIndex++)
    {
      var currentToken = decompositionArray[tokenIndex];
      if (this.keyword == "you")
      {
        console.log("Current token: " + currentToken);
      }
      // space before second token
      if (tokenIndex >= 1)
      {
        currRegEx += spaces;
      }

      if (familyRegEx.test(currentToken))
      {
        // use an extra slash in front of /family to delineate with single slash tokens
        // in regex test
        currRegEx += familyDelimiter + "/" + currentToken + familyDelimiter;
      }
      else if (ordRegEx.test(currentToken))
      {
        var ordResult = ordRegEx.exec(currentToken);
        // treat as special case of family
        currRegEx += familyDelimiter + "++" + ordResult[1] 
          + familyDelimiter;
      }
      else if (numberRegEx.test(currentToken))
      {
        var numWords = parseInt(currentToken);
        // an indifinite number of words
        if (numWords == 0)
        {
          currRegEx += (tokenIndex == 0 ? nonPunctuationLazy : nonPunctuation);
        }
        else {
          // a certain number of words separated by spaces
          for (var wordIndex = 0; wordIndex < numWords; wordIndex++)
          {
            if (wordIndex > 0) decompositionRegExString += spaces;
            currRegEx += (tokenIndex == 0 ? nonPunctuationLazy: nonPunctuation);
          }
        }
      }
      else 
      {
        currRegEx += "(" + currentToken + ")";
      }
    }

    var decompositionRegExArray = [];
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
          foundNewPermutation = true;
          var newSpecialTokens = specialTokens.slice();
          var familyMembers = keywordToFamily[testFamily[1]];
          for (var familyIndex = 0, numFamily = familyMembers.length;
            familyIndex < numFamily; familyIndex++)
          {
            newSpecialTokens[tokenIndex] = "(" + familyMembers[familyIndex] + ")";
            setupRegExPermutations(newSpecialTokens, keywordToFamily,
              decompositionRegExArray);
          }
        }
        else 
        {
          // if no family tokens remain, test for OR'd versions
          var testOrd = /\+\+(.+)/.exec(currentToken);
          if (testOrd != null)
          {
            foundNewPermutation = true;
            var ordTokens = testOrd[1].split("-");
            var newSpecialTokens = specialTokens.slice();
            for (var ordIndex = 0, ordLength = ordTokens.length;
              ordIndex < ordLength; ordIndex++)
            {
              newSpecialTokens[tokenIndex] = "(" + ordTokens[ordIndex] + ")";
              setupRegExPermutations(newSpecialTokens, keywordToFamily,
                decompositionRegExArray);
            }
          }
        }
      }
      // if we didn't find alternative reg exs, that means that
      // we have substituted all /<FAMILY>-based keywords with members of
      // those specific families
      if (!foundNewPermutation)
      {
        decompositionRegExArray.push(specialTokens.join(''));
      }
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
        equivalentKeyword = equivaResult[1].toLowerCase();
      }
      if (this.keyword == "you")
      {
        console.log("reconstr: " + currentReconstr);
        console.log("reconstr: " + currentReconstr.split(" "));
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
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]+/;
    var trimmedSpacesRegEx = /(^\s+|\s+$)/g;

    // for consistency's sake, force to lower case
    inputLine = inputLine.toLowerCase();

    var memoryFunction = false;

    var decompsThatWork = [];
    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];
      var decompRegEx = new RegExp(decompRules.decompositionRegExString);
      var decompTest = decompRegEx.test(inputLine);
      console.log("candidate decomp: " + decompRegEx);
      if (decompTest)
      {
        console.log("possible decomp: " + decompRegEx);
        decompsThatWork.push(decompRules);
      }
    }

    // pick random decomp that works
    if (decompsThatWork.length > 0)
    {
      var randomIndex = parseInt(Math.random()*decompsThatWork.length);
      var decompRules = decompsThatWork[randomIndex];
      var decompRegEx = new RegExp(decompRules.decompositionRegExString);
      var decompResult = decompRegEx.exec(inputLine);

      console.log("Decomp used: " + decompRegEx + ", result: " + decompResult);

      // create a reconstruction
      var reconstructionToBeUsed = decompRules.getNextReconstruction();
     
      if (reconstructionToBeUsed != null)
      {
        var rule = reconstructionToBeUsed.rule;
        var equivalentKeyword = reconstructionToBeUsed.equivalentKeyword;

        // if we encounter NEWKEY, don't try this keyword anymore
        if (rule == "NEWKEY") 
        {
          return null;
        }

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
            if (tokenIndex > 0) reconstructedLine += " ";
            // if it's a number, look up token in original line
            if (numberRegEx.test(currentReconToken))
            {
              var numberMatch = numberRegEx.exec(currentReconToken)[1];
              // first token of deconstruction is decompResult[1]; remaining tokens follow
              // decompResult[0] is the whole string
              var realTokenIndex = parseInt(numberMatch) + 1;
              // trim any spaces at ends, if token exists
              var tokenUsed = "";
              if (decompResult.length > realTokenIndex)
              {
                tokenUsed = decompResult[realTokenIndex].replace(trimmedSpacesRegEx, '');
              }
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
      }
    }

    return [reconstructedLine, memoryFunction];
  },

  print: function()
  {
    console.log("Keyword: " + this.keyword + ", ranking: " + this.ranking +
      ", replacement: " + this.replacementKeyword + ". Num decomps: " + 
      this.decompArray.length + ".");
    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];
      decompRules.print();
    }
  }
};


exports.refToKeywordRules = KeywordRules;