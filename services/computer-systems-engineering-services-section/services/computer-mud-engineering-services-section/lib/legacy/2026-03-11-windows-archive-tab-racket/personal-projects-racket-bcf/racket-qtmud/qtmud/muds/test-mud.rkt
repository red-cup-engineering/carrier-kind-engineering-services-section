#lang racket

(require "../qtmud.rkt"
	 "../components/mudsocket.rkt")

(define test-universe (create-universe "Testverse"))

(run-universe-logger (make-universe-logger test-universe 'debug))

(add-event-to-universe-schedule!
 (make-mudsocket-tick-event-for-universe test-universe)
 test-universe)

(define test-mud (run-universe test-universe 2))
