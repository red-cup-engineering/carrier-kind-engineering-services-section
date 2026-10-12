#lang racket

(define (make-who-mudsocket-command-for-thing
	 commanding-thing)
  (λ (args)
    (add-string-to-thing-quality!
     (format
      "There are ~a users currently connected; a specific list is unavailable."
      (length ((universe-procedure (thing-universe commanding-thing)
				   'list-mudsocket-current-connections))))
     commanding-thing 'mudsocket-output-buffer)))
