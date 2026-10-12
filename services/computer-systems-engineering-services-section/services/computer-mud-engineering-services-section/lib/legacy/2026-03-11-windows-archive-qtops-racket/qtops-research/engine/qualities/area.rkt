#lang racket

;; An area is a place — a room, a street, a clearing.
;; It composes: described + container + exitable.
;; Areas can have contents (objects, NPCs) and exits (other areas).

(require "description.rkt"
         "contents.rkt"
         "exits.rkt")

(provide <>area)

(define (<>area t
                #:name [name #f]
                #:description [description #f]
                #:contents [contents #f]
                #:exits [exits #f])
  (when name (t 'set-name! name))
  (<>described t
               #:description (or description
                                 (format "This is ~a." (t 'name))))
  (<>container t)
  (<>exitable t)
  (when contents (t 'fill-contents! contents))
  (when exits (t 'set-exits! exits))
  t)

(module+ test
  (require rackunit
           "../things.rkt"
           "client.rkt"
           "sight.rkt"
           "notable.rkt")

  (test-case "area has description, contents, exits"
    (define room (<>area (create-thing "inn")
                         #:name "Crossed Candles Inn"
                         #:description "A warm tavern."))
    (check-equal? (room 'name) "Crossed Candles Inn")
    (check-equal? (room 'description) "A warm tavern.")
    (check-equal? (room 'contents) '())
    (check-true (hash? (room 'exits))))

  (test-case "area auto-generates description from name"
    (define room (<>area (create-thing "thing") #:name "Dark Cave"))
    (check-equal? (room 'description) "This is Dark Cave."))

  (test-case "area with exits between rooms"
    (define kitchen (<>area (create-thing "thing") #:name "Kitchen"))
    (define garden (<>area (create-thing "thing") #:name "Garden"))
    (kitchen 'set-exit! 'east garden)
    (garden 'set-exit! 'west kitchen)
    (check-equal? ((kitchen 'exit 'east) 'name) "Garden")
    (check-equal? ((garden 'exit 'west) 'name) "Kitchen"))

  (test-case "area with fill-contents! recipes"
    (define room
      (<>area (create-thing "thing")
              #:name "Armory"
              #:contents (list (λ (w) (w 'set-name! "shield")
                                      (<>notable w)))))
    (check-equal? (length (room 'contents)) 1)
    (check-equal? ((car (room 'contents)) 'name) "shield"))

  (test-case "player can look at an area"
    (define room (<>area (create-thing "thing")
                         #:name "Town Square"
                         #:description "Cobblestones underfoot."))
    (define torch (<>notable (create-thing "torch")))
    (room 'add-content! torch)
    (define player (<>sighted (<>client (create-thing "player"))))
    (player 'look-thing! room)
    (define buf (player 'output-buffer))
    (check-true (string-contains? buf "Town Square"))
    (check-true (string-contains? buf "Cobblestones"))
    (check-true (string-contains? buf "torch")))

  (test-case "<>area returns the thing"
    (define t (create-thing "space"))
    (check-eq? (<>area t) t)))
