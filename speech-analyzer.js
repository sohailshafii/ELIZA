function KeywordRules ()
{
	this.keyword = null;
	this.decompToReconstruction = {};
}

KeywordRules.prototype =
{
	addDecompAndReconstructions(decompositionString, reconstructionStrings)
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
	addDecompRules: function(keyword, decompositionString, reconstructionStrings)
	{
		if (keyword == null) return;
		if (!this.keywordToKeywordRules.hasOwnProperty(keyword))
		{
			this.keywordToKeywordRules[keyword] = new KeywordRules();
		}

		var keywordRules = this.keywordToKeywordRules[keyword];
		keywordRules.addDecompAndReconstructions(decompositionString, reconstructionStrings);
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