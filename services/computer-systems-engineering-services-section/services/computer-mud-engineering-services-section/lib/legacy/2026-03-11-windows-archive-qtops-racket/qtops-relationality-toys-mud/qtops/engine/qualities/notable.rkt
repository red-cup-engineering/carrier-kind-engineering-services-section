#lang racket

;; A notable thing shows up when you look at a room's contents.
;; Applying this quality means "this thing is worth mentioning."

(provide <>notable)

(define (<>notable t #:notable? [notable? #t])
  (t 'set-procedure! 'notable? (λ () notable?))
  (t 'set-procedure! 'set-notable!
     (λ (v) (t 'set-procedure! 'notable? (λ () v))))
  t)

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "notable defaults to true"
    (define t (<>notable (create-thing "torch")))
    (check-true (t 'notable?)))

  (test-case "notable can be set false"
    (define t (<>notable (create-thing "dust")))
    (t 'set-notable! #f)
    (check-false (t 'notable?)))

  (test-case "notable can start false"
    (define t (<>notable (create-thing "air") #:notable? #f))
    (check-false (t 'notable?)))

  (test-case "<>notable returns the thing for chaining"
    (define t (create-thing "coin"))
    (check-eq? (<>notable t) t)))
