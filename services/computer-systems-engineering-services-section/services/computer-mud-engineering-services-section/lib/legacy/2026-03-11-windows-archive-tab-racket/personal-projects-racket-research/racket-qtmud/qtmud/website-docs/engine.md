---
title: "Engine"
---

+++ title = "Engine Code" author = ["emsenn"] draft = false +++

<div class="ox-hugo-toc toc local">
<div></div>

- [Thing](#thing)
    - [Making a Thing](#making-a-thing)
    - [Working with a Thing](#working-with-a-thing)
    - [Working with a group of Things](#working-with-a-group-of-things)
- [Universe](#universe)
    - [Making a Universe](#making-a-universe)
    - [Working with a Universe](#working-with-a-universe)
    - [Making a Universe Tick](#making-a-universe-tick)
- [Utilities](#utilities)

</div>
<!--endtoc-->

Like many MUDs that have come before it, qtMUD divides its code up into an engine (documented below) and a [library](../library/) of components.
See the [_qtMUD Overview_](../documentation/qtmud-overview/) for an explanation of how these parts relate.

Explaining how the qtMUD engine works is best done by looking at its name: it's the "qt" MUD: that stands for _qualities of things_:

The things that exist within the MUD: player-characters, items, game areas, are all _things_, possessing different _qualities_.

## Thing {#thing}

<a id="code-snippet--thing-struct"></a>
```racket
(struct thing
  (name universe
      grammar
      qualities)
  #:mutable)
```

### Making a Thing {#making-a-thing}

#### make-thing {#make-thing}

The `make-thing` procedure is simply an interface for the `thing` struct, coming with some defaults for filling out the mud (`#f`), grammar, and qualities (empty hash-tables).

<a id="code-snippet--make-thing-procedure"></a>
```racket
(define (make-thing [name "thing"] [chosen-universe #f] #:grammar [grammar #f] #:qualities [qualities #f])
  (log-info "Making a new thing named ~a~a"
	   name
	   (cond [chosen-universe (format " for ~a." (universe-name chosen-universe))]
		 [else "."]))
  (let ([made-thing
       (thing
	name
	chosen-universe
	(cond [grammar (make-hash grammar)][else (make-hash)])
	(cond [qualities (make-hash qualities)][else (make-hash)]))])
    (when chosen-universe
      (add-thing-to-universe-things! made-thing chosen-universe))
    made-thing))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--make-thing-procedure">Code Snippet 1</a></span>:
  qtMUD's <code>make-thing</code> procedure: creates a new <a href="https://emsenn.net/programming/qtmud/structs/thing">thing</a>.
</div>

#### make-thing-maker-for-universe {#make-thing-maker-for-universe}

<a id="code-snippet--make-thing-maker-for-universe-procedure"></a>
```racket
(define (make-thing-maker-for-universe making-universe)
(λ (name #:grammar [grammar #f] #:qualities [qualities #f])
  (cond [(and grammar qualities)
	 (make-thing name making-universe #:grammar grammar #:qualities qualities)]
      [grammar
	 (make-thing name making-universe #:grammar grammar)]
	[qualities
	 (make-thing name making-universe #:qualities qualities)]
	[else
	 (make-thing name making-universe)])))
```

### Working with a Thing {#working-with-a-thing}

#### Qualities {#qualities}

##### thing-has-quality? {#thing-has-quality}

<a id="code-snippet--thing-has-quality?-procedure"></a>
```racket
(define (thing-has-quality? queried-thing quality)
  (log-debug "Checking if ~a has ~a quality." (thing-name queried-thing) quality)
  (let ([qualities (thing-qualities queried-thing)])
    (cond [(hash-has-key? qualities quality)
	 (hash-ref qualities quality)]
	[else #f])))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--thing-has-quality?-procedure">Code Snippet 2</a></span>:
  qtMUD's <code>thing-quality</code> procedure: reads a <a href="https://emsenn.net/programming/qtmud/structs/thing">thing</a>'s quality.
</div>

##### thing-quality {#thing-quality}

<a id="code-snippet--thing-quality-procedure"></a>
```racket
(define (thing-quality queried-thing quality)
  (cond [(thing-has-quality? queried-thing quality)
	 (log-debug "Reading ~a quality from ~a" quality (thing-name queried-thing))
       (hash-ref (thing-qualities queried-thing) quality)]
      [else
       (log-warning "Tried to read non-existent ~a quality from ~a."
		    quality
		    (thing-name queried-thing))]))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--thing-quality-procedure">Code Snippet 3</a></span>:
  qtMUD's <code>thing-quality</code> procedure: reads a <a href="https://emsenn.net/programming/qtmud/structs/thing">thing</a>'s quality.
</div>

##### set-thing-quality! {#set-thing-quality}

<a id="code-snippet--set-thing-quality!-procedure"></a>
```racket
(define (set-thing-quality! changed-thing changed-quality new-value)
  (log-debug "Setting ~a's ~a quality to ~a." (thing-name changed-thing) changed-quality new-value)
  (hash-set! (thing-qualities changed-thing) changed-quality new-value))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--set-thing-quality!-procedure">Code Snippet 4</a></span>:
  Racket procedure to set a qtMUD thing's quality to a new value.
</div>

### Working with a group of Things {#working-with-a-group-of-things}

#### list-thing-names {#list-thing-names}

<a id="code-snippet--list-thing-names-procedure"></a>
```racket
(define (list-thing-names things)
  (oxfordize-list
   (map
    (λ (this-thing)
      (thing-name this-thing))
    things)))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--list-thing-names-procedure">Code Snippet 5</a></span>:
  Add a thing to another's ecoregions.
</div>

## Universe {#universe}

<a id="code-snippet--universe-struct"></a>
```racket
(struct universe
  (name
   tick-count schedule
   things procedures)
  #:mutable)
```

### Making a Universe {#making-a-universe}

<a id="code-snippet--make-universe-procedure"></a>
```racket
(define (make-universe [name "qtVerse"] [events '()])
  (log-info "Making a new universe named ~a" name)
  (universe name 0 events (list) (make-hash)))
```

### Working with a Universe {#working-with-a-universe}

#### Tick Count {#tick-count}

##### increment-universe-tick-count! {#increment-universe-tick-count}

<a id="code-snippet--increment-universe-tick-count!-procedure"></a>
```racket
(define (increment-universe-tick-count! incremented-universe [addition 1])
  (set-universe-tick-count!
    incremented-universe (+ (universe-tick-count incremented-universe) addition)))
```

#### Schedule {#schedule}

##### add-event-to-universe-schedule! {#add-event-to-universe-schedule}

<a id="code-snippet--add-event-to-universe-schedule!-procedure"></a>
```racket
(define (add-event-to-universe-schedule! new-event changed-universe)
  (cond [(procedure? new-event)
       (set-universe-schedule! changed-universe (append (universe-schedule changed-universe) (list new-event)))]
      [else
       (log-warning "Tried to schedule non-procedure as event: ~a" new-event)]))
```

##### add-thing-to-universe-things! {#add-thing-to-universe-things}

<a id="code-snippet--add-thing-to-universe-things!-procedure"></a>
```racket
(define (add-thing-to-universe-things! new-thing changed-universe)
  (set-universe-things! changed-universe (append (universe-things changed-universe) (list new-thing))))
```

#### Procedures {#procedures}

##### universe-has-procedure? {#universe-has-procedure}

<a id="code-snippet--universe-has-procedure?-procedure"></a>
```racket
(define (universe-has-procedure? queried-universe queried-procedure)
  (hash-has-key? (universe-procedures queried-universe) queried-procedure))
```

##### universe-procedure {#universe-procedure}

<a id="code-snippet--universe-procedure-procedure"></a>
```racket
(define (universe-procedure queried-universe queried-procedure)
  (cond [(universe-has-procedure? queried-universe queried-procedure)
       (hash-ref (universe-procedures queried-universe) queried-procedure)]
      [else
       (log-warning "Tried to use procedure ~a from universe ~a, but it doesn't exist."
		    queried-procedure
		    (universe-name queried-universe))]))
```

##### set-universe-procedure! {#set-universe-procedure}

<a id="code-snippet--set-universe-procedure!-procedure"></a>
```racket
(define (set-universe-procedure! changed-universe new-procedure-key new-procedure)
  (hash-set!
   (universe-procedures
    changed-universe)
   new-procedure-key
   new-procedure))
```

### Making a Universe Tick {#making-a-universe-tick}

#### tick-universe {#tick-universe}

<a id="code-snippet--tick-universe-procedure"></a>
```racket
(define (tick-universe ticked-universe)
  (increment-universe-tick-count! ticked-universe)
  (log-debug "Universe ~a is beginning its tick, count #~a" (universe-name ticked-universe) (universe-tick-count ticked-universe))
  (let ([events-this-tick (universe-schedule ticked-universe)])
    (log-debug "Universe ~a is ticking, looking at events: ~a" (universe-name ticked-universe) events-this-tick)
    (set-universe-schedule! ticked-universe '())
    (let loop ()
      (unless (null? events-this-tick)
      (let ([current-event (car events-this-tick)])
	  (log-debug "Universe ~a is ticking, looking at event: ~a" (universe-name ticked-universe) current-event)
	(set! events-this-tick (cdr events-this-tick))
	(let ([event-result (current-event ticked-universe)])
	  (when (universe? event-result) (set! ticked-universe event-result))))
      (loop))))
  (log-debug "Universe ~a has ended its tick, count #~a" (universe-name ticked-universe) (universe-tick-count ticked-universe))
  ticked-universe)
```

#### run-universe {#run-universe}

<a id="code-snippet--run-universe-procedure"></a>
```racket
(define (run-universe running-universe [tick-rate 200])
  (thread
   (λ () (let loop ()
	 (set! running-universe (tick-universe running-universe))
	 (sleep 0.2)
	 (loop)))))
```

old:

```racket
  (define (run-universe running-universe [tick-rate 200])
    (define time-of-last-tick (current-inexact-milliseconds))
    (thread
     (λ ()
       (let loop ()
;	 (log-debug "CIM/tick difference is ~a"
;		    (- (current-inexact-milliseconds) time-of-last-tick))
       (when (> (- (current-inexact-milliseconds) time-of-last-tick) tick-rate)
;	   (log-debug "Triggering tick of ~a" (universe-name running-universe))
	   (set! running-universe (tick-universe running-universe))
	 (set! time-of-last-tick (current-inexact-milliseconds)))
       (loop)))))
```

## Utilities {#utilities}

#### oxfordize-list {#oxfordize-list}

<a id="code-snippet--oxfordize-list-procedure"></a>
```racket
(define (oxfordize-list strings)
  (cond
    [(null? strings)
     (log-warning "Tried to oxfordize an empty list.")]
    [(null? (cdr strings))
     (car strings)]
    [(null? (cddr strings))
     (string-join strings " and ")]
    [else
     (string-join strings ", "
		  #:before-first ""
		  #:before-last ", and ")]))
```

#### deserialize-file {#deserialize-file}

<a id="code-snippet--deserialize-file-procedure"></a>
```racket
(define (deserialize-file save-file)
  (when (file-exists? save-file)
    (log-debug "Deserializing file ~a" save-file)
    (with-handlers
      ([exn:fail:filesystem:errno?
      (λ (E) (log-warning "Failed to deserialize file: ~a" E))])
      (with-input-from-file save-file (λ () (deserialize (read)))))))
```

#### make-universe-logger {#make-universe-logger}

<a id="code-snippet--make-universe-logger-procedure"></a>
```racket
(define (make-universe-logger logging-universe [loglevel 'info])
  (define universe-log
    (make-logger (string->symbol (universe-name logging-universe))))
  (define universe-log-receiver
    (make-log-receiver universe-log loglevel))
  (cons universe-log universe-log-receiver))
```

#### run-universe-logger {#run-universe-logger}

<a id="code-snippet--run-universe-logger-procedure"></a>
```racket
(define (run-universe-logger universe-logger)
  (let ([universe-log (car universe-logger)]
      [universe-log-receiver (cdr universe-logger)])
    (current-logger universe-log)
    (thread (λ ()
	    (let log-loop ()
	      (define log-vector (sync universe-log-receiver))
	      (let ([log-level (vector-ref log-vector 0)]
		    [log-string (substring
				 (vector-ref log-vector 1)
				 12
				 (length (string->list
					  (vector-ref log-vector 1))))])
		(cond[ (eq? log-level 'debug)
		       (printf ">>> \"~a\"\n"
			       log-string)]
		      [else
		       (printf "\"~a\"\n" log-string)]))
	      (log-loop))))))
```
