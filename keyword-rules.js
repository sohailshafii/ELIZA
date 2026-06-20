function ReconstructionRule(rule, equivalentKeyword, preTransform)
{
  this.rule = rule;
  this.equivalentKeyword = equivalentKeyword;
  // a PRE rule: rebuild the text from `rule`, then re-dispatch to the
  // `equivalentKeyword` on that rebuilt text (rather than the original input)
  this.preTransform = (preTransform === true);
}

ReconstructionRule.prototype =
{
  print: function()
  {
    console.log("Reconstruction rule: " + this.rule + ", equivalentKeyword: " +
      this.equivalentKeyword + (this.preTransform ? " (pre)" : "") + ".");
  }
};

function Reconstructions (decompositionRegEx, reconstructionList, memoryFunction)
{
  this.decompositionRegEx = decompositionRegEx;
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
    console.log("Decomposition reg ex: " + this.decompositionRegEx + ", memory?: " + this.memoryFunction + ".");
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
        if (numWords == 0)
        {
          // "0": any number of words (including none). The first token is lazy
          // so it doesn't swallow a keyword that follows -- but only when
          // something does follow. A trailing or standalone "0" must be greedy
          // so it captures the rest of the phrase (e.g. the "0" in "You say 0").
          var lazy = (tokenIndex == 0 && tokenIndex < numTokens - 1);
          currRegEx += (lazy ? nonPunctuationLazy : nonPunctuation);
        }
        else
        {
          // "n" (n > 0): exactly n whitespace-separated words, captured as a
          // single group so this element still maps to one reassembly fragment
          // number. A word is a run of non-space, non-punctuation characters.
          var singleWord = "[^.,\/#!?$%\\^&\\*;:{}=\\-_`~()\\s]+";
          var nWordGroup = "(" + singleWord;
          for (var wordIndex = 1; wordIndex < numWords; wordIndex++)
          {
            nWordGroup += "\\s+" + singleWord;
          }
          currRegEx += nWordGroup + ")";
        }
      }
      else
      {
        // a literal keyword token: anchor it at word boundaries so it does not
        // match inside a larger word (e.g. "happy" must not match "unhappy")
        currRegEx += "\\b(" + currentToken + ")\\b";
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
            newSpecialTokens[tokenIndex] = "\\b(" + familyMembers[familyIndex] + ")\\b";
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
              newSpecialTokens[tokenIndex] = "\\b(" + ordTokens[ordIndex] + ")\\b";
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
    // a PRE reassembly: "pre: <template> = <keyword>" -- rebuild the text from
    // <template>, then re-dispatch to <keyword>
    var testPre = /^pre:\s*(.+?)\s*=\s*(\S+)\s*$/i;
    // make a reg ex per reconstruction
    var reconsArray = [];
    for (var reconsIndex = 0, numRecons = reconstructionStrings.length; reconsIndex < numRecons;
      reconsIndex++)
    {
      var currentReconstr = reconstructionStrings[reconsIndex];
      var preResult = testPre.exec(currentReconstr);
      if (preResult != null)
      {
        reconsArray.push(new ReconstructionRule(preResult[1].split(" "),
          preResult[2].toLowerCase(), true));
        continue;
      }
      var equivaResult = testEquivalency.exec(currentReconstr);
      var equivalentKeyword = null;
      if (equivaResult != null)
      {
        equivalentKeyword = equivaResult[1].toLowerCase();
      }
      reconsArray.push(new ReconstructionRule(currentReconstr.split(" "), equivalentKeyword));
    }

    // for each decomposition, assign the reconsarray to it...
    for (var decompIndex = 0, numDecomps = decompositionRegExArray.length;
        decompIndex < numDecomps; decompIndex++)
    {
      this.decompArray.push(new Reconstructions(new RegExp(decompositionRegExArray[decompIndex]),
        reconsArray, memoryFunction));
    }
  },

  attemptReconstruction: function(inputLine, debugMode)
  {
    var reconstructedLine = null;

    // for consistency's sake, force to lower case
    inputLine = inputLine.toLowerCase();

    var memoryFunction = false;

    var decompsThatWork = [];
    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];
      var decompRegEx = decompRules.decompositionRegEx;
      var decompTest = decompRegEx.test(inputLine);
      if (debugMode) console.log("candidate decomp: " + decompRegEx);
      if (decompTest)
      {
        if (debugMode) console.log("possible decomp: " + decompRegEx);
        decompsThatWork.push(decompRules);
      }
    }

    // use the first decomposition that matches. decompArray is in script order,
    // so the more specific rules (listed first) win over a generic catch-all
    // like "0" -- this is ELIZA's deterministic first-match behaviour. (Variety
    // comes from cycling the reassembly rules, not from picking decomps.)
    if (decompsThatWork.length > 0)
    {
      var decompRules = decompsThatWork[0];
      var decompRegEx = decompRules.decompositionRegEx;
      var decompResult = decompRegEx.exec(inputLine);

      if (debugMode) console.log("Decomp used: " + decompRegEx + ", result: " + decompResult);

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

        // PRE: rebuild the text from the template, then re-dispatch to another
        // keyword on that rebuilt text
        if (reconstructionToBeUsed.preTransform)
        {
          var rebuiltLine = this.reassemble(rule, decompResult);
          var preKeywordRules = this.allKeywordToKeywordRules[equivalentKeyword];
          if (preKeywordRules == null)
          {
            return [rebuiltLine, decompRules.memoryFunction];
          }
          return preKeywordRules.attemptReconstruction(rebuiltLine, debugMode);
        }
        // if equivalency, redirect to that keyword on the original input
        if (equivalentKeyword != null)
        {
          var equivalentkeywordRules = this.allKeywordToKeywordRules[equivalentKeyword];
          return equivalentkeywordRules.attemptReconstruction(inputLine, debugMode);
        }
        // otherwise, do reconstruction as usual
        reconstructedLine = this.reassemble(rule, decompResult);
        memoryFunction = decompRules.memoryFunction;
      }
    }

    return [reconstructedLine, memoryFunction];
  },

  // build an output string from a reassembly rule's tokens: numbered tokens are
  // replaced by the corresponding decomposition fragment, everything else is
  // copied verbatim
  reassemble: function(rule, decompResult)
  {
    var numberRegEx = /^(\d+)/;
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]+/;
    var trimmedSpacesRegEx = /(^\s+|\s+$)/g;

    var reconstructedLine = "";
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
      else
      {
        reconstructedLine += currentReconToken;
      }
    }
    return reconstructedLine;
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