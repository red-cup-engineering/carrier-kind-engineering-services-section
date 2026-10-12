#lang racket

(provide find-synonyms
         make-adjectives-list)

(define thesaurus
  (make-hash
   '(("large" ("big")))))

(define (find-synonyms word)
  (when (hash-has-key? thesaurus word)
    (append (list word)
            (hash-ref thesaurus word))))

(define (make-adjectives-list string-list)
  (flatten
   (map
    (λ (adjective)
      (cond
        [(string? adjective)
         adjective]
        [(symbol? adjective)
         (find-synonyms (symbol->string adjective))]
        [else
         (raise-argument-error 'make-adjectives-list
                               "listof string?"
                               string-list)]))
    string-list)))
