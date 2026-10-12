#lang racket

;; A noun quality gives a thing grammatical identity: nouns ("sword",
;; "blade") and adjectives ("rusty", "old"). This enables semiotic
;; matching — finding things by natural-language fragments like
;; "rusty sword".
;;
;; Matching rules for term=?:
;;   Single word  → matches any noun (case-insensitive)
;;   Multi-word   → last word must match a noun, AND at least one
;;                   preceding word must match an adjective
;;   Falls through to name=? from things.rkt if nouns don't match

(provide <>noun)

(define (<>noun t #:nouns [nouns #f] #:adjectives [adjectives #f])
  (unless (t 'has-procedure? 'nouns)
    (t 'set-procedure! 'nouns (λ () '()))
    (t 'set-procedure! 'set-nouns!
       (λ (N) (t 'set-procedure! 'nouns (λ () N))))
    (t 'set-procedure! 'add-nouns!
       (λ (N) (t 'set-nouns! (append (t 'nouns) N))))
    (t 'set-procedure! 'add-noun!
       (λ (n) (t 'add-nouns! (list n))))

    (t 'set-procedure! 'adjectives (λ () '()))
    (t 'set-procedure! 'set-adjectives!
       (λ (A) (t 'set-procedure! 'adjectives (λ () A))))
    (t 'set-procedure! 'add-adjectives!
       (λ (A) (t 'set-adjectives! (append (t 'adjectives) A))))
    (t 'set-procedure! 'add-adjective!
       (λ (a) (t 'add-adjectives! (list a))))

    (t 'set-procedure! 'noun=?
       (λ (l)
         (define w (last (string-split l)))
         (ormap (λ (n) (string-ci=? n w))
                (t 'nouns))))

    (t 'set-procedure! 'adjective=?
       (λ (l)
         (define words (string-split l))
         (if (<= (length words) 1)
             #t  ; no adjectives to check — vacuously true
             (let ([adj-words (drop-right words 1)])
               (ormap (λ (a)
                        (ormap (λ (w) (string-ci=? a w))
                               adj-words))
                      (t 'adjectives))))))

    ;; Replace term=? with a version that checks nouns+adjectives,
    ;; falling through to name matching if nouns don't hit.
    (let ([old-term=? (t 'procedure 'term=?)])
      (t 'set-procedure! 'term=?
         (λ (l)
           (define words (string-split l))
           (cond
             ;; single word: check noun, fall through to name
             [(= (length words) 1)
              (or (t 'noun=? l) (old-term=? l))]
             ;; multi-word: must match both noun AND adjective
             [else
              (or (and (t 'noun=? l) (t 'adjective=? l))
                  (old-term=? l))])))))

  (when nouns (t 'set-nouns! nouns))
  (when adjectives (t 'set-adjectives! adjectives))
  t)

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "noun matching — single word"
    (define t (<>noun (create-thing "Rusty Sword")
                      #:nouns '("sword" "blade")))
    (check-true (t 'noun=? "sword"))
    (check-true (t 'noun=? "blade"))
    (check-false (t 'noun=? "shield")))

  (test-case "adjective matching"
    (define t (<>noun (create-thing "thing")
                      #:adjectives '("rusty" "old")))
    (check-true (t 'adjective=? "rusty sword"))
    (check-true (t 'adjective=? "old blade"))
    (check-false (t 'adjective=? "shiny sword")))

  (test-case "term=? single word — noun or name"
    (define t (<>noun (create-thing "Rusty Sword")
                      #:nouns '("sword" "blade")))
    ;; matches noun
    (check-true (t 'term=? "sword"))
    ;; falls through to name
    (check-true (t 'term=? "rusty sword")))

  (test-case "term=? multi-word — needs both noun and adjective"
    (define t (<>noun (create-thing "thing")
                      #:nouns '("sword")
                      #:adjectives '("rusty")))
    (check-true (t 'term=? "rusty sword"))
    (check-false (t 'term=? "shiny sword")))

  (test-case "term=? still falls through to name"
    (define t (<>noun (create-thing "Old Bridge")
                      #:nouns '("bridge")))
    ;; by name
    (check-true (t 'term=? "old bridge"))
    ;; by noun
    (check-true (t 'term=? "bridge")))

  (test-case "case insensitive"
    (define t (<>noun (create-thing "thing")
                      #:nouns '("Sword")
                      #:adjectives '("Rusty")))
    (check-true (t 'term=? "sword"))
    (check-true (t 'term=? "rusty sword")))

  (test-case "idempotent"
    (define t (<>noun (create-thing "thing") #:nouns '("gem")))
    (<>noun t #:nouns '("jewel"))
    ;; replaces, doesn't double-install
    (check-true (t 'noun=? "jewel")))

  (test-case "<>noun returns the thing"
    (define t (create-thing "peg"))
    (check-eq? (<>noun t) t)))
