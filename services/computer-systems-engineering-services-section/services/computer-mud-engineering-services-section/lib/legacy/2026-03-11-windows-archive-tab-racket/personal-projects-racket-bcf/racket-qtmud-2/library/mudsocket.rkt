#lang racket

(require "../engine/main.rkt")

(provide make-mudsocket-tick-event-for-universe)


(define (make-commands-mudsocket-command-for-thing commanding-thing)
  (λ (args)
    (add-string-to-thing-quality!
     (format
      "You have access to the following commands: ~a"
      (oxfordize-list
       (hash-keys (thing-quality commanding-thing
                                 'mudsocket-commands))))
     commanding-thing 'mudsocket-output-buffer)))

(define (make-help-mudsocket-command-for-thing commanding-thing)
  (λ (command-arguments)
    (define commanding-thing-universe
      (thing-universe commanding-thing))
    (add-string-to-thing-quality!
     (cond
       [(universe-has-procedure? commanding-thing-universe
                                 'make-mudsocket-help-response)
        ((universe-procedure commanding-thing-universe
                             'make-mudsocket-help-response)
         commanding-thing)]
       [else
        (format
         (§ "You're conncted to a qtMUD server named ~a.\n"
            "To interact, typ commands and press ENTER. A few "
            "useful commands:\n- commands: shows you all the "
            "commands you can use.\n- help: shows helpful "
            "information.\n- quit: disconnects you from the MUD.")
         (universe-name commanding-thing-universe))])
     commanding-thing 'mudsocket-output-buffer)))

(define (make-quit-mudsocket-command-for-thing commanding-thing)
  (λ (args)
    (add-string-to-thing-quality!
     (§ "You quit: you are leaving the dimension and your "
        "connection will be closed.")
     commanding-thing 'mudsocket-output-buffer)
    ((thing-quality commanding-thing 'mudsocket-sender))
    ((universe-procedure (thing-universe commanding-thing)
                         'quit-mudsocket-connection)
     commanding-thing)))

(define (make-mudsocket-commands-for-thing target-thing)
  (list
   (cons "commands" (make-commands-mudsocket-command-for-thing
                     target-thing))
   (cons "help" (make-help-mudsocket-command-for-thing
                 target-thing))
   (cons "quit" (make-quit-mudsocket-command-for-thing
                 target-thing))))

(define (make-mudsocket-parser-for-thing parsing-thing)
  (define (parse-args args)
    (let ([results (make-hash)])
      (map
       (λ (arg)
	 (cond [(and (> (string-length arg) 2)
		     (string=? (substring arg 0 2) "--"))
		(let* ([split-arg (string-split arg "=")]
		       [arg-key (substring (car split-arg) 2)]
			   [arg-value (cdr split-arg)])
		  (hash-set! results arg-key arg-value))]
	       [(string=? (substring arg 0 1) "-")
		(map
		 (λ (char)
		   (hash-set! results char #t)))]
	       [else (hash-set! results 'line (cond [(hash-has-key? results 'line)
						     (append (hash-ref results 'line)
							     (list arg))]
						    [else (list arg)]))]))
       args)
      (when (hash-has-key? results 'line)
	(hash-set! results 'line (string-join (hash-ref results 'line))))
      results))
  (λ (input-line)
    (let ([response ""]
	  [commands (thing-quality parsing-thing 'mudsocket-commands)])
      (log-debug "Parsing a line from ~a:\n  ~a"
		 (thing-name parsing-thing) input-line)
      (when (> (string-length input-line) 0)
	(let* ([split-input-line (string-split input-line)]
	       [first-word (car split-input-line)]
	       [parsed-args (parse-args (cdr split-input-line))])
	  (cond [(hash-has-key? commands first-word)
		 ((hash-ref commands first-word) parsed-args)]
		[else (set! response "Invalid command.")]))
	(when (> (string-length response) 0)
	  (add-string-to-thing-quality! response parsing-thing
				       'mudsocket-output-buffer))))))

(define (make-mudsocket-sender-for-thing receiving-thing)
  (λ ()
    (let ([receiving-thing-name
           (thing-name receiving-thing)]
	  [receiving-thing-mudsocket-out
           (thing-quality receiving-thing 'mudsocket-out)]
	  [text-to-send (thing-quality receiving-thing
                                       'mudsocket-output-buffer)])
      (log-debug "Sending ~a a message:\n  ~a"
		   receiving-thing-name
		   text-to-send)
      (with-handlers
	    ([exn?
	      (λ (e)
		(log-warning "Issue sending message to ~a: ~a"
			     receiving-thing-name
			     e))])
	  (display
	   (format
	    (cond
	      [(eq? #\newline
		    (last (string->list text-to-send)))
	       "~a"]
	      [else "~a\n"])
	    text-to-send)
	   receiving-thing-mudsocket-out)
	  (flush-output receiving-thing-mudsocket-out)
	  (set-thing-quality! receiving-thing 'mudsocket-output-buffer "")))))

(define (change-thing-into-mudsocket-client! changed-thing
                                             in out
                                             ip port)
  (map (λ (quality-pair)
         (add-quality-to-thing! (car quality-pair)
                                changed-thing)
	 (set-thing-quality! changed-thing
			     (car quality-pair)
                             (cdr quality-pair)))
       (list
        (cons 'mass 1)
        (cons 'mudsocket-in in)
        (cons 'mudsocket-out out)
        (cons 'mudsocket-ip ip)
        (cons 'mudsocket-port port)
        (cons 'mudsocket-output-buffer "")
        (cons 'mudsocket-commands
              (make-hash
               (make-mudsocket-commands-for-thing changed-thing)))
        (cons 'mudsocket-parser
              (make-mudsocket-parser-for-thing changed-thing))
        (cons 'mudsocket-sender
              (make-mudsocket-sender-for-thing changed-thing))))
  (set-thing-name! changed-thing
                   (string-join (list "User-#"
                                      (generate-simple-id 3))
                                "")))

(define (make-mudsocket-tick-event-for-universe target-universe
                                                [port 4242])
  (log-debug "Making a MUDSocket tick event for ~a."
             (universe-name target-universe))
  (define mudsocket-listener (tcp-listen port 5 #t))
  (define current-connections '())
  (define (disconnect-connection connected-thing)
    (close-input-port (thing-quality connected-thing 'mudsocket-in))
    (close-output-port (thing-quality connected-thing 'mudsocket-out))
    (set! current-connections (remove connected-thing
                                      current-connections))
    (log-info "MUDSocket disconnected connection from ~a:~a"
	      (thing-quality connected-thing 'mudsocket-ip)
	      (thing-quality connected-thing 'mudsocket-port)))
  (define (tick-mudsocket-event ticked-universe)
    (define (accept-new-connection)
      (define-values (mudsocket-in mudsocket-out)
	(tcp-accept mudsocket-listener))
      (define-values (local-ip local-port remote-ip remote-port)
	(tcp-addresses mudsocket-in #t))
      (log-info "MUDSocket accepted a new connection from ~a:~a"
		remote-ip remote-port)
      (define connected-thing (create-thing "MUDSocket client"
                                            ticked-universe))
      (change-thing-into-mudsocket-client! connected-thing
                                           mudsocket-in
                                           mudsocket-out
                                           remote-ip
                                           remote-port)
      (log-debug "Changed ~a into a proper MUDsocket client."
		 (thing-name connected-thing))
      (set! current-connections (append (list connected-thing)
                                        current-connections))
      (log-debug "Added ~a into the list of current connections."
		 (thing-name connected-thing))
      (when (universe-has-procedure? ticked-universe
                                     'handle-mudsocket-connection)
        ((universe-procedure ticked-universe
                             'handle-mudsocket-connection)
         connected-thing))
      (add-string-to-thing-quality!
       (cond
         [(universe-has-procedure?
           ticked-universe 'make-mudsocket-connection-message)
          ((universe-procedure ticked-universe
                               'make-mudsocket-connection-message)
           connected-thing)]
         [else
          (format "Your connection to ~a has been accepted."
                  (universe-name ticked-universe))])
       connected-thing 'mudsocket-output-buffer))
    (map
     (λ (connected-thing)
       (define connected-thing-name
         (thing-name connected-thing))
       (define connected-thing-mudsocket-in
         (thing-quality connected-thing 'mudsocket-in))
       (define connected-thing-mudsocket-out
         (thing-quality connected-thing 'mudsocket-out))
       (define connected-thing-mudsocket-ip
         (thing-quality connected-thing 'mudsocket-ip))
       (define connected-thing-mudsocket-port
         (thing-quality connected-thing 'mudsocket-port))
       (define connected-thing-mudsocket-output-buffer
         (thing-quality connected-thing 'mudsocket-output-buffer))
       (define connected-thing-mudsocket-parser
         (thing-quality connected-thing 'mudsocket-parser))
       (define connected-thing-mudsocket-sender
         (thing-quality connected-thing 'mudsocket-sender))
       (cond
         [(port-closed? connected-thing-mudsocket-in)
          (disconnect-connection connected-thing)]
         [(byte-ready? connected-thing-mudsocket-in)
          (with-handlers
            ([exn:fail:read?
              (λ (e)
                (log-warning
                 (§ "MUDSocket encountered issue with ~a:\n"
                    "   ~a")
                 connected-thing-name
                 e))])
            (define connected-thing-line-in
              (read-line connected-thing-mudsocket-in))
            (cond
              [(string? connected-thing-line-in)
               (connected-thing-mudsocket-parser
                (string-trim connected-thing-line-in))]
              [(eof-object? connected-thing-line-in)
               (disconnect-connection connected-thing)]))])
       (when (> (string-length
                 connected-thing-mudsocket-output-buffer)
                 0)
         (connected-thing-mudsocket-sender)))
     current-connections)
    (when (tcp-accept-ready? mudsocket-listener)
      (accept-new-connection))
    (add-event-to-universe! tick-mudsocket-event ticked-universe))
  (set-universe-procedure! target-universe
                           'list-mudsocket-current-connections
                           (λ () current-connections))
  (set-universe-procedure! target-universe
                           'quit-mudsocket-connection
			   (λ (connected-thing)
                             (disconnect-connection connected-thing)))
  tick-mudsocket-event)

(define (hacktest)
  (define hackverse (create-universe))
  (run-logger (create-logger))
  (define create-thing
    (create-thing-creator-for-universe hackverse))
  (add-event-to-universe!
   (make-mudsocket-tick-event-for-universe hackverse)
   hackverse)
  (run-universe hackverse))
