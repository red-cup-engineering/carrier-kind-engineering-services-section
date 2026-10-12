#lang racket

(require "../qtmud.rkt")

(provide add-animation-procedures-to-universe!)

(define (add-animation-procedures-to-universe! target-universe)
  (set-universe-procedure!
   target-universe
   'add-element-to-thing-contents!
   (λ (new-element changed-thing)
     (log-warning "BIIIIIINGLE"))))
