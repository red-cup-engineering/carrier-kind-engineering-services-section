#lang racket


(require racket/serialize
         racket/string
         uuid)

(provide
 §
 deserialize-file
 symbols->strings
 oxfordize-list
 symbol-replace
 join-strings-and-symbols-as-symbol
 generate-simple-id
 build-procedures-list
 random-element)


(define (random-element given-list)
  (list-ref given-list (random (length given-list))))


(define (build-procedures-list . procedures-list)
  (map (λ (p)
         (cons p (eval p)))
       procedures-list))

(define (§ . s)
  (unless (andmap string? s)
    (raise-argument-error '§ "string?" s))
  (string-join s ""))


(define (deserialize-file serialized-file)
              (with-input-from-file serialized-file
                (λ () (deserialize (read)))))


(define (symbols->strings mixed-list)
              (map (λ (element)
                     (cond [(symbol? element)
                            (symbol->string element)]
                           [else element]))
                   mixed-list))


(define (oxfordize-list string-list)
	      (cond [(null? string-list)
		     (raise-argument-error 'oxfordize-list
					   "listof string?"
					   string-list)]
		    [(null? (cdr string-list))
		     (car string-list)]
		    [(null? (cddr string-list))
		     (string-join string-list " and ")]
		    [else
		     (string-join string-list ", "
				  #:before-first ""
				  #:before-last ", and ")]))


(define (join-strings-and-symbols-as-symbol unjoined-list
					   [string-separator ""])
	 (string->symbol
	  (string-join
	   (symbols->strings unjoined-list)
	   string-separator)))

(define (symbol-replace changed-symbol start-symbol end-symbol)
  (string->symbol
   (string-replace (symbol->string changed-symbol)
		   (symbol->string start-symbol)
		   (symbol->string end-symbol))))



(define (generate-simple-id [id-length 8])
  (substring (uuid-string) 0 id-length))

(module+ test
  (require rackunit)
  (define qtmud-utilities-tests
    (test-suite
     "Tests for qtMUD's utility procedures."
     (test-case
         "§'s return matches string-join"
       (check-equal? (§ "foo" "bar")
                     (string-join '("foo" "bar") "")))
     (test-case
         "§ errors if given something beside strings."
       (check-exn exn:fail:contract?
                  (λ () (§ 1 2)))))))
