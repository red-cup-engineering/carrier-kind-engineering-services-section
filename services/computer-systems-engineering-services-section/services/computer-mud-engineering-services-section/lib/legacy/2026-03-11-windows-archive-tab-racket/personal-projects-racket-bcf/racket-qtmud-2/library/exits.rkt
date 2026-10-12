#lang racket

(require "../engine/main.rkt")

(provide add-exits-to-thing!
         set-thing-exits!
         add-exit-procedures-to-thing!
         add-exit-procedures-to-universe!)

(define (add-exits-to-thing! changed-thing)
  (log-info "Adding the exits quality to ~a."
            (thing-name changed-thing))
  (set-thing-quality! changed-thing
                      'exits
                      (make-hash)
                      #:skip #t
                      #:force #t))

(define (set-thing-exits! changed-thing new-exits)
  (unless (and (list? new-exits)
               (λ ()
                 (define proper-exits #t)
                 (map
                  (λ (e)
                    (unless (and (symbol? (car e))
                                 (thing? (cdr e)))
                      (set! proper-exits #t)))
                  new-exits)
                 proper-exits))
    (raise-argument-error 'set-thing-exits!
                          "listof (symbol? . thing?)"
                          new-exits))
  (set-thing-quality! changed-thing
                      'exits
                      (make-hash
                       new-exits)
                      #:skip #t))

(define (add-keyvalue-to-thing-exits! changed-thing
                                      new-exit)
  (unless (or (symbol? (car new-exit))
              (thing? (cdr new-exit)))
    (raise-argument-error 'add-keyvalue-to-thing-exits!
                          "(symbol? . thing?)"
                          new-exit))
  (hash-set! (thing-quality changed-thing 'exits)
             (car new-exit)
             (cdr new-exit)))

(define (add-exit-procedures-to-x! x)
  (define exit-procedures
    (list
     (cons 'add-exits-to-thing!
           add-exits-to-thing!)
     (cons 'set-thing-exits!
           set-thing-exits!)
     (cons 'add-keyvalue-to-thing-exits!
           add-keyvalue-to-thing-exits!)))
    (log-debug "Adding exit procedures to ~a."
             (cond [(universe? x)
                    (universe-name x)]
                   [(thing? x)
                    (thing-name x)]))
  (cond
    [(thing? x)
     (add-procedures-to-thing! exit-procedures x)]
    [(universe? x)
     (add-procedures-to-universe! exit-procedures x)]))

(define (add-exit-procedures-to-thing! changed-thing)
  (add-exit-procedures-to-x! changed-thing))

(define (add-exit-procedures-to-universe! changed-universe)
  (add-exit-procedures-to-x! changed-universe))


(define (hack-test)
  (define hackverse (create-universe))
  (define create-thing
    (create-thing-creator-for-universe hackverse))
  (add-exit-procedures-to-universe! hackverse)
  (define park (create-thing "park"))
  (add-quality-to-thing! 'exits park)
  (thing-quality park 'exits)
  (define downtown (create-thing "downtown"))
  (set-thing-quality! park 'exits
                      `((downtown . ,downtown)))
  (thing-quality-key park 'exits 'downtown))
