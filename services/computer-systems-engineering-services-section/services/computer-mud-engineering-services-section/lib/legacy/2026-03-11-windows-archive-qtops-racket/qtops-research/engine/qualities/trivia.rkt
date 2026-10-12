#lang racket

;; Trivia is a list of facts about a thing — lore, flavor, background.
;; Unlike description (singular text), trivia accumulates: each quality
;; or region can add its own trivia without replacing what's already there.

(provide <>trivial)

(define (<>trivial t #:trivia [trivia #f])
  (unless (t 'has-procedure? 'trivia)
    (t 'set-procedure! 'trivia (λ () '()))
    (t 'set-procedure! 'set-trivia!
       (λ (facts) (t 'set-procedure! 'trivia (λ () facts))))
    (t 'set-procedure! 'add-trivia!
       (λ (facts) (t 'set-trivia! (append (t 'trivia) facts))))
    (t 'set-procedure! 'add-trivium!
       (λ (fact) (t 'add-trivia! (list fact))))
    (t 'set-procedure! 'remove-trivium!
       (λ (fact) (t 'set-trivia! (remove fact (t 'trivia))))))
  (when trivia (t 'add-trivia! trivia))
  t)

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "starts empty"
    (define t (<>trivial (create-thing "stone")))
    (check-equal? (t 'trivia) '()))

  (test-case "initialize with trivia"
    (define t (<>trivial (create-thing "sword")
                         #:trivia '("Forged in Ack." "Chipped blade.")))
    (check-equal? (t 'trivia) '("Forged in Ack." "Chipped blade.")))

  (test-case "trivia accumulates"
    (define t (<>trivial (create-thing "well") #:trivia '("Deep.")))
    (t 'add-trivium! "Cold water.")
    (check-equal? (t 'trivia) '("Deep." "Cold water.")))

  (test-case "applying twice accumulates, doesn't reset"
    (define t (<>trivial (create-thing "bridge") #:trivia '("Old.")))
    (<>trivial t #:trivia '("Stone."))
    (check-equal? (t 'trivia) '("Old." "Stone.")))

  (test-case "remove a trivium"
    (define t (<>trivial (create-thing "map") #:trivia '("Torn." "Faded.")))
    (t 'remove-trivium! "Torn.")
    (check-equal? (t 'trivia) '("Faded.")))

  (test-case "<>trivial returns the thing"
    (define t (create-thing "leaf"))
    (check-eq? (<>trivial t) t)))
