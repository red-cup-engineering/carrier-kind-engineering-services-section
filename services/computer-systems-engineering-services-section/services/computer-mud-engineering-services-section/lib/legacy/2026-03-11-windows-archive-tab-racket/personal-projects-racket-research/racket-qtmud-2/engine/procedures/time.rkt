#lang racket

(require "../structs/mud.rkt"
         "universe.rkt")

(provide tick-universe
         run-universe)

(define (tick-universe ticked-universe)
  (unless (universe? ticked-universe)
    (raise-argument-error 'tick-universe
                          "universe?"
                          ticked-universe))
  (increment-universe-time! ticked-universe)
  (define current-events
    (first (universe-schedule ticked-universe)))
  (set-universe-schedule!
   ticked-universe
   (cond
     [(pair? (cdr (universe-schedule ticked-universe)))
      (cdr (universe-schedule ticked-universe))]
     [else (list (list))]))
  (let loop ()
    (unless (null? current-events)
      (define current-event (car current-events))
      (set! current-events (cdr current-events))
      (let ([event-result (current-event ticked-universe)])
        (when (universe? event-result)
          (set! ticked-universe event-result)))
      (loop)))
  ticked-universe)

(define (run-universe running-universe [tick-rate 0.2])
  (thread
   (λ () (let loop ()
	   (set! running-universe (tick-universe running-universe))
	   (sleep tick-rate)
	   (loop)))))
