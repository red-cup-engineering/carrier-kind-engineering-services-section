#lang racket

(require "../qtmud.rkt")

(provide make-look-mudsocket-command-for-thing
	 make-move-mudsocket-command-for-thing)

(define (make-look-mudsocket-command-for-thing commanding-thing)
  (λ (command-arguments)
    (cond [(hash-empty? command-arguments)
	   (cond [(thing-has-quality? commanding-thing 'parent-container)
		  (let ([commanding-thing-parent-container
			 (thing-quality commanding-thing 'parent-container)])
		    (add-string-to-thing-quality!
		     (format "[    ~a    ]~a~a"
			     (thing-name commanding-thing-parent-container)
			     (cond [(thing-has-quality? commanding-thing-parent-container
							'area-description)
				    (format "\n  ~a"
					    (thing-quality
					     commanding-thing-parent-container
					     'area-description))]
				   [else ""])
			     (cond [(thing-has-quality? commanding-thing-parent-container
							'area-exits)
				    (format "\n  Area exits: ~a"
					    (oxfordize-list
					     (hash-keys (thing-quality
							 commanding-thing-parent-container
							 'area-exits))))]
				   [else ""]))
		     commanding-thing 'mudsocket-output-buffer))]
		 [else
		  (add-string-to-thing-quality!
		   "You look around, but you aren't anyplace."
		   commanding-thing 'mudsocket-output-buffer)])]
	  [(hash-has-key? command-arguments "container")
	   (add-string-to-thing-quality!
	    "Looking inside things doesn't work yet, sorry."
	    commanding-thing 'mudsocket-output-buffer)]
	  [(hash-has-key? command-arguments 'line)
	   (add-string-to-thing-quality!
	    "Looking at things doesn't work yet, sorry."
	    commanding-thing 'mudsocket-output-buffer)])))

  (define (make-move-mudsocket-command-for-thing commanding-thing)
    (λ (command-arguments)
      (let* ([commanding-thing-parent-container (thing-quality commanding-thing
							       'parent-container)]
	     [commanding-thing-parent-container-area-exits
	      (thing-quality commanding-thing-parent-container 'area-exits)])
	(cond [(hash-has-key? command-arguments 'line)
	       (let ([command-argument-line (hash-ref command-arguments 'line)])
		 (cond [(hash-has-key? commanding-thing-parent-container-area-exits
				       command-argument-line)
			(let ([destination-area
			       (hash-ref commanding-thing-parent-container-area-exits
					 command-argument-line)])
			  (remove-element-from-thing-quality!
			   commanding-thing
			   commanding-thing-parent-container
			   'contents)
			  (add-element-to-thing-quality!
			   commanding-thing
			   destination-area
			   'contents)
			  (add-string-to-thing-quality!
			   (format "You move; your location is now ~a."
				   (thing-name destination-area))
			   commanding-thing 'mudsocket-output-buffer))]
		       [else
			(add-string-to-thing-quality!
			 (format "You failed to move: ~a is not a valid exit."
				 command-argument-line)
			 commanding-thing 'mudsocket-output-buffer)]))]
	      [else
	       (add-string-to-thing-quality!
		"You must use this command with an exit, try to \"look\" for one."
		commanding-thing 'mudsocket-output-buffer)]))))
