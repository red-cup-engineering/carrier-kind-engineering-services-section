#lang racket

(require "../engine/main.rkt")

(provide add-description-to-thing!
         set-thing-description!
         add-description-procedures-to-thing!
         add-description-procedures-to-universe!)

(define (add-description-to-thing! changed-thing)
  (log-info "Adding the description quality to ~a"
            (thing-name changed-thing))
  (set-thing-quality! changed-thing
                      'description
                      ""
                      #:skip #t
                      #:force #t))

(define (set-thing-description! changed-thing
                                new-description)
  (unless (string? new-description)
    (raise-argument-error 'set-thing-description!
                          "string?"
                          new-description))
  (set-thing-quality! changed-thing
                      'description
                      new-description
                      #:skip #t))

(define (add-description-procedures-to-x! x)
  (define description-procedures
    (list
     (cons 'add-description-to-thing!
           add-description-to-thing!)
     (cons 'set-thing-description!
           set-thing-description!)))
  (log-debug "Adding description procedures to ~a."
             (cond [(universe? x)
                    (universe-name x)]
                   [(thing? x)
                    (thing-name x)]))
  (cond
    [(thing? x)
     (add-procedures-to-thing! description-procedures x)]
    [(universe? x)
     (add-procedures-to-universe! description-procedures x)]))

(define (add-description-procedures-to-thing! changed-thing)
  (add-description-procedures-to-x! changed-thing))

(define (add-description-procedures-to-universe! changed-universe)
  (add-description-procedures-to-x! changed-universe))
