#lang racket

;; A client thing has an output buffer for accumulating messages.
;; message! is the universal way to send text to a thing — the
;; mudsocket layer will later drain the buffer over the network.

(provide <>client)

(define (<>client t)
  (t 'set-procedure! 'output-buffer (λ () ""))
  (t 'set-procedure! 'set-output-buffer!
     (λ (b) (t 'set-procedure! 'output-buffer (λ () b))))
  (t 'set-procedure! 'append-output-buffer!
     (λ (a) (t 'set-output-buffer!
               (string-append (t 'output-buffer) a))))
  (t 'set-procedure! 'clear-output-buffer!
     (λ () (t 'set-output-buffer! "")))
  (t 'set-procedure! 'message!
     (λ (m) (t 'append-output-buffer! m)))
  t)

(module+ test
  (require rackunit "../../engine/things.rkt")

  (test-case "starts with empty buffer"
    (define t (<>client (create-thing "player")))
    (check-equal? (t 'output-buffer) ""))

  (test-case "message! accumulates"
    (define t (<>client (create-thing "player")))
    (t 'message! "Hello. ")
    (t 'message! "World.")
    (check-equal? (t 'output-buffer) "Hello. World."))

  (test-case "clear empties the buffer"
    (define t (<>client (create-thing "player")))
    (t 'message! "stuff")
    (t 'clear-output-buffer!)
    (check-equal? (t 'output-buffer) ""))

  (test-case "<>client returns the thing"
    (define t (create-thing "user"))
    (check-eq? (<>client t) t)))
