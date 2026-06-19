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
How do you do? Please tell me your problem.
>Men are all alike.
Do you think they might not be all alike?
>Well, my boyfriend made me come here.
Let's discuss further your boyfriend made you come here.
>It's true. I am unhappy.
Is it because you are unhappy that you came to me?
```

For step-by-step tracing (tokenization, candidate decompositions, the selected
phrase, and the chosen reassembly), run in debug mode:

```
node eliza.js debug
```

## Running the tests

```
node --test
```

The suite covers script parsing, punctuation segmentation, keyword matching and
ranking, pronoun reflection, word-boundary matching, and a replay of the
canonical Weizenbaum conversation. The same tests run in CI on every pull
request.

## Notes

This is a faithful but deliberately small reproduction of the original design,
so the script is limited and the reflected echoes can read a little stiff (e.g.
"your boyfriend made you come here") — that simple substitution is exactly how
the 1966 program worked.
