#lang racket

;; Containment: things holding other things.
;;
;; <>container — a thing that has contents (a room, a chest, a bag).
;;   Provides: contents, add/remove/search, fill-contents!,
;;   message-contents^! (broadcast to everything inside).
;;
;; <>contained — a thing that knows its container (a player, an object).
;;   Provides: container, set-container!, move-thing!! (relocate
;;   between containers, notifying occupants).

(require "fillable.rkt")

(provide <>container
         <>contained)

(define (<>container t)
  (<>fillable t)  ; ensure fill-quality! is available

  (unless (t 'has-procedure? 'contents)
    (t 'set-procedure! 'contents (λ () '()))
    (t 'set-procedure! 'set-contents!
       (λ (C) (t 'set-procedure! 'contents (λ () C))))
    (t 'set-procedure! 'add-content!
       (λ (c) (t 'set-contents! (append (t 'contents) (list c)))))
    (t 'set-procedure! 'remove-content!
       (λ (c) (t 'set-contents! (remove c (t 'contents)))))

    (t 'set-procedure! 'search-contents-by-term
       (λ (term)
         (filter (λ (c) (and (c 'has-procedure? 'term=?)
                             (c 'term=? term)))
                 (t 'contents))))

    (t 'set-procedure! 'message-contents^!
       (λ (msg)
         (for-each (λ (c)
                     (when (c 'has-procedure? 'message!)
                       (c 'message! msg)))
                   (t 'contents))))

    (t 'set-procedure! 'fill-contents!
       (λ (recipes)
         (define new-things
           (t 'fill-quality! recipes
              (λ (w)
                (<>contained w)
                (w 'set-container! t)
                (t 'add-content! w))))
         new-things)))
  t)

(define (<>contained t)
  (unless (t 'has-procedure? 'container)
    (t 'set-procedure! 'container (λ () #f))
    (t 'set-procedure! 'set-container!
       (λ (c) (t 'set-procedure! 'container (λ () c))))

    (t 'set-procedure! 'move-thing!!
       (λ (dest)
         ;; notify occupants of old location
         (when (t 'container)
           (let ([old (t 'container)])
             (old 'remove-content! t)
             (for-each
              (λ (occupant)
                (when (occupant 'has-procedure? 'message!)
                  (occupant 'message!
                            (format "~a leaves.\n" (t 'name)))))
              (old 'contents))))

         ;; notify occupants of new location
         (when (dest 'has-procedure? 'contents)
           (for-each
            (λ (occupant)
              (when (occupant 'has-procedure? 'message!)
                (occupant 'message!
                          (format "~a arrives.\n" (t 'name)))))
            (dest 'contents)))

         ;; do the move
         (dest 'add-content! t)
         (t 'set-container! dest)))

    (t 'set-procedure! 'message-container-contents^!
       (λ (msg)
         (when (t 'container)
           (for-each (λ (c)
                       (when (c 'has-procedure? 'message!)
                         (c 'message! msg)))
                     ((t 'container) 'contents))))))
  t)

(module+ test
  (require rackunit
           "../things.rkt"
           "client.rkt"
           "notable.rkt")

  (test-case "container starts empty"
    (define room (<>container (create-thing "room")))
    (check-equal? (room 'contents) '()))

  (test-case "add and remove content"
    (define room (<>container (create-thing "room")))
    (define rock (create-thing "rock"))
    (room 'add-content! rock)
    (check-equal? (length (room 'contents)) 1)
    (room 'remove-content! rock)
    (check-equal? (room 'contents) '()))

  (test-case "search-contents-by-term"
    (define room (<>container (create-thing "room")))
    (define sword (create-thing "sword"))
    (define shield (create-thing "shield"))
    (room 'add-content! sword)
    (room 'add-content! shield)
    (define found (room 'search-contents-by-term "sword"))
    (check-equal? (length found) 1)
    (check-equal? ((car found) 'name) "sword"))

  (test-case "message-contents^! broadcasts"
    (define room (<>container (create-thing "room")))
    (define p1 (<>client (create-thing "alice")))
    (define p2 (<>client (create-thing "bob")))
    (room 'add-content! p1)
    (room 'add-content! p2)
    (room 'message-contents^! "Rain falls.\n")
    (check-true (string-contains? (p1 'output-buffer) "Rain falls."))
    (check-true (string-contains? (p2 'output-buffer) "Rain falls.")))

  (test-case "contained thing knows its container"
    (define room (<>container (create-thing "cave")))
    (define gem (<>contained (create-thing "gem")))
    (gem 'set-container! room)
    (check-equal? ((gem 'container) 'name) "cave"))

  (test-case "move-thing!! updates both sides and notifies"
    (define room-a (<>container (create-thing "kitchen")))
    (define room-b (<>container (create-thing "garden")))
    (define player (<>contained (<>client (create-thing "player"))))
    (define bystander (<>client (create-thing "cat")))

    ;; place player in room-a, bystander in room-b
    (room-a 'add-content! player)
    (player 'set-container! room-a)
    (room-b 'add-content! bystander)

    ;; move player to room-b
    (player 'move-thing!! room-b)

    ;; player is now in room-b
    (check-equal? ((player 'container) 'name) "garden")
    (check-equal? (length (room-a 'contents)) 0)
    (check-not-false (member player (room-b 'contents)))

    ;; bystander was notified of arrival
    (check-true (string-contains? (bystander 'output-buffer) "arrives")))

  (test-case "fill-contents! creates things from recipes"
    (define room (<>container (create-thing "armory")))
    (room 'fill-contents!
          (list (λ (w) (w 'set-name! "spear"))
                (λ (w) (w 'set-name! "helm"))))
    (check-equal? (length (room 'contents)) 2)
    (define names (map (λ (c) (c 'name)) (room 'contents)))
    (check-not-false (member "spear" names))
    (check-not-false (member "helm" names))
    ;; each created thing knows its container
    (check-equal? ((car (room 'contents)) 'container) room))

  (test-case "<>container and <>contained return the thing"
    (define a (create-thing "box"))
    (define b (create-thing "coin"))
    (check-eq? (<>container a) a)
    (check-eq? (<>contained b) b)))
