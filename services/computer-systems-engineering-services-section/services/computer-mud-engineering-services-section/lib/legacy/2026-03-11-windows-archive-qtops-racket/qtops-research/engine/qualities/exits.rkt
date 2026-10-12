#lang racket

;; An exitable thing has directional exits leading to other things
;; (typically rooms). Exits are stored as a hash of symbol -> thing.

(provide <>exitable)

(define (<>exitable t)
  (define exit-table (make-hash))
  (t 'set-procedure! 'exits (λ () exit-table))
  (t 'set-procedure! 'has-exit? (λ (k) (hash-has-key? exit-table k)))
  (t 'set-procedure! 'exit (λ (k) (hash-ref exit-table k)))
  (t 'set-procedure! 'set-exit!
     (λ (k dest)
       (hash-set! exit-table
                  (if (string? k) (string->symbol k) k)
                  dest)))
  (t 'set-procedure! 'set-exits!
     (λ (pairs)
       (for-each
        (λ (e) (t 'set-exit! (car e) (cdr e)))
        pairs)))
  t)

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "starts with no exits"
    (define t (<>exitable (create-thing "room")))
    (check-equal? (hash-count (t 'exits)) 0))

  (test-case "set and traverse an exit"
    (define room-a (<>exitable (create-thing "kitchen")))
    (define room-b (<>exitable (create-thing "hallway")))
    (room-a 'set-exit! 'north room-b)
    (check-true (room-a 'has-exit? 'north))
    (check-equal? ((room-a 'exit 'north) 'name) "hallway"))

  (test-case "set-exits! batch"
    (define r (<>exitable (create-thing "crossroads")))
    (define n (create-thing "north-room"))
    (define s (create-thing "south-room"))
    (r 'set-exits! (list (cons 'north n) (cons 'south s)))
    (check-true (r 'has-exit? 'north))
    (check-true (r 'has-exit? 'south)))

  (test-case "string keys become symbols"
    (define r (<>exitable (create-thing "gate")))
    (r 'set-exit! "east" (create-thing "garden"))
    (check-true (r 'has-exit? 'east)))

  (test-case "<>exitable returns the thing"
    (define t (create-thing "cell"))
    (check-eq? (<>exitable t) t)))
