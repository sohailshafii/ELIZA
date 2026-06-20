# ELIZA

A JavaScript implementation of ELIZA, the classic "Doctor" chatbot from
*ELIZA — A Computer Program For the Study of Natural Language Communication
Between Man And Machine* by Joseph Weizenbaum (1966).

It reads a script of keyword, decomposition, and reassembly rules
(`elizaScript.txt`) and holds a Rogerian-therapist-style conversation: it
tokenizes your input, segments it at punctuation, finds the highest-ranked
keyword in a clause, matches a decomposition pattern, and replies by filling in
a reassembly template (reflecting pronouns — "my" → "your", "me" → "you", and
so on).

Requires Node.js 18 or newer (it uses the built-in test runner).

## Running it

```
node eliza.js
```

Type a line and press Enter to get a reply; press Ctrl-D (or Ctrl-C) to quit.

```
$ node eliza.js
How do you do. Please tell me your problem.
>Men are all alike.
In what way?
>Well, my boyfriend made me come here.
Your boyfriend made you come here?
>It's true. I am unhappy.
I am sorry to hear you are unhappy.
```

For step-by-step tracing (tokenization, candidate decompositions, the selected
phrase, and the chosen reassembly), run in debug mode:

```
node eliza.js debug
```

By default, decomposition patterns are compiled to regular expressions. Pass
`list` to use a more faithful, list-based matcher that walks the input word by
word, the way the paper describes (the two agree on first-match replies; the
list matcher additionally shares one reassembly cycle across an alternation's
branches). The switches combine in any order:

```
node eliza.js list
node eliza.js list debug
```

## Running the tests

```
node --test
```

The suite covers script parsing, punctuation segmentation, keyword matching and
ranking, pronoun reflection, word-boundary matching, and a replay of the
canonical Weizenbaum conversation. The same tests run in CI on every pull
request.

## The script

`elizaScript.txt` is the DOCTOR script from the appendix of Weizenbaum's 1966
CACM article, ported into this engine's format. It was taken from Anthony Hay's
verbatim transcription ([github.com/anthay/ELIZA](https://github.com/anthay/ELIZA),
also mirrored at [elizagen.org](https://github.com/jeffshrager/elizagen.org)),
released under CC0. See the comment block at the top of the file for the
adaptations made (0-based reassembly numbers, notation translation, and two
constructs — `PRE` and `MEMORY` — that this engine approximates).

## Notes

The reflected echoes can read a little stiff (e.g. "your boyfriend made you
come here") — that simple substitution is exactly how the 1966 program worked.
