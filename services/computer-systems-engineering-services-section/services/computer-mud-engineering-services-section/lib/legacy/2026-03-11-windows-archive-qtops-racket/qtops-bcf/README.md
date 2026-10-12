---
title: "qtOps"
date-created: 2026-03-06T00:00:00
---
# qtOps *"cutie ahps"*

***qtOps*** is a Racket package providing procedures for performing operations on *things* with *qualities*. *Things* are essentially fieldless object with a mutable set of methods, while *qualities* are collections of procedures which generate those methods.

*(That sort of object-oriented language is not used frequently in the documentation; don't worry if it was meaningless here.)*

**qtOps** was created by and for [emsenn](https://emsenn.net), who originally wanted to make a [MUD](https://en.wikipedia.org/wiki/MUD) and eventually decided e wanted to do more than that.

As a personal project created by someone with no relevant experience that was not self-guided, **qtOps** is likely to have what others would consider **"fatal" flaws**.
That is to say:

**It is *incredibly* unlikely that qtOps is an appropriate software for your needs.**

The current goal of this project is to continue to provide emsenn with a means of manipulating digital information that e is comfortable with, not providing a useful resource for others.

## Usage

To use **qtOps**, assuming you've understood the statements above, you'll need to install the [Racket](https://racket-lang.org/) programming language, and the `qtops` package:

```sh
raco pkg install qtops
```

To play with **qtOps**, start the Racket REPL (with the `racket` command, no arguments) and then require the package:

```racket
(require qtops)
(define pebble
 (create-thing
  "pebble"
  (list make-mass-procedures)))
```

Try `(pebble 'procedures)` to see what all your new bean can do: maybe turn it into a stone by making it heavier `(pebble 'set-mass!
2700)` and changing its name `(pebble 'set-name!
"stone")`

For further documentation on things and the available qualities, check the [full documentation](https://docs.racket-lang.org/qtops/index.html).
You can also join the #qtops channel on Freenode.

## Contributing

While this project is definitely a personal one, I welcome any contributions.
You can report issues through [Github](https://github.com/emsenn/qtops/issues/new) or [email](mailto:emsenn+qtops@emsenn.net), and submit your own code through [Github](https://github.com/emsenn/qtops/compare) or [email](mailto:emsenn+qtops@emsenn.net).

Since this is a personal project, there are no firm rules for contribution and any cooperation will be handled on a case-by-case basis.
