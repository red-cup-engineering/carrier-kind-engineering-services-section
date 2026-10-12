#lang racket

;; Fillable gives a thing the ability to materialize a list of recipes
;; into actual things. A recipe is a procedure that takes a make
;; function and configures the thing it creates.
;;
;; Used by contents (fill rooms with objects), universe (fill world
;; with things), and region (fill regions with areas).

(require "../things.rkt")

(provide <>fillable)

(define (<>fillable t)
  (unless (t 'has-procedure? 'fill-quality!)
    (t 'set-procedure! 'fill-quality!
       (λ (recipes [post-hook #f])
         (for/list ([recipe (in-list recipes)])
           (define w (create-thing))
           (recipe w)
           (when post-hook (post-hook w))
           w))))
  t)

(module+ test
  (require rackunit "../things.rkt")

  (test-case "fill-quality! creates things from recipes"
    (define t (<>fillable (create-thing "factory")))
    (define results
      (t 'fill-quality!
         (list (λ (w) (w 'set-name! "nail"))
               (λ (w) (w 'set-name! "bolt")))))
    (check-equal? (length results) 2)
    (check-equal? ((car results) 'name) "nail")
    (check-equal? ((cadr results) 'name) "bolt"))

  (test-case "fill-quality! with post-hook"
    (define t (<>fillable (create-thing "forge")))
    (define tagged '())
    (define results
      (t 'fill-quality!
         (list (λ (w) (w 'set-name! "sword")))
         (λ (w) (set! tagged (cons (w 'name) tagged)))))
    (check-equal? tagged '("sword")))

  (test-case "idempotent"
    (define t (<>fillable (create-thing "shop")))
    (<>fillable t)
    ;; still works, wasn't reset
    (check-true (t 'has-procedure? 'fill-quality!)))

  (test-case "<>fillable returns the thing"
    (define t (create-thing "bench"))
    (check-eq? (<>fillable t) t)))
