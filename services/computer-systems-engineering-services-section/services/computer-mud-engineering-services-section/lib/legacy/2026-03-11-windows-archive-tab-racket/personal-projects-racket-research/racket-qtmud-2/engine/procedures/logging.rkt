#lang racket

(provide create-logger
         run-logger)



(define (create-logger [name 'qtMUD] [loglevel 'info])
  (define qtmud-log (make-logger 'qtMUD))
  (define qtmud-log-receiver (make-log-receiver qtmud-log
                                                loglevel))
  (cons qtmud-log qtmud-log-receiver))


(define (run-logger qtmud-logger)
  (let ([qtmud-log (car qtmud-logger)]
	[qtmud-log-receiver (cdr qtmud-logger)])
    (current-logger qtmud-log)
    (thread
     (λ ()
       (let log-loop ()
         (define log-vector (sync qtmud-log-receiver))
         (let ([log-level (vector-ref log-vector 0)]
               [log-string (vector-ref log-vector 1)])
           (display (format "~a\n"
                            log-string)))
         (log-loop))))))
