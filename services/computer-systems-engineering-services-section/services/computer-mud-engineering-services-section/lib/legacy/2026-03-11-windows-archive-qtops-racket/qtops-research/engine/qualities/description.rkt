#lang racket

;; A described thing has a textual description.
;; The description can be a string or a procedure returning a string
;; (for dynamic descriptions that change based on state).

(provide <>described)

(define (<>described t #:description [description #f])
  (unless (t 'has-procedure? 'description)
    (t 'set-procedure! 'description (λ () "This is a thing."))
    (t 'set-procedure! 'set-description!
       (λ (d)
         (t 'set-procedure! 'description
            (if (string? d) (λ () d) d)))))
  (when description (t 'set-description! description))
  t)

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "default description"
    (define t (<>described (create-thing "rock")))
    (check-equal? (t 'description) "This is a thing."))

  (test-case "string description"
    (define t (<>described (create-thing "gem") #:description "a glinting ruby"))
    (check-equal? (t 'description) "a glinting ruby"))

  (test-case "procedure description"
    (define count 0)
    (define t (<>described (create-thing "clock")
                           #:description (λ () (format "tick #~a" count))))
    (check-equal? (t 'description) "tick #0")
    (set! count 3)
    (check-equal? (t 'description) "tick #3"))

  (test-case "idempotent — applying twice doesn't reset"
    (define t (<>described (create-thing "lamp") #:description "a brass lamp"))
    (<>described t)
    (check-equal? (t 'description) "a brass lamp"))

  (test-case "<>described returns the thing"
    (define t (create-thing "hat"))
    (check-eq? (<>described t) t)))
