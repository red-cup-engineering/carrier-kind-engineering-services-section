#lang racket

(require "things.rkt")

(provide (all-from-out "things.rkt"))

(module+ test
  (require rackunit)

  (test-case "create a thing, give it a quality, talk to it"
    (define t (create-thing "pebble"))
    (check-equal? (t 'name) "pebble")

    ;; give it a description procedure
    (t 'set-procedure! 'description (λ () "a small grey pebble"))
    (check-equal? (t 'description) "a small grey pebble")
    (check-true (t 'has-procedure? 'description))

    ;; term matching works via name
    (check-true (t 'term=? "pebble")))

  (test-case "things are procedures, identity is relational"
    (define t (create-thing "spark"))
    ;; a thing IS a procedure
    (check-pred procedure? t)
    ;; identity is what it responds to, not what it "is"
    (check-true (t 'has-procedure? 'name))
    (check-false (t 'has-procedure? 'location)))

  (test-case "rename a thing — identity shifts"
    (define t (create-thing "seed"))
    (check-equal? (t 'name) "seed")
    (t 'set-name! "sprout")
    (check-equal? (t 'name) "sprout")
    (check-true (t 'term=? "sprout")))

  (test-case "remove a procedure — thing loses that capacity"
    (define t (create-thing "candle"))
    (t 'set-procedure! 'lit? (λ () #t))
    (check-true (t 'lit?))
    (t 'remove-procedure! 'lit?)
    (check-false (t 'has-procedure? 'lit?)))

  (test-case "with-procedure~~ — safe dispatch with fallback"
    (define t (create-thing "stone"))
    (define maybe-glow (t 'with-procedure~~ 'glow))
    ;; stone has no glow procedure — fallback to default
    (check-equal? (maybe-glow #:alternate "dim") "dim")
    ;; give it glow, now it dispatches
    (t 'set-procedure! 'glow (λ () "bright"))
    (check-equal? (maybe-glow) "bright"))

  (test-case "set-procedures! — batch composition"
    (define t (create-thing "box"))
    (t 'set-procedures!
       (list (cons 'weight (λ () 5))
             (cons 'color (λ () "brown"))))
    (check-equal? (t 'weight) 5)
    (check-equal? (t 'color) "brown"))

  (test-case "prerender-string — template with live references"
    (define t (create-thing "river"))
    (t 'set-procedure! 'adjective (λ () "winding"))
    (define render (t 'prerender-string '("The " adjective " " name ".")))
    (check-equal? (render) "The winding river."))

  (test-case "things can reference each other"
    (define room (create-thing "clearing"))
    (define rock (create-thing "mossy rock"))
    ;; rock knows where it is
    (rock 'set-procedure! 'location (λ () room))
    ;; room knows what it contains
    (room 'set-procedure! 'contents (λ () (list rock)))
    ;; verify the relationship holds both ways
    (check-equal? ((rock 'location) 'name) "clearing")
    (check-equal? ((car (room 'contents)) 'name) "mossy rock"))

  (test-case "term=? composes with name=?"
    (define t (create-thing "Tall Oak"))
    ;; case-insensitive name match
    (check-true (t 'term=? "tall oak"))
    ;; exact match
    (check-true (t 'term=? "Tall Oak"))))
