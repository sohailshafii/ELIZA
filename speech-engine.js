var keywordRulesModule = require('./keyword-rules');
var keywordRulesRef = keywordRulesModule.refToKeywordRules;

function SpeechEngine(keywordRulesConstructor){
  // which decomposition matcher to use for keyword rules; defaults to the
  // regex matcher in keyword-rules.js, or the list matcher when one is passed
  this.keywordRulesRef = keywordRulesConstructor || keywordRulesRef;

  this.keywordToKeywordRules = { };
  this.keywordToReplacementKeyword = { };
  this.keywordToFamily = { };

  this.introductoryLines = [];
  this.goodByeLines = [];
  this.contentFreeRemarks = [];
  this.memoryStack = [];

  // a MEMORY rule per keyword: when that keyword answers, it also forms a
  // phrase to recall later. Built like a keyword rule (decomp + reassemblies).
  this.keywordToMemoryRules = { };
  this.inMemoryBlock = false;

  // when true, analysis prints step-by-step tracing to the console
  this.debugMode = false;
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
    var contentFreeRegEx = /content-free:\s*(.+)/;
    var memoryRegEx = /memory:\s*(\S+)/;

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
      var contentFreeTest = contentFreeRegEx.exec(currentLine);
      var memoryTest = memoryRegEx.exec(currentLine);

      if (memoryTest != null)
      {
        // start of a "memory: KEYWORD" block; subsequent decomp/reassembly
        // lines build the memory rule (routed by this.inMemoryBlock) until
        // "endmemory"
        var memoryKeyword = memoryTest[1].toLowerCase();
        this.inMemoryBlock = true;
        this.currentKeyword = memoryKeyword;
        if (!this.keywordToMemoryRules.hasOwnProperty(memoryKeyword))
        {
          this.keywordToMemoryRules[memoryKeyword] = new this.keywordRulesRef(memoryKeyword, 0);
        }
      }
      else if (currentLine.includes("endmemory"))
      {
        this.inMemoryBlock = false;
        this.currentKeyword = null;
        this.currentReconstructions = [];
      }
      else if (introLineTest != null)
      {
        this.introductoryLines.push(introLineTest[1]);
      }
      else if (goodByeLineTest != null)
      {
        this.goodByeLines.push(goodByeLineTest[1]);
      }
      else if (contentFreeTest != null)
      {
        this.contentFreeRemarks.push(contentFreeTest[1]);
      }
      else if (replacementTest != null)
      {
        var keyword = replacementTest[1].toLowerCase(),
          replacementKeyword = replacementTest[2].toLowerCase();
        if (!this.keywordToReplacementKeyword.hasOwnProperty(keyword))
        {
          this.keywordToReplacementKeyword[keyword] = replacementKeyword;
        }
      }
      else if (familyTest != null)
      {
        var keyword = familyTest[1].toLowerCase();
        var parsedFamilyMembers = familyTest[2].split(",");

        if (!this.keywordToFamily.hasOwnProperty(keyword))
        {
          this.keywordToFamily[keyword] = [];
        }
        for (var tokenIndex = 0, numTokens = parsedFamilyMembers.length;
          tokenIndex < numTokens; tokenIndex++)
        {
          this.keywordToFamily[keyword].push(parsedFamilyMembers[tokenIndex].toLowerCase());
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
      var equivRegExTest = /([^\d\s]+)\s+([^\s]*)\s*=\s+([^\d\s]+)/.exec(keywordPhrase);

      if (equivRegExTest != null)
      {
        this.currentKeyword = equivRegExTest[1].toLowerCase();
        var ranking = (equivRegExTest[2] == "") ? 0 : equivRegExTest[2];
        this.createKeywordFromEquivalency(this.currentKeyword, 
          equivRegExTest[3].toLowerCase(), ranking);
      }
      else
      {
        var keywordRank = 0;
        if (rankRegExTest != null)
        {
          this.currentKeyword = rankRegExTest[1].toLowerCase();
          keywordRank = rankRegExTest[2];
        }
        else 
        {
          this.currentKeyword = keywordPhrase.replace(trimmedSpacesRegEx,'').toLowerCase();
        }
        this.makeNewKeywordRules(this.currentKeyword, keywordRank);
      }
    }
    else if (replaceTest != null)
    {
      var replacement = replaceTest[1].replace(trimmedSpacesRegEx, '').toLowerCase();
      this.keywordToKeywordRules[this.currentKeyword].replacementKeyword = replacement;
    }
    else if (decompTest != null)
    {
      this.currentDecompRule = decompTest[1].replace(trimmedSpacesRegEx,'').toLowerCase();
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
      // Reset any reconstructions/memory left over from an unterminated
      // decomp so they cannot leak into the next keyword's first decomp.
      this.currentReconstructions = [];
      this.memoryFunction = false;
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
      this.keywordToKeywordRules[keyword] = new this.keywordRulesRef(keyword, ranking);
    }
  },

  createKeywordFromEquivalency: function(keyword, keywordAlias, ranking)
  {
    if (keywordAlias === null || keyword === null) return;
    if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
    {
      this.keywordToKeywordRules[keyword] = new this.keywordRulesRef(keyword, ranking);
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
    var targetRules = this.inMemoryBlock ?
      this.keywordToMemoryRules : this.keywordToKeywordRules;
    var keywordRules = targetRules[keyword];
    keywordRules.addDecompAndReconstructions(this.keywordToKeywordRules, decompositionString,
      reconstructionStrings, memoryFunction, this.keywordToFamily);
  },

  tokenizeBasedOnSpaceAndPunctuation: function(inputLine)
  {
    var currentInputLineArray = [];
    var processingAWord = false;
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]/;
    var spaceRegEx = /\s/;

    for (var inputLineIndex = 0, inputLineLength = inputLine.length;
      inputLineIndex < inputLineLength; inputLineIndex++)
    {
      var currentCharacter = inputLine[inputLineIndex];
      // skip spaces and indicate that we are going to encounter a new word
      if (spaceRegEx.test(currentCharacter)) 
      { processingAWord = false; continue; }

      // punctuation ends words
      if (punctuationRegEx.test(currentCharacter))
      {
        currentInputLineArray.push(currentCharacter);
        processingAWord = false;
      }
      // if we haven't found a new word, then start one. 
      else if (!processingAWord)
      {
        currentInputLineArray.push(currentCharacter);
        processingAWord = true;
      }
      else
      {
        // else just append character to current word
        currentInputLineArray[currentInputLineArray.length-1] += currentCharacter;
      }
    }
    return currentInputLineArray;
  },

  analyzeInputLine: function(inputLine)
  {
    var outputLine = null;
    var currentMaxRanking = -1;
    var keywordRulesStack = [];
    
    // make case consistent throughout function
    inputLine = inputLine.toLowerCase();
    var inputLineArray = this.tokenizeBasedOnSpaceAndPunctuation(inputLine);
    if (this.debugMode) console.log("Tokenized input line: " + inputLineArray + ".");
    var punctuationRegEx = /[.,\/#!?$%\^&\*;:{}=\-_`~()]/;

    // do all on-the-fly pre-replacements here (e.g. "dont" -> "don't",
    // "me" -> "you"); everything is already lower-case. A replacement may
    // expand to several words (e.g. "i'm" -> "i am"), so re-split it into
    // separate tokens -- otherwise the words inside it would never be matched
    // as keywords.
    var replacedInputLineArray = [];
    // A single-word pre-replacement is a finished reflection (e.g. "me" ->
    // "you"); flag it so the keyword pass below does not reflect it a second
    // time -- otherwise "me" -> "you" -> "i". Multi-word expansions (e.g.
    // "i'm" -> "i am") are NOT flagged, so their words still reflect normally
    // ("i" -> "you", "am" -> "are").
    var alreadyReflected = [];
    for (var inputLineArrayIndex = 0, inputLineArrayLength = inputLineArray.length;
      inputLineArrayIndex < inputLineArrayLength; inputLineArrayIndex++)
    {
      var currentWord = inputLineArray[inputLineArrayIndex];
      if (this.keywordToReplacementKeyword.hasOwnProperty(currentWord))
      {
        var replacementWords = this.keywordToReplacementKeyword[currentWord].split(/\s+/);
        var isSingleWordReplacement = (replacementWords.length === 1);
        for (var replacementIndex = 0; replacementIndex < replacementWords.length;
          replacementIndex++)
        {
          replacedInputLineArray.push(replacementWords[replacementIndex]);
          alreadyReflected.push(isSingleWordReplacement);
        }
      }
      else
      {
        replacedInputLineArray.push(currentWord);
        alreadyReflected.push(false);
      }
    }
    inputLineArray = replacedInputLineArray;

    // Segment the input at punctuation and decompose only a single phrase.
    // ELIZA scans left to right; the first clause that yields a keyword is the
    // one it answers, and earlier keyword-less clauses are discarded. This
    // matters because a decomposition pattern cannot match across punctuation,
    // so feeding it the whole line (e.g. a leading "Well, ...") would block
    // every pattern and force a content-free fallback.
    var phraseWords = [];
    var selectedPhrase = null;

    for (var tokenIndex = 0, numTokens = inputLineArray.length;
      tokenIndex <= numTokens; tokenIndex++)
    {
      var currentToken = (tokenIndex < numTokens) ? inputLineArray[tokenIndex] : null;
      var atPhraseBoundary = (currentToken === null) ||
        punctuationRegEx.test(currentToken);

      if (!atPhraseBoundary)
      {
        var currentWord = currentToken;

        // if keyword encountered
        if (this.keywordToKeywordRules.hasOwnProperty(currentWord))
        {
          var keywordRules = this.keywordToKeywordRules[currentWord];

          // on-the-fly keyword replacement (e.g. "my" -> "your", "i" -> "you"),
          // unless this token is already a finished reflection from a
          // pre-replacement (see alreadyReflected above)
          if (keywordRules.replacementKeyword != null && !alreadyReflected[tokenIndex])
          {
            currentWord = keywordRules.replacementKeyword;
          }

          // include each keyword once, highest ranking first
          var alreadyStacked = false;
          for (var stackIndex = 0; stackIndex < keywordRulesStack.length; stackIndex++)
          {
            if (keywordRulesStack[stackIndex].keyword === keywordRules.keyword)
            {
              alreadyStacked = true;
              break;
            }
          }
          if (!alreadyStacked)
          {
            var ranking = parseInt(keywordRules.ranking);
            if (ranking > currentMaxRanking)
            {
              // highest ranked items at beginning
              currentMaxRanking = ranking;
              keywordRulesStack.splice(0, 0, keywordRules);
            }
            else
            {
              keywordRulesStack.push(keywordRules);
            }
          }
        }

        phraseWords.push(currentWord);
        continue;
      }

      // At a phrase boundary (punctuation or end of input): the first clause
      // that contains a keyword is the one we answer.
      if (keywordRulesStack.length > 0)
      {
        selectedPhrase = phraseWords.join(" ");
        break;
      }
      // No keyword in this clause -- discard it and scan the next one.
      phraseWords = [];
      currentMaxRanking = -1;
    }

    if (this.debugMode) console.log("Selected phrase for reconstruction: " + selectedPhrase);

    for (var keywordStackIndex = 0, keywordStackLength = keywordRulesStack.length;
      keywordStackIndex < keywordStackLength; keywordStackIndex++)
    {
      var currentKeywordRules = keywordRulesStack[keywordStackIndex];
      var currentAttempt = currentKeywordRules.attemptReconstruction(selectedPhrase, this.debugMode);
      if (this.debugMode) console.log("keyword " + currentKeywordRules.keyword + " attempt " + currentAttempt);
      // attemptReconstruction returns null when it gives up on this keyword
      // (NEWKEY), or [line, memory] where line is null if no decomposition
      // matched. In both no-result cases, fall through to the next (lower
      // ranked) keyword in the stack instead of stopping here.
      if (currentAttempt !== null && currentAttempt[0] !== null)
      {
        outputLine = currentAttempt[0];

        // if this keyword has a MEMORY rule, form a separate phrase from the
        // same clause and stash it to recall later (when no keyword matches)
        var memoryRules = this.keywordToMemoryRules[currentKeywordRules.keyword];
        if (memoryRules != null)
        {
          var memoryAttempt = memoryRules.attemptReconstruction(selectedPhrase, this.debugMode);
          if (memoryAttempt !== null && memoryAttempt[0] !== null)
          {
            this.memoryStack.push(memoryAttempt[0]);
          }
        }
        break;
      }
    }

    // last-ditch efforts
    if (outputLine == null)
    {
      if (this.memoryStack.length > 0)
      {
        outputLine = this.memoryStack.pop();
      }
      else if (this.contentFreeRemarks != null && this.contentFreeRemarks.length > 0)
      {
        var randomIndex = parseInt(Math.random()*this.contentFreeRemarks.length);
        outputLine = this.contentFreeRemarks[randomIndex];
      }
    }

    // since we always convert the user's input into lowercase, we might use their input
    // to construct the beginning of the output line. make sure that first letter is always
    // uppercase. also make sure that "I" is always capitalized
    if (outputLine != null && outputLine.length > 0)
    {

      if (this.debugMode) console.log("done: " + outputLine);
      var capitalizedChar = outputLine[0].toUpperCase();
      outputLine = outputLine.replace(/^./, capitalizedChar);
      // make sure individual Is are capitalized. even ones adjacent to punctuation.
      outputLine = outputLine.replace(/\si\s/g, " I ");
      outputLine = outputLine.replace(/\s(i)([.,\/#!?$%\^&\*;:{}=\\-_`~()])/, " I$2");
      outputLine = outputLine.replace(/([.,\/#!?$%\^&\*;:{}=\\-_`~()])(i)\s/, "$1I ");
    }

    return outputLine;
  },

  print: function()
  {
    if (this.keywordToKeywordRules === null) return;

    for (var key in this.keywordToReplacementKeyword)
    {
      if (!this.keywordToReplacementKeyword.hasOwnProperty(key)) return;
      console.log(key + "->" + this.keywordToReplacementKeyword[key]);
    }

    for (var key in this.keywordToKeywordRules)
    {
      if (!this.keywordToKeywordRules.hasOwnProperty(key)) return;
      console.log("Keyword: " + key);
      this.keywordToKeywordRules[key].print();
    }
  }
};

exports.refToSpeechEngine = SpeechEngine;