#lang racket

;; A lookable thing has a name, description, nouns, and adjectives.
;; This is pure composition: <>described + <>noun applied together
;; as a convenience for things that need to be seen and referred to.

(require "description.rkt"
         "noun.rkt")

(provide <>lookable)

(define (<>lookable t
                    #:name [name #f]
                    #:description [description #f]
                    #:nouns [nouns #f]
                    #:adjectives [adjectives #f])
  (when name (t 'set-name! name))
  (<>described
   (<>noun t #:nouns nouns #:adjectives adjectives)
   #:description description))

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "lookable composes description and noun"
    (define t (<>lookable (create-thing "Rusty Lantern")
                          #:description "A dented lantern, still warm."
                          #:nouns '("lantern" "lamp")
                          #:adjectives '("rusty" "dented")))
    (check-equal? (t 'description) "A dented lantern, still warm.")
    (check-true (t 'noun=? "lantern"))
    (check-true (t 'adjective=? "rusty lantern"))
    (check-true (t 'term=? "rusty lamp")))

  (test-case "lookable can rename"
    (define t (<>lookable (create-thing "placeholder")
                          #:name "Iron Gate"))
    (check-equal? (t 'name) "Iron Gate"))

  (test-case "lookable returns the thing"
    (define t (create-thing "peg"))
    (check-eq? (<>lookable t) t)))
