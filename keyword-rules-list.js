// List-based decomposition matcher -- an alternative to the regex matcher in
// keyword-rules.js, selected with the "list" command-line switch.
//
// This reproduces ELIZA's described mechanism more literally: a decomposition
// is kept as a list of pattern elements and matched against the input word
// list by a recursive matcher that must consume the whole input. "0" matches
// any number of words (fewest first, i.e. leftmost), "n" matches exactly n
// words, and literal / alternation / tag elements each match a single word.
//
// It exposes the same interface as keyword-rules.js (KeywordRules with
// keyword, ranking, replacementKeyword, decompArray, setUpFromAlias,
// addDecompAndReconstructions, attemptReconstruction, print), and within a
// given engine every rule is of this type, so reconstruction redirects stay in
// this matcher. The reconstruction handling (reassembly numbering, NEWKEY, PRE,
// "= keyword" equivalence) is identical to the regex matcher by design.

function ReconstructionRule(rule, equivalentKeyword, preTransform)
{
  this.rule = rule;
  this.equivalentKeyword = equivalentKeyword;
  this.preTransform = (preTransform === true);
}

// build an output string from a reassembly rule's tokens: numbered tokens are
// replaced by the corresponding decomposition fragment, everything else is
// copied verbatim. (decompResult[0] is the whole match; decompResult[i+1] is
// the words bound to decomposition element i, matching the regex matcher.)
function reassemble(rule, decompResult)
{
  var numberRegEx = /^(\d+)/;
  var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]+/;
  var trimmedSpacesRegEx = /(^\s+|\s+$)/g;

  var reconstructedLine = "";
  for (var tokenIndex = 0, numTokens = rule.length; tokenIndex < numTokens; tokenIndex++)
  {
    var currentReconToken = rule[tokenIndex];
    if (tokenIndex > 0) reconstructedLine += " ";
    if (numberRegEx.test(currentReconToken))
    {
      var numberMatch = numberRegEx.exec(currentReconToken)[1];
      var realTokenIndex = parseInt(numberMatch) + 1;
      var tokenUsed = "";
      if (decompResult.length > realTokenIndex)
      {
        tokenUsed = decompResult[realTokenIndex].replace(trimmedSpacesRegEx, '');
      }
      reconstructedLine += tokenUsed;
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
}

// turn reassembly strings into ReconstructionRules, recognising the PRE form
// ("pre: <template> = <keyword>") and the plain "= <keyword>" redirect
function buildReconstructions(reconstructionStrings)
{
  var testEquivalency = /\s*=\s*(\S+)/;
  var testPre = /^pre:\s*(.+?)\s*=\s*(\S+)\s*$/i;
  var reconsArray = [];
  for (var reconsIndex = 0, numRecons = reconstructionStrings.length;
    reconsIndex < numRecons; reconsIndex++)
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
    var equivalentKeyword = (equivaResult != null) ? equivaResult[1].toLowerCase() : null;
    reconsArray.push(new ReconstructionRule(currentReconstr.split(" "), equivalentKeyword));
  }
  return reconsArray;
}

// parse a decomposition string into a list of pattern elements
function parseDecomposition(decompositionString, keywordToFamily)
{
  var tokens = decompositionString.split(" ");
  var elements = [];
  for (var tokenIndex = 0, numTokens = tokens.length; tokenIndex < numTokens; tokenIndex++)
  {
    var token = tokens[tokenIndex];
    if (token === "") continue;
    if (/^\d+$/.test(token))
    {
      var n = parseInt(token);
      // "0" matches any number of words; "n" matches exactly n words
      elements.push(n === 0 ? { type: "wild" } : { type: "words", count: n });
    }
    else if (/^\/\S+$/.test(token))
    {
      // a tag class like /family -> any word in that family
      var familyName = token.substring(1);
      var members = keywordToFamily[familyName] || [];
      elements.push({ type: "set", words: members });
    }
    else if (/^\(.+\)$/.test(token))
    {
      // an alternation like (want-need) -> any one of the listed words
      var alternatives = token.substring(1, token.length - 1).split("-");
      elements.push({ type: "set", words: alternatives });
    }
    else
    {
      elements.push({ type: "literal", word: token });
    }
  }
  return elements;
}

// recursively match elements[ei..] against words[wi..], consuming all input.
// returns an array of bound strings (one per element) or null.
function matchElements(elements, ei, words, wi)
{
  if (ei === elements.length)
  {
    return (wi === words.length) ? [] : null;
  }
  var element = elements[ei];

  if (element.type === "wild")
  {
    // try the fewest words first (leftmost match), like ELIZA
    for (var take = 0; wi + take <= words.length; take++)
    {
      var rest = matchElements(elements, ei + 1, words, wi + take);
      if (rest !== null)
      {
        return [words.slice(wi, wi + take).join(" ")].concat(rest);
      }
    }
    return null;
  }

  if (element.type === "words")
  {
    if (wi + element.count > words.length) return null;
    var restWords = matchElements(elements, ei + 1, words, wi + element.count);
    if (restWords === null) return null;
    return [words.slice(wi, wi + element.count).join(" ")].concat(restWords);
  }

  // literal or set: match exactly one word
  if (wi >= words.length) return null;
  var word = words[wi];
  var matchesWord = (element.type === "literal") ?
    (word === element.word) : (element.words.indexOf(word) !== -1);
  if (!matchesWord) return null;
  var restOne = matchElements(elements, ei + 1, words, wi + 1);
  if (restOne === null) return null;
  return [word].concat(restOne);
}

function ListDecomposition(elements, reconstructionList, memoryFunction)
{
  this.elements = elements;
  this.reconstructionList = reconstructionList;
  this.nextReconstructionToBeUsed = 0;
  this.memoryFunction = memoryFunction;
}

ListDecomposition.prototype =
{
  // cycle through reconstructions, like the regex matcher
  getNextReconstruction: function()
  {
    if (this.reconstructionList == null || this.reconstructionList.length == 0) return null;
    if (this.nextReconstructionToBeUsed == this.reconstructionList.length)
      this.nextReconstructionToBeUsed = 0;
    return this.reconstructionList[this.nextReconstructionToBeUsed++];
  }
};

function KeywordRules(keyword, ranking)
{
  this.keyword = keyword;
  this.ranking = ranking;
  this.replacementKeyword = null;
  this.decompArray = [];
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
    var elements = parseDecomposition(decompositionString, keywordToFamily);
    var reconsArray = buildReconstructions(reconstructionStrings);
    this.decompArray.push(new ListDecomposition(elements, reconsArray, memoryFunction));
  },

  attemptReconstruction: function(inputLine, debugMode)
  {
    inputLine = inputLine.toLowerCase();
    var trimmed = inputLine.replace(/(^\s+|\s+$)/g, '');
    var words = (trimmed === "") ? [] : trimmed.split(/\s+/);

    // use the first decomposition that matches (script order)
    for (var decompIndex = 0, numDecomps = this.decompArray.length;
      decompIndex < numDecomps; decompIndex++)
    {
      var decompRules = this.decompArray[decompIndex];
      var bindings = matchElements(decompRules.elements, 0, words, 0);
      if (bindings === null) continue;

      var decompResult = [words.join(" ")].concat(bindings);
      if (debugMode) console.log("Decomp matched: " + JSON.stringify(decompRules.elements) +
        ", result: " + decompResult);

      var reconstructionToBeUsed = decompRules.getNextReconstruction();
      if (reconstructionToBeUsed == null) return [null, decompRules.memoryFunction];

      var rule = reconstructionToBeUsed.rule;
      if (rule == "NEWKEY") return null;

      // PRE: rebuild from the template, then re-dispatch on the rebuilt text
      if (reconstructionToBeUsed.preTransform)
      {
        var rebuiltLine = reassemble(rule, decompResult);
        var preKeywordRules = this.allKeywordToKeywordRules[reconstructionToBeUsed.equivalentKeyword];
        if (preKeywordRules == null) return [rebuiltLine, decompRules.memoryFunction];
        return preKeywordRules.attemptReconstruction(rebuiltLine, debugMode);
      }
      // "= keyword" redirect on the original input
      if (reconstructionToBeUsed.equivalentKeyword != null)
      {
        var equivalentKeywordRules = this.allKeywordToKeywordRules[reconstructionToBeUsed.equivalentKeyword];
        return equivalentKeywordRules.attemptReconstruction(inputLine, debugMode);
      }
      // ordinary reconstruction
      return [reassemble(rule, decompResult), decompRules.memoryFunction];
    }

    return [null, false];
  },

  print: function()
  {
    console.log("Keyword: " + this.keyword + ", ranking: " + this.ranking +
      ", replacement: " + this.replacementKeyword + ". Num decomps: " +
      this.decompArray.length + ". (list matcher)");
  }
};

exports.refToKeywordRules = KeywordRules;
