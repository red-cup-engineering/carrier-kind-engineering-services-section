#lang racket

(require "../structs/mud.rkt"
         "grammar.rkt"
         "raising-errors.rkt"
         "universe.rkt"
         "utilities.rkt")

(provide thing-name=?
         thing-adjectives
         thing-nouns
         set-thing-nouns!
         add-noun-to-thing!
         add-nouns-to-thing!
         set-thing-adjectives!
         add-adjective-to-thing!
         add-adjectives-to-thing!
         thing-matches-term?
         use-thing-procedure
         use-thing-quality-procedure
         thing-has-procedure?
         thing-procedure
         set-thing-procedure!
         add-procedures-to-thing!
         thing-has-universe?
         thing-has-quality?
         add-qualities-to-thing!
         add-qualities-to-things!
         thing-quality
         thing-quality-head
         thing-quality-tail
         add-quality-to-thing!
         set-thing-quality!
         add-string-to-thing-quality!
         element-in-thing-quality?
         add-element-to-thing-quality!
         add-elements-to-thing-quality!
         remove-element-from-thing-quality!
         add-keyvalue-to-thing-quality!
         add-keyvalues-to-thing-quality!
         remove-key-from-thing-quality!
         thing-quality-key
         list-thing-names
         things-with-quality
         search-things-by-term
         search-thing-quality-by-term
         add-string-to-quality-of-things!
         add-string-to-quality-of-things-with-quality!
         add-string-to-quality-of-things-with-quality-in-quality-of-thing!
         )

(define (thing-name=? queried-thing given-string)
  (string=? (thing-name queried-thing) given-string))

(define (thing-adjectives queried-thing)
  (unless (thing? queried-thing)
    (raise-argument-error 'thing-adjectives
                          "thing?" queried-thing))
  (define queried-thing-grammar
    (thing-grammar queried-thing))
  (cond
    [(hash-has-key? queried-thing-grammar 'adjectives)
     (hash-ref queried-thing-grammar 'adjectives)]
    [else '()]))

(define (thing-nouns queried-thing)
  (unless (thing? queried-thing)
    (raise-argument-error 'thing-nouns
                          "thing?" queried-thing))
  (define queried-thing-grammar
    (thing-grammar queried-thing))
  (cond
    [(hash-has-key? queried-thing-grammar 'nouns)
     (hash-ref queried-thing-grammar 'nouns)]
    [else '()]))

(define (set-thing-nouns! changed-thing
                          new-nouns)
  (unless (thing? changed-thing)
    (raise-argument-error 'set-thing-nouns!
                          "thing?" changed-thing))
  (unless (and (list? new-nouns)
               (andmap string? new-nouns))
    (raise-argument-error 'set-thing-nouns!
                          "listof string?" new-nouns))
  (hash-set! (thing-grammar changed-thing)
             'nouns
             new-nouns))
(define (add-noun-to-thing! new-noun changed-thing)
  (define changed-thing-grammar
    (thing-grammar changed-thing))
  (hash-set! changed-thing-grammar
             'nouns
             (cond
               [(hash-has-key? changed-thing-grammar 'nouns)
                (append (hash-ref changed-thing-grammar 'nouns)
                        (list new-noun))]
               [else
                (list new-noun)])))

(define (add-nouns-to-thing! new-nouns changed-thing)
  (define changed-thing-grammar
    (thing-grammar changed-thing))
  (hash-set! changed-thing-grammar
             'nouns
             (cond
               [(hash-has-key? changed-thing-grammar 'nouns)
                (append (hash-ref changed-thing-grammar 'nouns)
                        new-nouns)]
               [else new-nouns])))

(define (set-thing-adjectives! changed-thing
                          new-adjectives)
  (unless (thing? changed-thing)
    (raise-argument-error 'set-thing-adjectives!
                          "thing?" changed-thing))
  (unless (and (list? new-adjectives)
               (andmap string? new-adjectives))
    (raise-argument-error 'set-thing-adjectives!
                          "listof string?" new-adjectives))
  (hash-set! (thing-grammar changed-thing)
             'adjectives
             new-adjectives))

(define (add-adjective-to-thing! new-adjective changed-thing)
  (define changed-thing-grammar
    (thing-grammar changed-thing))
  (hash-set! changed-thing-grammar
             'adjectives
             (cond
               [(hash-has-key? changed-thing-grammar 'adjectives)
                (append (hash-ref changed-thing-grammar 'adjectives)
                        (list new-adjective))]
               [else
                (list new-adjective)])))

(define (add-adjectives-to-thing! new-adjectives changed-thing)
  (define changed-thing-grammar
    (thing-grammar changed-thing))
  (hash-set! changed-thing-grammar
             'adjectives
             (cond
               [(hash-has-key? changed-thing-grammar 'adjectives)
                (append (hash-ref changed-thing-grammar 'adjectives)
                        new-adjectives)]
               [else new-adjectives])))

(define (thing-matches-term? queried-thing
                             queried-term)
          queried-term (thing-name queried-thing)
  (define queried-thing-name (thing-name queried-thing))
  (printf "Checking if ~a matches ~a\n"
             queried-thing-name
             queried-term)
  (cond
    [(string=? queried-thing-name queried-term)
     (printf "Term matches name exactly")
     #t]
    [else
     (define split-queried-term
       (string-split queried-term " "))
     (define queried-term-noun
       (cond
         [(> (length split-queried-term) 1)
          (last split-queried-term)]
         [else (car split-queried-term)]))
     (define queried-thing-split-name
       (string-split queried-thing-name " "))
     (define queried-thing-nouns
       (append (thing-nouns queried-thing)
               (list
                (cond
                  [(> (length queried-thing-split-name) 1)
                   (last queried-thing-split-name)]
                  [else (car queried-thing-split-name)]))))
     (cond
       [(member queried-term-noun
                queried-thing-nouns)
        (cond
          [(> (length split-queried-term) 1)
           (printf "Multiword term, looking at adjectives.\n")
           (define queried-thing-adjectives
             (thing-adjectives queried-thing))
           (cond
             [(> (length queried-thing-adjectives) 0)
              (define queried-term-adjectives
                (reverse (cdr (reverse split-queried-term))))
              (printf "Comparing ~a to ~a\n"
                      queried-thing-adjectives
                      queried-term-adjectives)
              (andmap
               (λ (adjective)
                 (cond
                   [(eq? #f (member adjective
                                    queried-thing-adjectives))
                    #f]
                   [else #t]))
               queried-term-adjectives)]
             [else #f])]
          [else #t])]
       [else #f])]))

(define (use-thing-procedure handler-procedure
                      handled-thing
                      handled-symbol
                      [new-value #f]
                      #:pass-symbol [pass-symbol #t]
                      #:flip-syntax [flip-syntax #f])
  (unless (symbol? handler-procedure)
    (raise-argument-error 'use-thing-procedure
                          "symbol?" handler-procedure))
  (unless (thing? handled-thing)
    (raise-argument-error handler-procedure
                          "thing?" handled-thing))
  (unless (symbol? handled-symbol)
    (raise-argument-error handler-procedure
                          "symbol?" handled-symbol))
  (define (do-target-procedure target-procedure
                               handled-thing
                               handled-symbol
                               new-value)
    (cond
      [new-value
       (cond
         [pass-symbol
          (cond
            [flip-syntax
              (target-procedure new-value
                                handled-thing
                                handled-symbol)]
            [else
             (target-procedure handled-thing
                               handled-symbol
                               new-value)])]
         [else
          (cond
            [flip-syntax
             (target-procedure new-value
                               handled-thing)]
            [else
             (target-procedure handled-thing
                               new-value)])])]
      [else
       (cond
         [pass-symbol
          (target-procedure handled-thing handled-symbol)]
         [else
          (target-procedure handled-thing)])]))
  (define handled-thing-name (thing-name handled-thing))
  (define handled-thing-universe
    (thing-universe handled-thing))
  (log-debug "Checking if ~a has a ~a procedure."
             handled-thing-name
             handler-procedure)
  (cond [(thing-has-procedure? handled-thing handler-procedure #t)
         (log-debug "~a has a ~a procedure, using it."
                    handled-thing-name
                    handler-procedure)
          (do-target-procedure
           (thing-procedure handled-thing handler-procedure #t)
           handled-thing handled-symbol new-value)]
        [(and handled-thing-universe
              (universe-has-procedure? handled-thing-universe
                                       handler-procedure))
         (log-debug "~a's universe ~a has a ~a procedure, using it."
                    handled-thing-name
                    (universe-name handled-thing-universe)
                    handler-procedure)
         (do-target-procedure
          (universe-procedure handled-thing-universe
                              handler-procedure)
          handled-thing handled-symbol new-value)]
        [else
         (log-debug "~a doesn't have a ~a procedure."
                    handled-thing-name
                    handler-procedure)
         #f]))

(define (use-thing-quality-procedure handler-procedure
                                     handled-thing
                                     handled-symbol
                                     [new-value #f]
                                     #:flip-syntax [flip-syntax #f])
  (log-debug (§ "Checking if ~a has a ~a procedure for the ~a "
                "quality.")
             (thing-name handled-thing)
             handler-procedure
             handled-symbol)
  (unless (use-thing-procedure (symbol-replace handler-procedure
                                               'quality
                                               handled-symbol)
                               handled-thing
                               handled-symbol
                               new-value
                               #:pass-symbol #f
                               #:flip-syntax flip-syntax)
    (use-thing-procedure handler-procedure
                         handled-thing
                         handled-symbol
                         new-value
                         #:pass-symbol #f
                         #:flip-syntax flip-syntax)))

(define (thing-has-procedure? queried-thing
                              queried-procedure
                              [skip #f])
  (when (or skip
            (not (use-thing-procedure 'thing-has-procedure?
                                      queried-thing
                                      queried-procedure)))
    (hash-has-key? (thing-procedures queried-thing)
                   queried-procedure)))

(define (thing-procedure queried-thing
                         queried-procedure
                         [skip #f])
  (when (or skip
            (not (use-thing-procedure 'thing-procedure?
                                      queried-thing
                                      queried-procedure)))
    (hash-ref (thing-procedures queried-thing) queried-procedure)))

(define (set-thing-procedure! changed-thing
                              changed-procedure
                              new-value
                              [skip #f])
  (when (or skip
            (not (use-thing-procedure 'set-thing-procedure!
                                      changed-thing
                                      changed-procedure
                                      new-value)))
    (hash-set! (thing-procedures changed-thing)
               changed-procedure
               new-value)))

(define (add-procedures-to-thing! procedures-list
                                  target-thing)
  (unless (and (list? procedures-list)
               (andmap symbol?
                       (map (λ (p) (car p))
                            procedures-list))
               (andmap procedure?
                       (map (λ (p) (cdr p))
                            procedures-list)))
    (raise-argument-error 'add-procedures-to-universe!
                          "listof (symbol? . procedure?)"
                          procedures-list))
  (map (λ (added-procedure)
         (define procedure-key (car added-procedure))
         (unless (thing-has-procedure? target-thing
                                       procedure-key)
           (set-thing-procedure! target-thing
                                 procedure-key
                                 (cdr added-procedure))))
       procedures-list))

(define (thing-has-universe? queried-thing)
  (cond [(universe? (thing-universe queried-thing)) #t]
        [else #f]))

(define (thing-has-quality? queried-thing
                            queried-quality)
  (log-debug (§ "Primary thing-has-quality? procedure has been "
                "called on ~a (for the ~a quality).")
             (thing-name queried-thing)
             queried-quality)
  (unless
      (use-thing-quality-procedure 'thing-has-quality?
                                   queried-thing
                                   queried-quality)
    (log-debug "Using default thing-has-quality? procedure for ~a."
               (thing-name queried-thing))
    (hash-has-key? (thing-qualities queried-thing)
                                  queried-quality)))

(define (thing-quality queried-thing queried-quality)
  (unless (use-thing-procedure 'thing-quality
                               queried-thing
                               queried-quality)
    (log-debug "Using default thing-quality procedure on ~a for ~a."
               (thing-name queried-thing)
               queried-quality)
    (cond
      [(thing-has-quality? queried-thing
                           queried-quality)
       (hash-ref (thing-qualities queried-thing)
                 queried-quality)]
      [else
       (raise-thing-quality-missing-error
        'thing-quality
        queried-thing
        queried-quality)])))

(define (add-qualities-to-thing! qualities-list changed-thing)
  (map (λ (qual)
         (add-quality-to-thing! qual changed-thing))
       qualities-list))

(define (add-qualities-to-things! qualities-list changed-things)
  (map (λ (changed-thing)
         (add-qualities-to-thing! qualities-list changed-thing))
       changed-things))

(define (thing-quality-head queried-thing
                            queried-quality)
  (car (thing-quality queried-thing queried-quality)))

(define (thing-quality-tail queried-thing
                            queried-quality)
  (cdr (thing-quality queried-thing queried-quality)))


(define (set-thing-quality! changed-thing
                            changed-quality
                            new-value
                            #:skip [skip #f]
                            #:force [force-set #f])
  (log-debug (§ "Primary set-thing-quality! procedure has been "
                "called on ~a (for the ~a quality).")
             (thing-name changed-thing)
             changed-quality)
  (when (or skip
            (not (use-thing-quality-procedure 'set-thing-quality!
                                              changed-thing
                                              changed-quality
                                              new-value)))
    (log-debug "Using default set-thing-quality! procedure for ~a."
               (thing-name changed-thing))
    (cond
      [(or force-set
           (thing-has-quality? changed-thing
                           changed-quality))
       (hash-set! (thing-qualities changed-thing)
                  changed-quality
                  new-value)]
      [else
       (raise-thing-quality-missing-error
        'set-thing-quality!
        changed-thing
        changed-quality)])))

(define (add-quality-to-thing! new-quality
                               changed-thing)
  (unless (use-thing-quality-procedure 'add-quality-to-thing!
                                       changed-thing
                                       new-quality)
    (set-thing-quality! changed-thing
                        new-quality
                        (void)
                        #:skip #t
                        #:force #t)))


(define (add-string-to-thing-quality! input-string
                                      changed-thing
                                      changed-quality)
  (unless (string? input-string)
    (raise-argument-error 'add-string-to-thing-quality!
                          "string?"
                          input-string))
  (unless (use-thing-quality-procedure 'add-string-to-thing-quality!
                                       changed-thing
                                       changed-quality
                                       input-string
                                       #:flip-syntax #t)
    (set-thing-quality! changed-thing
                        changed-quality
                        (string-join
                         (list (thing-quality changed-thing
                                              changed-quality)
                               input-string)))))

(define (element-in-thing-quality? queried-element
                                   queried-thing
                                   queried-quality)
  (unless (use-thing-quality-procedure 'element-in-thing-quality?
                                       queried-thing
                                        queried-quality
                                        queried-element
                                        #:flip-syntax #t)
    (unless (thing-has-quality? queried-thing queried-quality)
      (cond
        [(member (thing-quality queried-thing queried-quality)
                 queried-element)
         #t]
        [else #f]))))

(define (add-element-to-thing-quality! new-element
                                      changed-thing
                                      changed-quality)
  (unless (use-thing-quality-procedure 'add-element-to-thing-quality!
                                       changed-thing
                                       changed-quality
                                       new-element
                                       #:flip-syntax #t)
    (unless (list? (thing-quality changed-thing changed-quality))
      (raise-argument-error 'add-element-to-thing-quality!
                            "list?"
                            (thing-quality changed-thing
                                           changed-quality)))
    (set-thing-quality! changed-thing
                        changed-quality
                        (append (thing-quality changed-thing
                                               changed-quality)
                                (list new-element)))))

(define (add-elements-to-thing-quality! new-elements
                                       changed-thing
                                       changed-quality)
  (unless (list? new-elements)
    (raise-argument-error 'add-elements-to-thing-quality!
                          "list?" new-elements))
  (unless
      (use-thing-quality-procedure 'add-elements-to-thing-quality!
                                   changed-thing
                                   changed-quality
                                   new-elements)

    (map (λ (new-element)
           (add-element-to-thing-quality! new-element
                                          changed-thing
                                          changed-quality))
         new-elements)))

(define (remove-element-from-thing-quality! removed-element
                                            changed-thing
                                            changed-quality)
  (unless
      (use-thing-quality-procedure
       'remove-element-from-thing-quality!
       changed-thing
       changed-quality
       removed-element
       #:flip-syntax #t)
    (set-thing-quality! changed-thing
                        changed-quality
                        (remove removed-element
                                (thing-quality changed-thing
                                               changed-quality)))))

(define (add-keyvalue-to-thing-quality! new-keyvalue
                                        changed-thing
                                        changed-quality)
  (unless (use-thing-quality-procedure
           'add-keyvalue-to-thing-quality!
           changed-thing
           changed-quality
           new-keyvalue
           #:flip-syntax #f)
    (hash-set! (thing-quality changed-thing changed-quality)
               (car new-keyvalue) (cdr new-keyvalue))))

(define (add-keyvalues-to-thing-quality! new-keyvalues
                                         changed-thing
                                         changed-quality)
  (unless (list? new-keyvalues)
    (raise-argument-error 'add-keyvalues-to-thing-quality!
                          "list?"
                          new-keyvalues))
  (map (λ (new-keyvalue)
	 (add-keyvalue-to-thing-quality! new-keyvalue
                                         changed-thing
                                         changed-quality))
       new-keyvalues))

(define (remove-key-from-thing-quality! removed-key
                                        changed-thing
                                        changed-quality)
  (unless (use-thing-quality-procedure
           'remove-key-from-thing-quality!
           changed-thing
           changed-quality
           removed-key
           #:flip-syntax #f)
    (hash-remove! (thing-quality changed-thing
                                 changed-quality)
                  removed-key)))

(define (thing-quality-key queried-thing
                           queried-quality
                           queried-key)
  (unless (use-thing-quality-procedure
           'thing-quality-key
           queried-thing
           queried-quality
           queried-key)
    (hash-ref (thing-quality queried-thing
                             queried-quality)
              queried-key)))

(define (list-thing-names things)
  (unless (and (list? things)
               (andmap thing? things))
    (raise-argument-error 'list-thing-names
                          "listof thing?"
                          things))
  (oxfordize-list
   (map (λ (this-thing)
          (thing-name this-thing))
        things)))

(define (things-with-quality queried-things
                             queried-quality)
  (filter
   (λ (t)
     (thing-has-quality? t
                         queried-quality))
   queried-things))


(define (search-things-by-term searched-things
                               queried-term)
  (filter
   thing?
   (map
    (λ (queried-thing)
      (when (thing-matches-term? queried-thing
                                 queried-term)
        queried-thing))
    searched-things)))





(define (search-thing-quality-by-term searched-thing
                                      queried-quality
                                      queried-term)
  (unless (use-thing-quality-procedure
           'search-thing-quality-by-term
           searched-thing
           queried-quality
           queried-term)
    (define searched-thing-quality
      (thing-quality searched-thing queried-quality))
    (unless (and (list? searched-thing-quality)
                 (andmap thing? searched-thing-quality))
      (raise-thing-quality-type-error 'search-thing-quality-by-term
                                      searched-thing
                                      queried-quality
                                      "listof thing?"))
    (search-things-by-term searched-thing-quality
                           queried-term)))

(define (add-string-to-quality-of-things! new-string
                                          changed-quality
                                          changed-things)
  (map
   (λ (changed-thing)
     (add-string-to-thing-quality! new-string
                                   changed-thing
                                   changed-quality))
   changed-things))
(define (add-string-to-quality-of-things-with-quality!
         new-string
         target-quality
         filter-quality
         things-list)
  (add-string-to-quality-of-things!
   new-string
   target-quality
   (things-with-quality things-list filter-quality)))

(define (add-string-to-quality-of-things-with-quality-in-quality-of-thing!
         new-string
         target-quality
         filter-quality
         list-quality
         target-thing)
  (add-string-to-quality-of-things-with-quality!
   new-string
   target-quality
   filter-quality
   (thing-quality target-thing list-quality)))
