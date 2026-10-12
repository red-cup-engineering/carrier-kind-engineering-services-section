#lang racket

;; A sighted thing can look at other things.
;; look-thing! renders a target's name, description, exits, and
;; notable contents, then sends the result via message!.
;; Requires: message! (from client quality) on the viewer.

(provide <>sighted)

(define (<>sighted t)
  (t 'set-procedure! 'look-thing!
     (λ (target)
       (define lines '())
       (define (add! line) (set! lines (cons line lines)))

       (when (target 'has-procedure? 'name)
         (add! (format "[  ~a  ]" (target 'name))))

       (when (target 'has-procedure? 'description)
         (add! (target 'description)))

       (when (and (target 'has-procedure? 'exits)
                  (not (hash-empty? (target 'exits))))
         (add! (format "  Exits: ~a"
                       (string-join
                        (map symbol->string
                             (hash-keys (target 'exits)))
                        ", "))))

       (when (target 'has-procedure? 'contents)
         (define notable-things
           (filter (λ (c)
                     (and (c 'has-procedure? 'notable?)
                          (c 'notable?)))
                   (target 'contents)))
         (unless (null? notable-things)
           (add! (format "Contents: ~a"
                         (string-join
                          (map (λ (c)
                                 (if (eq? c t) "you" (c 'name)))
                               notable-things)
                          ", ")))))

       (if (null? lines)
           (t 'message! "You can't look at that.\n")
           (t 'message!
              (string-append
               (string-join (reverse lines) "\n")
               "\n")))))
  t)

(module+ test
  (require rackunit
           "../../engine/things.rkt"
           "client.rkt"
           "description.rkt"
           "exits.rkt"
           "notable.rkt")

  (test-case "look at a described thing"
    (define viewer (<>sighted (<>client (create-thing "player"))))
    (define rock (<>notable
                  (create-thing "rock")))
    (rock 'set-procedure! 'description (λ () "A grey rock."))
    (viewer 'look-thing! rock)
    (check-true (string-contains? (viewer 'output-buffer) "rock"))
    (check-true (string-contains? (viewer 'output-buffer) "A grey rock.")))

  (test-case "look renders exits"
    (define viewer (<>sighted (<>client (create-thing "player"))))
    (define room (create-thing "hall"))
    (room 'set-procedure! 'description (λ () "A long hall."))
    (room 'set-procedure! 'exits (λ () (hash 'north #t 'south #t)))
    (viewer 'look-thing! room)
    (check-true (string-contains? (viewer 'output-buffer) "Exits:")))

  (test-case "look renders notable contents, viewer sees self as 'you'"
    (define viewer (<>sighted (<>client (<>notable (create-thing "player")))))
    (define torch (<>notable (create-thing "torch")))
    (define room (create-thing "cave"))
    (room 'set-procedure! 'description (λ () "Dark."))
    (room 'set-procedure! 'contents (λ () (list viewer torch)))
    (viewer 'look-thing! room)
    (define buf (viewer 'output-buffer))
    (check-true (string-contains? buf "you"))
    (check-true (string-contains? buf "torch")))

  (test-case "look at bare thing — just shows name"
    (define viewer (<>sighted (<>client (create-thing "player"))))
    (define bare (create-thing "void"))
    (viewer 'look-thing! bare)
    (check-true (string-contains? (viewer 'output-buffer) "void")))

  (test-case "<>sighted returns the thing"
    (define t (create-thing "owl"))
    (check-eq? (<>sighted t) t)))
