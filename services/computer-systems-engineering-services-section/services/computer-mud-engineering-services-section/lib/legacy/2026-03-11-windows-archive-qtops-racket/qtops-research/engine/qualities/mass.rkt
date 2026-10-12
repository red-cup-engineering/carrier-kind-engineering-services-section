#lang racket

;; A massive thing has weight. Things with mass show up as objects
;; in a room. Mass cannot go below zero.

(provide <>massive)

(define (<>massive t #:mass [mass 0])
  (t 'set-procedure! 'mass (λ () mass))
  (t 'set-procedure! 'set-mass!
     (λ (m) (t 'set-procedure! 'mass (λ () (max 0 m)))))
  (t 'set-procedure! 'increment-mass!
     (λ ([delta 1]) (t 'set-mass! (+ (t 'mass) delta))))
  t)

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "defaults to zero"
    (define t (<>massive (create-thing "feather")))
    (check-equal? (t 'mass) 0))

  (test-case "initialize with mass"
    (define t (<>massive (create-thing "anvil") #:mass 50))
    (check-equal? (t 'mass) 50))

  (test-case "increment"
    (define t (<>massive (create-thing "sack") #:mass 3))
    (t 'increment-mass! 2)
    (check-equal? (t 'mass) 5))

  (test-case "cannot go negative"
    (define t (<>massive (create-thing "pebble") #:mass 1))
    (t 'set-mass! -5)
    (check-equal? (t 'mass) 0))

  (test-case "<>massive returns the thing"
    (define t (create-thing "dust"))
    (check-eq? (<>massive t) t)))
