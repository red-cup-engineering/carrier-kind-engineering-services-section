---
title: "Library"
---

+++ title = "Library Code" author = ["emsenn"] draft = false +++

<div class="ox-hugo-toc toc local">
<div></div>

- [<span class="org-todo todo plan">plan</span> Animation](#animation)
- [<span class="org-todo todo plan">plan</span> Areas](#areas)
- [Containers](#containers)
- [<span class="org-todo todo document">document</span> MUDSocket](#mudsocket)
- [<span class="org-todo todo plan">plan</span> Politics](#politics)
- [<span class="org-todo todo draft">draft</span> Talker](#talker)
- [<span class="org-todo todo plan">plan</span> Terraforming](#terraforming)
- [<span class="org-todo todo document">document</span> User Accounts](#user-accounts)

</div>
<!--endtoc-->

## <span class="org-todo todo plan">plan</span> Animation {#animation}

### Qualities of Animation {#qualities-of-animation}

#### actions {#actions}

#### thing-actions {#thing-actions}

#### add-actions-to-thing {#add-actions-to-thing}

#### set-thing-actions! {#set-thing-actions}

#### thing-has-actions? {#thing-has-actions}

#### thing-action {#thing-action}

#### add-action-to-thing {#add-action-to-thing}

#### thing-has-action? {#thing-has-action}

#### metabolism {#metabolism}

#### thing-metabolism {#thing-metabolism}

#### add-metabolism-to-thing! {#add-metabolism-to-thing}

#### set-thing-metabolism! {#set-thing-metabolism}

#### thing-has-metabolism? {#thing-has-metabolism}

#### make-small-mall-metabolism-for-thing {#make-small-mall-metabolism-for-thing}

### Basic Actions {#basic-actions}

#### movement {#movement}

#### looking {#looking}

#### make-thing-look-at-thing {#make-thing-look-at-thing}

<a id="code-snippet--make-thing-look-at-thing-procedure"></a>
```racket
(define (make-thing-look-at-thing looking-thing looked-thing)
(format "~a" (thing-name looked-thing)))
```

### MUDSocket Commands {#mudsocket-commands}

##### look {#look}

<a id="code-snippet--make-look-mudsocket-command-for-thing-procedure"></a>
```racket
(define (make-look-mudsocket-command-for-thing commanding-thing)
  (λ (command-arguments)
    (cond [(hash-empty? command-arguments)
	 (cond [(thing-has-parent-container? commanding-thing)
		(let ([commanding-thing-parent-container
		       (thing-parent-container commanding-thing)])
		  (add-string-to-thing-mudsocket-output-buffer!
		   (format "[~a]"
			   (thing-name commanding-thing-parent-container))
		   commanding-thing))]
	       [else
		(add-string-to-thing-mudsocket-output-buffer!
		 "You look around, but you aren't anyplace."
		 commanding-thing)])]
	[(hash-has-key? command-arguments "container")
	 (add-string-to-thing-mudsocket-output-buffer!
	  "Looking inside things doesn't work yet, sorry."
	  commanding-thing)]
	[(hash-has-key? command-arguments 'line)
	 (add-string-to-thing-mudsocket-output-buffer!
	  "Looking at things doesn't work yet, sorry."
	  commanding-thing)])))
```

## <span class="org-todo todo plan">plan</span> Areas {#areas}

### Map {#map}

<a id="code-snippet--make-map-from-areas-procedure"></a>
```racket
(define (make-map-from-areas areas)
 (make-hash areas))
```

### Description {#description}

#### thing-area-description {#thing-area-description}

<a id="code-snippet--thing-area-description-procedure"></a>
```racket
(define (thing-area-description queried-thing)
  (thing-quality queried-thing 'area-description))
```

#### thing-has-area-description? {#thing-has-area-description}

<a id="code-snippet--thing-has-area-description?-procedure"></a>
```racket
(define (thing-has-area-description? queried-thing)
  (thing-has-quality? queried-thing 'area-description))
```

#### set-thing-area-description! {#set-thing-area-description}

<a id="code-snippet--set-thing-area-description!-procedure"></a>
```racket
(define (set-thing-area-description! changed-thing new-area-description)
  (log-info "Setting ~a Area-Description to ~a"
	  (thing-name changed-thing)
	  new-area-description)
  (cond [(thing-has-area-description? changed-thing)
       (set-thing-quality! changed-thing 'area-description new-area-description)]
      [else
       (add-area-description-to-thing! changed-thing new-area-description)]))
```

#### add-area-description-to-thing! {#add-area-description-to-thing}

<a id="code-snippet--add-area-description-to-thing!-procedure"></a>
```racket
(define (add-area-description-to-thing! changed-thing new-area-description)
  (unless (thing-has-area-description? changed-thing)
    (log-debug "Adding Area-Description quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'area-description (void))
    (set-thing-area-description! changed-thing new-area-description)))
```

### Exits {#exits}

#### thing-area-exits {#thing-area-exits}

<a id="code-snippet--thing-area-exits-procedure"></a>
```racket
(define (thing-area-exits queried-thing)
  (thing-quality queried-thing 'area-exits))
```

#### thing-has-area-exits? {#thing-has-area-exits}

<a id="code-snippet--thing-has-area-exits?-procedure"></a>
```racket
(define (thing-has-area-exits? queried-thing)
  (thing-has-quality? queried-thing 'area-exits))
```

#### set-thing-area-exits! {#set-thing-area-exits}

<a id="code-snippet--set-thing-area-exits!-procedure"></a>
```racket
(define (set-thing-area-exits! changed-thing new-area-exits)
  (log-info "Setting ~a Area-Exits to ~a"
	  (thing-name changed-thing)
	  new-area-exits)
  (cond [(thing-has-area-exits? changed-thing)
       (set-thing-quality! changed-thing 'area-exits new-area-exits)]
      [else
       (add-area-exits-to-thing! changed-thing new-area-exits)]))
```

#### add-area-exits-to-thing! {#add-area-exits-to-thing}

<a id="code-snippet--add-area-exits-to-thing!-procedure"></a>
```racket
(define (add-area-exits-to-thing! changed-thing new-area-exits)
  (unless (thing-has-area-exits? changed-thing)
    (log-debug "Adding Area-Exits quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'area-exits (void))
    (set-thing-area-exits! changed-thing new-area-exits)))
```

### Populations {#populations}

### Facilities {#facilities}

### Other Stuff? {#other-stuff}

## Containers {#containers}

#### thing-contents {#thing-contents}

<a id="code-snippet--thing-contents-procedure"></a>
```racket
(define (thing-contents queried-thing)
  (thing-quality queried-thing 'contents))
```

#### thing-has-contents? {#thing-has-contents}

<a id="code-snippet--thing-has-contents?-procedure"></a>
```racket
(define (thing-has-contents? queried-thing)
  (thing-has-quality? queried-thing 'contents))
```

#### set-thing-contents! {#set-thing-contents}

<a id="code-snippet--set-thing-contents!-procedure"></a>
```racket
(define (set-thing-contents! changed-thing new-contents)
  (log-info "Setting ~a Contents to ~a"
	  (thing-name changed-thing)
	  new-contents)
  (cond [(thing-has-contents? changed-thing)
       (set-thing-quality! changed-thing 'contents new-contents)]
      [else
       (add-contents-to-thing! changed-thing new-contents)]))
```

#### add-contents-to-thing! {#add-contents-to-thing}

<a id="code-snippet--add-contents-to-thing!-procedure"></a>
```racket
(define (add-contents-to-thing! changed-thing [new-contents (void)])
  (unless (thing-has-contents? changed-thing)
    (log-debug "Adding Contents quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'contents (void))
    (set-thing-contents! changed-thing new-contents)))
```

#### add-thing-to-thing-contents! {#add-thing-to-thing-contents}

<a id="code-snippet--add-thing-to-thing-contents!-procedure"></a>
```racket
(define (add-thing-to-thing-contents! added-thing container-thing)
  (when (thing-has-parent-container? added-thing)
    (let ([added-thing-parent-container (thing-parent-container added-thing)])
      (when (thing? added-thing-parent-container)
      (remove-thing-from-thing-contents! added-thing added-thing-parent-container))))
  (set-thing-parent-container! added-thing container-thing)
  (set-thing-contents! container-thing (list (thing-contents container-thing) (list added-thing))))
```

#### remove-thing-from-thing-contents! {#remove-thing-from-thing-contents}

<a id="code-snippet--remove-thing-from-thing-contents!-procedure"></a>
```racket
(define (remove-thing-from-thing-contents! removed-thing container-thing)
  (when
      (and (thing-has-parent-container? removed-thing)
	 (eq? (thing-parent-container removed-thing) container-thing))
    (set-thing-parent-container! removed-thing (void)))
  (set-thing-contents!
   container-thing
   (remove removed-thing (thing-contents container-thing))))
```

#### thing-parent-container {#thing-parent-container}

<a id="code-snippet--thing-parent-container-procedure"></a>
```racket
(define (thing-parent-container queried-thing)
  (thing-quality queried-thing 'container))
```

#### thing-has-parent-container? {#thing-has-parent-container}

<a id="code-snippet--thing-has-parent-container?-procedure"></a>
```racket
(define (thing-has-parent-container? queried-thing)
  (thing-has-quality? queried-thing 'container))
```

#### set-thing-parent-container! {#set-thing-parent-container}

<a id="code-snippet--set-thing-parent-container!-procedure"></a>
```racket
(define (set-thing-parent-container! changed-thing new-parent-container)
  (log-info "Setting ~a Container to ~a"
	  (thing-name changed-thing)
	  new-parent-container)
  (cond [(thing-has-parent-container? changed-thing)
       (set-thing-quality! changed-thing 'container new-parent-container)]
      [else
       (add-parent-container-to-thing! changed-thing new-parent-container)]))
```

#### add-parent-container-to-thing! {#add-parent-container-to-thing}

<a id="code-snippet--add-parent-container-to-thing!-procedure"></a>
```racket
(define (add-parent-container-to-thing! changed-thing [new-parent-container (void)])
  (unless (thing-has-parent-container? changed-thing)
    (log-debug "Adding Container quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'container (void))
    (set-thing-parent-container! changed-thing new-parent-container)))
```

## <span class="org-todo todo document">document</span> MUDSocket {#mudsocket}

### make-mudsocket-tick-event-for-universe {#make-mudsocket-tick-event-for-universe}

<a id="code-snippet--make-mudsocket-tick-event-for-universe"></a>
```racket
(define (make-mudsocket-tick-event-for-universe this-universe [port 4242])
  (log-debug "Making a MUDSocket tick event.")
  (define mudsocket-listener (tcp-listen port 5 #t))
  (define current-connections '())
  (define (tick-mudsocket-event ticked-universe)
    (define (accept-new-connection)
      (define-values (mudsocket-in mudsocket-out)
      (tcp-accept mudsocket-listener))
      (define-values (local-ip local-port remote-ip remote-port)
      (tcp-addresses mudsocket-in #t))
      (log-info "MUDSocket accepted a new connection from ~a:~a"
	      remote-ip remote-port)
      (define connected-thing
      (make-thing "MUDSocket client" ticked-universe))
      (add-mudsocket-in-to-thing! connected-thing mudsocket-in)
      (add-mudsocket-out-to-thing! connected-thing mudsocket-out)
      (add-mudsocket-ip-to-thing! connected-thing remote-ip)
      (add-mudsocket-port-to-thing! connected-thing remote-port)
      (add-mudsocket-output-buffer-to-thing! connected-thing)
      (add-mudsocket-sender-to-thing! connected-thing)
      (add-mudsocket-parser-to-thing! connected-thing
	(make-mudsocket-login-parser-for-thing connected-thing))
      (add-talker-channels-to-thing! connected-thing)
      (add-mudsocket-commands-to-thing! connected-thing)
      (set! current-connections (append (list connected-thing) current-connections))
      (add-thing-to-universe-things! connected-thing this-universe)
      (cond [(universe-has-procedure? this-universe 'handle-mudsocket-connection)
	   ((universe-procedure this-universe 'handle-mudsocket-connection)
	    connected-thing)]
	  [else
	   (add-string-to-thing-mudsocket-output-buffer!
	    (format "Your connection to ~a has been accepted."
		    (universe-name ticked-universe))
	      connected-thing)]))
    (map
     (λ (connected-thing)
       (let ([connected-thing-name (thing-name connected-thing)]
	   [connected-thing-mudsocket-in (thing-mudsocket-in connected-thing)]
	   [connected-thing-mudsocket-out (thing-mudsocket-out connected-thing)]
	   [connected-thing-mudsocket-ip (thing-mudsocket-ip connected-thing)]
	   [connected-thing-mudsocket-port (thing-mudsocket-port connected-thing)]
	   [connected-thing-mudsocket-output-buffer (thing-mudsocket-output-buffer connected-thing)]
	   [connected-thing-mudsocket-parser (thing-mudsocket-parser connected-thing)]
	   [connected-thing-mudsocket-sender (thing-mudsocket-sender connected-thing)])
       (define (disconnect)
	 (close-input-port connected-thing-mudsocket-in)
	 (close-output-port connected-thing-mudsocket-out)
	 (set! current-connections (remove connected-thing current-connections))
	 (log-info "MUDSocket disconnected connection from ~a:~a"
		   connected-thing-mudsocket-ip
		   connected-thing-mudsocket-port))
       ; todo: add ^-- (destroy-thing connected-thing) above
       (cond
	 [(port-closed? connected-thing-mudsocket-in)
	  (disconnect)]
	 [(byte-ready? connected-thing-mudsocket-in)
	  (with-handlers
	      ([exn:fail:read?
		(λ (e) (log-warning "MUDSocket encountered issue with ~a: ~a"
				    connected-thing-name
				    e))]
	     [exn:fail:network:errno?
	      (λ (e) (log-warning "MUDSocket encountered issue with ~a: ~a"
				  connected-thing-name
				  e))])
	    (let ([connected-thing-line-in (read-line connected-thing-mudsocket-in)])
	      (cond [(string? connected-thing-line-in)
		     (connected-thing-mudsocket-parser (string-trim connected-thing-line-in))]
		    [(eof-object? connected-thing-line-in)
		     (disconnect)])))])
	    (when (> (string-length connected-thing-mudsocket-output-buffer) 0)
	      (connected-thing-mudsocket-sender))))
     current-connections)
    (when (tcp-accept-ready? mudsocket-listener)
      (accept-new-connection))
    (add-event-to-universe-schedule! tick-mudsocket-event ticked-universe))
  (set-universe-procedure! this-universe 'list-mudsocket-current-connections
   (λ () current-connections))
  tick-mudsocket-event)
```

### mudsocket-in {#mudsocket-in}

#### thing-mudsocket-in {#thing-mudsocket-in}

<a id="code-snippet--thing-mudsocket-in-procedure"></a>
```racket
(define (thing-mudsocket-in queried-thing)
  (thing-quality queried-thing 'mudsocket-in))
```

#### thing-has-mudsocket-in? {#thing-has-mudsocket-in}

<a id="code-snippet--thing-has-mudsocket-in?-procedure"></a>
```racket
(define (thing-has-mudsocket-in? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-in))
```

#### set-thing-mudsocket-in! {#set-thing-mudsocket-in}

<a id="code-snippet--set-thing-mudsocket-in!-procedure"></a>
```racket
(define (set-thing-mudsocket-in! changed-thing new-mudsocket-in)
  (log-info "Setting ~a MUDSocket-In to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-in)
  (cond [(thing-has-mudsocket-in? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-in new-mudsocket-in)]
      [else
       (add-mudsocket-in-to-thing! changed-thing new-mudsocket-in)]))
```

#### add-mudsocket-in-to-thing! {#add-mudsocket-in-to-thing}

<a id="code-snippet--add-mudsocket-in-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-in-to-thing! changed-thing new-mudsocket-in)
  (unless (thing-has-mudsocket-in? changed-thing)
    (log-debug "Adding MUDSocket-In quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'mudsocket-in (void))
    (set-thing-mudsocket-in! changed-thing new-mudsocket-in)))
```

### mudsocket-input-buffer {#mudsocket-input-buffer}

#### thing-mudsocket-input-buffer {#thing-mudsocket-input-buffer}

<a id="code-snippet--thing-mudsocket-input-buffer-procedure"></a>
```racket
(define (thing-mudsocket-input-buffer queried-thing)
  (thing-quality queried-thing 'mudsocket-input-buffer))
```

#### thing-has-mudsocket-input-buffer? {#thing-has-mudsocket-input-buffer}

<a id="code-snippet--thing-has-mudsocket-input-buffer?-procedure"></a>
```racket
(define (thing-has-mudsocket-input-buffer? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-input-buffer))
```

#### set-thing-mudsocket-input-buffer! {#set-thing-mudsocket-input-buffer}

<a id="code-snippet--set-thing-mudsocket-input-buffer!-procedure"></a>
```racket
(define (set-thing-mudsocket-input-buffer! changed-thing new-mudsocket-input-buffer)
  (log-info "Setting ~a MUDSocket-input-buffer to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-input-buffer)
  (cond [(thing-has-mudsocket-input-buffer? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-input-buffer new-mudsocket-input-buffer)]
      [else
       (add-mudsocket-input-buffer-to-thing! changed-thing new-mudsocket-input-buffer)]))
```

#### add-mudsocket-input-buffer-to-thing! {#add-mudsocket-input-buffer-to-thing}

<a id="code-snippet--add-mudsocket-input-buffer-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-input-buffer-to-thing! changed-thing [new-mudsocket-input-buffer ""])
  (unless (thing-has-mudsocket-input-buffer? changed-thing)
    (log-debug "Adding MUDSocket-input-buffer quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'mudsocket-input-buffer (void))
    (set-thing-mudsocket-input-buffer! changed-thing new-mudsocket-input-buffer)))
```

### mudsocket-ip {#mudsocket-ip}

#### thing-mudsocket-ip {#thing-mudsocket-ip}

<a id="code-snippet--thing-mudsocket-ip-procedure"></a>
```racket
(define (thing-mudsocket-ip queried-thing)
  (thing-quality queried-thing 'mudsocket-ip))
```

#### thing-has-mudsocket-ip? {#thing-has-mudsocket-ip}

<a id="code-snippet--thing-has-mudsocket-ip?-procedure"></a>
```racket
(define (thing-has-mudsocket-ip? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-ip))
```

#### set-thing-mudsocket-ip! {#set-thing-mudsocket-ip}

<a id="code-snippet--set-thing-mudsocket-ip!-procedure"></a>
```racket
(define (set-thing-mudsocket-ip! changed-thing new-mudsocket-ip)
  (log-info "Setting ~a Mudsocket-Ip to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-ip)
  (cond [(thing-has-mudsocket-ip? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-ip new-mudsocket-ip)]
      [else
       (add-mudsocket-ip-to-thing! changed-thing new-mudsocket-ip)]))
```

#### add-mudsocket-ip-to-thing! {#add-mudsocket-ip-to-thing}

<a id="code-snippet--add-mudsocket-ip-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-ip-to-thing! changed-thing new-mudsocket-ip)
  (unless (thing-has-mudsocket-ip? changed-thing)
    (log-debug "Adding Mudsocket-Ip quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'mudsocket-ip (void))
    (set-thing-mudsocket-ip! changed-thing new-mudsocket-ip)))
```

### mudsocket-out {#mudsocket-out}

#### thing-mudsocket-out {#thing-mudsocket-out}

<a id="code-snippet--thing-mudsocket-out-procedure"></a>
```racket
(define (thing-mudsocket-out queried-thing)
  (thing-quality queried-thing 'mudsocket-out))
```

#### thing-has-mudsocket-out? {#thing-has-mudsocket-out}

<a id="code-snippet--thing-has-mudsocket-out?-procedure"></a>
```racket
(define (thing-has-mudsocket-out? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-out))
```

#### set-thing-mudsocket-out! {#set-thing-mudsocket-out}

<a id="code-snippet--set-thing-mudsocket-out!-procedure"></a>
```racket
(define (set-thing-mudsocket-out! changed-thing new-mudsocket-out)
  (log-info "Setting ~a Mudsocket-Out to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-out)
  (cond [(thing-has-mudsocket-out? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-out new-mudsocket-out)]
      [else
       (add-mudsocket-out-to-thing! changed-thing new-mudsocket-out)]))
```

#### add-mudsocket-out-to-thing! {#add-mudsocket-out-to-thing}

<a id="code-snippet--add-mudsocket-out-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-out-to-thing! changed-thing new-mudsocket-out)
  (unless (thing-has-mudsocket-out? changed-thing)
    (log-debug "Adding Mudsocket-Out quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'mudsocket-out (void))
    (set-thing-mudsocket-out! changed-thing new-mudsocket-out)))
```

### mudsocket-output-buffer {#mudsocket-output-buffer}

#### thing-mudsocket-output-buffer {#thing-mudsocket-output-buffer}

<a id="code-snippet--thing-mudsocket-output-buffer-procedure"></a>
```racket
(define (thing-mudsocket-output-buffer queried-thing)
  (thing-quality queried-thing 'mudsocket-output-buffer))
```

#### thing-has-mudsocket-output-buffer? {#thing-has-mudsocket-output-buffer}

<a id="code-snippet--thing-has-mudsocket-output-buffer?-procedure"></a>
```racket
(define (thing-has-mudsocket-output-buffer? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-output-buffer))
```

#### set-thing-mudsocket-output-buffer! {#set-thing-mudsocket-output-buffer}

<a id="code-snippet--set-thing-mudsocket-output-buffer!-procedure"></a>
```racket
(define (set-thing-mudsocket-output-buffer! changed-thing new-mudsocket-output-buffer)
  (log-info "Setting ~a Mudsocket-Output-Buffer to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-output-buffer)
  (cond [(thing-has-mudsocket-output-buffer? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-output-buffer new-mudsocket-output-buffer)]
      [else
       (add-mudsocket-output-buffer-to-thing! changed-thing new-mudsocket-output-buffer)]))
```

#### add-mudsocket-output-buffer-to-thing! {#add-mudsocket-output-buffer-to-thing}

<a id="code-snippet--add-mudsocket-output-buffer-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-output-buffer-to-thing! changed-thing [new-mudsocket-output-buffer ""])
  (unless (thing-has-mudsocket-output-buffer? changed-thing)
    (log-debug "Adding Mudsocket-Output-Buffer quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'mudsocket-output-buffer (void))
    (set-thing-mudsocket-output-buffer! changed-thing new-mudsocket-output-buffer)))
```

#### clear-thing-mudsocket-output-buffer! {#clear-thing-mudsocket-output-buffer}

<a id="code-snippet--clear-thing-mudsocket-output-buffer!-procedure"></a>
```racket
(define (clear-thing-mudsocket-output-buffer! changed-thing)
  (log-debug "Clearing the MUDSocket-OutputBuffer of ~a"
	   (thing-name changed-thing))
  (set-thing-mudsocket-output-buffer! changed-thing ""))
```

#### add-string-to-thing-mudsocket-output-buffer! {#add-string-to-thing-mudsocket-output-buffer}

<a id="code-snippet--add-string-to-thing-mudsocket-output-buffer!-procedure"></a>
```racket
(define (add-string-to-thing-mudsocket-output-buffer! new-string changed-thing)
  (set-thing-mudsocket-output-buffer! changed-thing (string-append (thing-mudsocket-output-buffer changed-thing) new-string)))
```

### mudsocket-parser {#mudsocket-parser}

#### thing-mudsocket-parser {#thing-mudsocket-parser}

<a id="code-snippet--thing-mudsocket-parser-procedure"></a>
```racket
(define (thing-mudsocket-parser queried-thing)
  (thing-quality queried-thing 'mudsocket-parser))
```

#### thing-has-mudsocket-parser? {#thing-has-mudsocket-parser}

<a id="code-snippet--thing-has-mudsocket-parser?-procedure"></a>
```racket
(define (thing-has-mudsocket-parser? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-parser))
```

#### set-thing-mudsocket-parser! {#set-thing-mudsocket-parser}

<a id="code-snippet--set-thing-mudsocket-parser!-procedure"></a>
```racket
(define (set-thing-mudsocket-parser! changed-thing new-mudsocket-parser)
  (log-info "Setting ~a Mudsocket-Parser to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-parser)
  (cond [(thing-has-mudsocket-parser? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-parser new-mudsocket-parser)]
      [else
       (add-mudsocket-parser-to-thing! changed-thing new-mudsocket-parser)]))
```

#### add-mudsocket-parser-to-thing! {#add-mudsocket-parser-to-thing}

<a id="code-snippet--add-mudsocket-parser-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-parser-to-thing! changed-thing [new-mudsocket-parser #f])
  (unless (thing-has-mudsocket-parser? changed-thing)
    (log-debug "Adding Mudsocket-Parser quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'mudsocket-parser (void))
    (unless new-mudsocket-parser
      (set! new-mudsocket-parser (make-mudsocket-parser-for-thing changed-thing)))
    (set-thing-mudsocket-parser! changed-thing new-mudsocket-parser)))
```

#### make-mudsocket-parser-for-thing {#make-mudsocket-parser-for-thing}

<a id="code-snippet--make-mudsocket-parser-for-thing-procedure"></a>
```racket
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
	[commands (thing-mudsocket-commands parsing-thing)])
      (log-debug "Parsing a line from ~a:\n  ~a" (thing-name parsing-thing) input-line)
      (when (> (string-length input-line) 0)
      (let* ([split-input-line (string-split input-line)]
	     [first-word (car split-input-line)]
	     [parsed-args (parse-args (cdr split-input-line))])
	(cond [(hash-has-key? commands first-word)
	       ((hash-ref commands first-word) parsed-args)]
	      [(member first-word (thing-talker-channels parsing-thing))
	       (when (hash-has-key? parsed-args 'line)
		 ((universe-procedure (thing-universe parsing-thing) 'broadcast)
		  (hash-ref parsed-args 'line)))]
	      [else (set! response "Invalid command.")]))
      (when (> (string-length response) 0)
	(add-string-to-thing-mudsocket-output-buffer! response parsing-thing))))))
```

#### make-mudsocket-login-parser-for-thing {#make-mudsocket-login-parser-for-thing}

<a id="code-snippet--make-mudsocket-login-parser-for-thing-procedure"></a>
```racket
(define (make-mudsocket-login-parser-for-thing parsing-thing)
  (define login-stage 0)
  (λ (input-line)
    (log-debug "Received the following login line from ~a:\n  ~a"
	     (thing-name parsing-thing)
	     input-line)
    (let ([response ""])
      (cond [(= login-stage 0)
	   (set-thing-user-name!
	    parsing-thing input-line)
	   (set-thing-name!
	    parsing-thing input-line)
	   (cond [((universe-procedure
		    (thing-universe parsing-thing) 'user-account?)
		   input-line)
		  (set! response
			(format "An account exists for ~a. If it's yours, enter the password and press ENTER. Otherwise, disconnect [and reconnect]."
				input-line))
		  (set! login-stage 1)]
		 [else (let ([new-password (substring (uuid-string) 0 8)])
			 (set-thing-user-password!
			  parsing-thing new-password)
			 ((universe-procedure
			    (thing-universe parsing-thing) 'register-user-account!)
			  parsing-thing)
			 (set! response (format "There was no account namd ~a, so one was created. Your new password is\n\n~a\n\nPress ENTER when you're ready to log in."
						input-line
						new-password)))
		       (set! login-stage 9)])]
	  [(= login-stage 1)
	   (cond [((universe-procedure (thing-universe parsing-thing)
				       'check-user-account-password?)
		   (thing-name parsing-thing) input-line)
		  (set! response "Correct. Press ENTER to complete login.")
		  (set! login-stage 9)]
		 [else (set! response "Incorrect. Type your [desired] user-name and press ENTER.") (set! login-stage 0)])]
	  [(= login-stage 9)
	   (set-thing-mudsocket-parser! parsing-thing (make-mudsocket-parser-for-thing parsing-thing))
	   (cond
	       [(universe-has-procedure?
		 (thing-universe parsing-thing)
		 'handle-mudsocket-login)
		((universe-procedure
		  (thing-universe parsing-thing)
		  'handle-mudsocket-login)
		 parsing-thing)]
	       [else
		(set! response "You've been logged in. You may chat with the \"cq\" command.")])])
      (when (> (string-length response) 0)
      (set-thing-mudsocket-output-buffer! parsing-thing response)))))
```

### mudsocket-port {#mudsocket-port}

#### thing-mudsocket-port {#thing-mudsocket-port}

<a id="code-snippet--thing-mudsocket-port-procedure"></a>
```racket
(define (thing-mudsocket-port queried-thing)
  (thing-quality queried-thing 'mudsocket-port))
```

#### thing-has-mudsocket-port? {#thing-has-mudsocket-port}

<a id="code-snippet--thing-has-mudsocket-port?-procedure"></a>
```racket
(define (thing-has-mudsocket-port? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-port))
```

#### set-thing-mudsocket-port! {#set-thing-mudsocket-port}

<a id="code-snippet--set-thing-mudsocket-port!-procedure"></a>
```racket
(define (set-thing-mudsocket-port! changed-thing new-mudsocket-port)
  (log-info "Setting ~a Mudsocket-Port to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-port)
  (cond [(thing-has-mudsocket-port? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-port new-mudsocket-port)]
      [else
       (add-mudsocket-port-to-thing! changed-thing new-mudsocket-port)]))
```

#### add-mudsocket-port-to-thing! {#add-mudsocket-port-to-thing}

<a id="code-snippet--add-mudsocket-port-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-port-to-thing! changed-thing new-mudsocket-port)
  (unless (thing-has-mudsocket-port? changed-thing)
    (log-debug "Adding Mudsocket-Port quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'mudsocket-port (void))
    (set-thing-mudsocket-port! changed-thing new-mudsocket-port)))
```

### mudsocket-sender {#mudsocket-sender}

#### thing-mudsocket-sender {#thing-mudsocket-sender}

<a id="code-snippet--thing-mudsocket-sender-procedure"></a>
```racket
(define (thing-mudsocket-sender queried-thing)
  (thing-quality queried-thing 'mudsocket-sender))
```

#### thing-has-mudsocket-sender? {#thing-has-mudsocket-sender}

<a id="code-snippet--thing-has-mudsocket-sender?-procedure"></a>
```racket
(define (thing-has-mudsocket-sender? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-sender))
```

#### set-thing-mudsocket-sender! {#set-thing-mudsocket-sender}

<a id="code-snippet--set-thing-mudsocket-sender!-procedure"></a>
```racket
(define (set-thing-mudsocket-sender! changed-thing new-mudsocket-sender)
  (log-info "Setting ~a Mudsocket-Sender to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-sender)
  (cond [(thing-has-mudsocket-sender? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-sender new-mudsocket-sender)]
      [else
       (add-mudsocket-sender-to-thing! changed-thing new-mudsocket-sender)]))
```

#### add-mudsocket-sender-to-thing! {#add-mudsocket-sender-to-thing}

<a id="code-snippet--add-mudsocket-sender-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-sender-to-thing! changed-thing [new-mudsocket-sender #f])
  (unless (thing-has-mudsocket-sender? changed-thing)
    (log-debug "Adding Mudsocket-Sender quality to ~a"
	     (thing-name changed-thing))
    (set-thing-quality!
     changed-thing
     'mudsocket-sender (void))
    (set-thing-mudsocket-sender!
     changed-thing
     (cond [new-mudsocket-sender new-mudsocket-sender][else (make-mudsocket-sender-for-thing changed-thing)]))))
```

#### make-mudsocket-sender-for-thing {#make-mudsocket-sender-for-thing}

<a id="code-snippet--make-mudsocket-sender-for-thing-procedure"></a>
```racket
(define (make-mudsocket-sender-for-thing receiving-thing)
  (λ ()
    (let ([receiving-thing-name (thing-name receiving-thing)]
	[receiving-thing-mudsocket-out (thing-mudsocket-out receiving-thing)]
	[text-to-send (thing-mudsocket-output-buffer receiving-thing)])
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
      (clear-thing-mudsocket-output-buffer! receiving-thing)))))
```

### MUDSocket Commands {#mudsocket-commands}

#### Working with the MUDSocket commands quality {#working-with-the-mudsocket-commands-quality}

##### thing-mudsocket-commands {#thing-mudsocket-commands}

<a id="code-snippet--thing-mudsocket-commands-procedure"></a>
```racket
(define (thing-mudsocket-commands queried-thing)
  (thing-quality queried-thing 'mudsocket-commands))
```

##### thing-has-mudsocket-commands? {#thing-has-mudsocket-commands}

<a id="code-snippet--thing-has-mudsocket-commands?-procedure"></a>
```racket
(define (thing-has-mudsocket-commands? queried-thing)
  (thing-has-quality? queried-thing 'mudsocket-commands))
```

##### set-thing-mudsocket-commands! {#set-thing-mudsocket-commands}

<a id="code-snippet--set-thing-mudsocket-commands!-procedure"></a>
```racket
(define (set-thing-mudsocket-commands! changed-thing new-mudsocket-commands)
  (log-info "Setting ~a Mudsocket-Commands to ~a"
	  (thing-name changed-thing)
	  new-mudsocket-commands)
  (cond [(thing-has-mudsocket-commands? changed-thing)
       (set-thing-quality! changed-thing 'mudsocket-commands new-mudsocket-commands)]
      [else
       (add-mudsocket-commands-to-thing! changed-thing new-mudsocket-commands)]))
```

##### add-mudsocket-commands-to-thing! {#add-mudsocket-commands-to-thing}

<a id="code-snippet--add-mudsocket-commands-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-commands-to-thing! changed-thing [new-mudsocket-commands #f])
  (unless
      (thing-has-mudsocket-commands?
       changed-thing)
    (log-debug "Adding MUDSocket-commands quality to ~a"
	     (thing-name
	      changed-thing))
    (set-thing-quality!
     changed-thing
     'mudsocket-commands
     (void))
    (set-thing-mudsocket-commands!
     changed-thing
     (cond [new-mudsocket-commands
	  new-mudsocket-commands]
	 [else
	  (make-hash
	   (list
	    (cons "commands" (make-commands-mudsocket-command-for-thing changed-thing))
	    (cons "help" (make-help-mudsocket-command-for-thing changed-thing))
	      (cons "who" (make-who-mudsocket-command-for-thing changed-thing))))]))))
```

##### add-new-mudsocket-commands-to-thing! {#add-new-mudsocket-commands-to-thing}

<a id="code-snippet--add-new-mudsocket-commands-to-thing!-procedure"></a>
```racket
(define (add-new-mudsocket-commands-to-thing! new-mudsocket-commands changed-thing)
  (unless (thing-has-mudsocket-commands? changed-thing)
    (add-mudsocket-commands-to-thing! changed-thing new-mudsocket-commands))
  (map
   (λ (new-mudsocket-command)
     (add-mudsocket-command-to-thing!
      (car new-mudsocket-command)
       (cdr new-mudsocket-command)
       changed-thing))
   new-mudsocket-commands))
```

<a id="code-snippet--add-mudsocket-command-to-thing!-procedure"></a>
```racket
(define (add-mudsocket-command-to-thing!
       new-mudsocket-command-key
       new-mudsocket-command-procedure
       changed-thing)
  (cond [(thing-has-mudsocket-commands? changed-thing)
       (hash-set! (thing-mudsocket-commands changed-thing)
		  new-mudsocket-command-key
		  new-mudsocket-command-procedure)]
      [else
       (add-mudsocket-commands-to-thing!
	changed-thing
	(list (cons new-mudsocket-command-key
		    new-mudsocket-command-procedure)))]))
```

#### Standard MUDSocket Commands {#standard-mudsocket-commands}

##### commands {#commands}

<a id="code-snippet--make-commands-mudsocket-command-for-thing-procedure"></a>
```racket
(define (make-commands-mudsocket-command-for-thing
       commanding-thing)
  (λ (args)
    (add-string-to-thing-mudsocket-output-buffer!
     (format
     "You have access to the following commands: ~a"
     (oxfordize-list (hash-keys (thing-mudsocket-commands commanding-thing))))
     commanding-thing)))
```

##### help {#help}

<a id="code-snippet--make-help-mudsocket-command-for-thing-procedure"></a>
```racket
  (define (make-help-mudsocket-command-for-thing commanding-thing)
    (λ (command-arguments)
      (let ([commanding-thing-universe (thing-universe commanding-thing)])
      (cond [(universe-has-procedure? commanding-thing-universe
				      'make-mudsocket-help-response)
	     (universe-procedure commanding-thing-universe
				 'make-mudsocket-help-response)]
	    [else
	       (add-string-to-thing-mudsocket-output-buffer!
	     (format

	      "You're connected to a qtMUD server named ~a. Your user-name is ~a.\nTo interact, type commands and press ENTER. A few useful commands:\n- commands returns a list of your available commands\n- help returns some generally helpful information\n- who returns a list of currently-connected users."
	      (universe-name commanding-thing-universe)
	      (thing-name commanding-thing))
commanding-thing)]))))
```

##### who {#who}

<a id="code-snippet--make-who-mudsocket-command-for-thing-procedure"></a>
```racket
(define (make-who-mudsocket-command-for-thing commanding-thing)
  (λ (command-arguments)
    (let ([commanding-thing-universe (thing-universe commanding-thing)])
      (cond [(universe-has-procedure? commanding-thing-universe
				    'list-mudsocket-current-connections)
	   (add-string-to-thing-mudsocket-output-buffer!
	      (format "Users connected now: ~a"
	       (oxfordize-list (map (λ (connected-thing) (thing-name connected-thing)) ((universe-procedure commanding-thing-universe
			       'list-mudsocket-current-connections)))))
	      commanding-thing)]
	  [else
	     (add-string-to-thing-mudsocket-output-buffer!
	   (format "You're unable to query who is connected to this MUD.")
	     commanding-thing)]))))
```

## <span class="org-todo todo plan">plan</span> Politics {#politics}

### parent-poliregion {#parent-poliregion}

### poliregions {#poliregions}

## <span class="org-todo todo draft">draft</span> Talker {#talker}

### talker-channels {#talker-channels}

#### thing-talker-channels {#thing-talker-channels}

<a id="code-snippet--thing-talker-channels-procedure"></a>
```racket
(define (thing-talker-channels queried-thing)
  (thing-quality queried-thing 'talker-channels))
```

#### thing-has-talker-channels? {#thing-has-talker-channels}

<a id="code-snippet--thing-has-talker-channels?-procedure"></a>
```racket
(define (thing-has-talker-channels? queried-thing)
  (thing-has-quality? queried-thing 'talker-channels))
```

#### set-thing-talker-channels! {#set-thing-talker-channels}

<a id="code-snippet--set-thing-talker-channels!-procedure"></a>
```racket
(define (set-thing-talker-channels! changed-thing new-talker-channels)
  (log-info "Setting ~a Talker-Channels to ~a"
	  (thing-name changed-thing)
	  new-talker-channels)
  (cond [(thing-has-talker-channels? changed-thing)
       (set-thing-quality! changed-thing 'talker-channels new-talker-channels)]
      [else
       (add-talker-channels-to-thing! changed-thing new-talker-channels)]))
```

#### add-talker-channels-to-thing! {#add-talker-channels-to-thing}

<a id="code-snippet--add-talker-channels-to-thing!-procedure"></a>
```racket
(define (add-talker-channels-to-thing! changed-thing [new-talker-channels '("cq")])
  (unless (thing-has-talker-channels? changed-thing)
    (log-debug "Adding Talker-Channels quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'talker-channels (void))
    (set-thing-talker-channels! changed-thing new-talker-channels)))
```

## <span class="org-todo todo plan">plan</span> Terraforming {#terraforming}

### bioregions {#bioregions}

#### thing-bioregions {#thing-bioregions}

<a id="code-snippet--thing-bioregions-procedure"></a>
```racket
(define (thing-bioregions queried-thing)
  (thing-quality queried-thing 'bioregions))
```

#### thing-has-bioregions? {#thing-has-bioregions}

<a id="code-snippet--thing-has-bioregions?-procedure"></a>
```racket
(define (thing-has-bioregions? queried-thing)
  (thing-has-quality? queried-thing 'bioregions))
```

#### set-thing-bioregions! {#set-thing-bioregions}

<a id="code-snippet--set-thing-bioregions!-procedure"></a>
```racket
(define (set-thing-bioregions! changed-thing new-bioregions-list)
  (log-info "Setting ~a bioregions to ~a"
	    (thing-name changed-thing)
	    (list-thing-names new-bioregions-list))
  (cond [(thing-has-bioregions? changed-thing)
	 (set-thing-quality! changed-thing 'bioregions new-bioregions-list)]
	[else
	 (add-bioregions-to-thing! changed-thing new-bioregions-list)]))
```

#### add-bioregions-to-thing! {#add-bioregions-to-thing}

<a id="code-snippet--add-bioregions-to-thing!-procedure"></a>
```racket
(define (add-bioregions-to-thing! changed-thing [new-bioregions #f])
  (unless (thing-has-bioregions? changed-thing)
    (log-debug "Adding bioregions quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'bioregions (list))
    (when new-bioregions (set-thing-bioregions! changed-thing new-bioregions))))
```

#### thing-has-bioregion? {#thing-has-bioregion}

<a id="code-snippet--thing-has-bioregion?-procedure"></a>
```racket
(define (thing-has-bioregion? queried-thing potential-bioregion)
  (log-debug "Checking if ~a is a bioregion of ~a"
	   (thing-name potential-bioregion)
	   (thing-name queried-thing))
  (cond [(thing-has-quality? queried-thing 'bioregions)
       (let ([result (member potential-bioregion (thing-bioregions queried-thing))])
	 (cond [result #t][else #f]))]
      [else #f]))
```

#### add-bioregion-to-thing! {#add-bioregion-to-thing}

<a id="code-snippet--add-bioregion-to-thing!-procedure"></a>
```racket
(define (add-bioregion-to-thing! new-bioregion changed-thing)
  (log-info "Adding ~a to ~a's bioregions."
	  (thing-name new-bioregion)
	  (thing-name changed-thing))
  (unless (thing-has-quality? changed-thing 'bioregions)
    (log-debug "~a doesn't have the bioregions quality: triggering its addition."
	     (thing-name changed-thing))
    (add-bioregions-to-thing! changed-thing)
    (log-debug "Now, moving ahead with adding ~a to ~a's bioregions."
	     (thing-name new-bioregion)
	     (thing-name changed-thing)))
  (set-thing-bioregions! changed-thing (append (thing-bioregions changed-thing) (list new-bioregion))))
```

#### list-names-of-thing-bioregions {#list-names-of-thing-bioregions}

<a id="code-snippet--list-names-of-thing-bioregions-procedure"></a>
```racket
(define (list-names-of-thing-bioregions queried-thing)
  (list-thing-names (thing-bioregions queried-thing)))
```

### elevation {#elevation}

#### thing-elevation {#thing-elevation}

#### add-elevation-to-thing! {#add-elevation-to-thing}

#### set-thing-elevation! {#set-thing-elevation}

#### thing-has-elevation? {#thing-has-elevation}

### parent-bioregion {#parent-bioregion}

#### thing-parent-bioregion {#thing-parent-bioregion}

<a id="code-snippet--thing-parent-bioregion-procedure"></a>
```racket
(define (thing-parent-bioregion queried-thing)
  (thing-quality queried-thing 'parent-bioregion))
```

#### set-thing-parent-bioregion! {#set-thing-parent-bioregion}

<a id="code-snippet--set-thing-parent-bioregion!-procedure"></a>
```racket
(define (set-thing-parent-bioregion! changed-thing new-parent-bioregion)
  (log-info "Setting ~a's parent bioregion to ~a"
	    (thing-name changed-thing)
	    (thing-name new-parent-bioregion))
  (set-thing-quality! changed-thing 'parent-bioregion new-parent-bioregion)
  (unless (thing-has-bioregion? new-parent-bioregion changed-thing)
    (log-debug "~a dosn't contain ~a in its list of bioregions: triggering its addition."
	       (thing-name new-parent-bioregion)
	       (thing-name changed-thing))
    (add-bioregion-to-thing! changed-thing new-parent-bioregion)))
```

#### thing-has-parent-bioregion? {#thing-has-parent-bioregion}

<a id="code-snippet--thing-has-parent-bioregion?-procedure"></a>
```racket
(define (thing-has-parent-bioregion? queried-thing)
  (thing-has-quality? queried-thing 'parent-bioregion))
```

#### add-parent-bioregion-to-thing! {#add-parent-bioregion-to-thing}

<a id="code-snippet--add-parent-bioregion-to-thing!-procedure"></a>
```racket
(define (add-parent-bioregion-to-thing! changed-thing new-parent-bioregion)
  (unless (thing-has-parent-bioregion? changed-thing)
    (log-debug "Adding parent bioregion quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'parent-bioregion (void))
    (set-thing-parent-bioregion! changed-thing new-parent-bioregion)))
```

### parent-poliregion {#parent-poliregion}

### populations {#populations}

### generate-world-plane {#generate-world-plane}

```racket
#lang racket

(require plot)


(define (clusterize data centroids)
  (for*/fold ([res (map list centroids)])
	     ([x (in-list data)])
    (define c (argmin (curryr (metric) x) centroids))
    (dict-set res c (cons x (dict-ref res c)))))
(define (euclidean-distance a b)
  (for/sum ([x (in-vector a)] [y (in-vector b)])
    (sqr (- x y))))
(define metric (make-parameter euclidean-distance))


;; Performs clustering of points in a grid
;; using the nearest neigbour approach and shows
;; clusters in different colors
(define (plot-Voronoi-diagram point-list)
  (define pts
    (for*/list ([x (in-range 0 1 0.005)]
		[y (in-range 0 1 0.005)])
      (vector x y)))

  (define clusters (clusterize pts point-list))

  (plot
   (append
    (for/list ([r (in-list clusters)] [i (in-naturals)])
      (points (rest r) #:color i #:sym 'fullcircle1))
    (list (points point-list #:sym 'fullcircle5 #:fill-color 'white)))))



(define pts
  (for/list ([i 50]) (vector (random) (random))))

(display (plot-Voronoi-diagram pts))
```

## <span class="org-todo todo document">document</span> User Accounts {#user-accounts}

### user-name {#user-name}

#### thing-user-name {#thing-user-name}

<a id="code-snippet--thing-user-name-procedure"></a>
```racket
(define (thing-user-name queried-thing)
  (thing-quality queried-thing 'user-name))
```

#### thing-has-user-name? {#thing-has-user-name}

<a id="code-snippet--thing-has-user-name?-procedure"></a>
```racket
(define (thing-has-user-name? queried-thing)
  (thing-has-quality? queried-thing 'user-name))
```

#### set-thing-user-name! {#set-thing-user-name}

<a id="code-snippet--set-thing-user-name!-procedure"></a>
```racket
(define (set-thing-user-name! changed-thing new-user-name)
  (log-info "Setting ~a User-Name to ~a"
	  (thing-name changed-thing)
	  new-user-name)
  (cond [(thing-has-user-name? changed-thing)
       (set-thing-quality! changed-thing 'user-name new-user-name)]
      [else
       (add-user-name-to-thing! changed-thing new-user-name)]))
```

#### add-user-name-to-thing! {#add-user-name-to-thing}

<a id="code-snippet--add-user-name-to-thing!-procedure"></a>
```racket
(define (add-user-name-to-thing! changed-thing new-user-name)
  (unless (thing-has-user-name? changed-thing)
    (log-debug "Adding User-Name quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'user-name (void))
    (set-thing-user-name! changed-thing new-user-name)))
```

### user-password {#user-password}

#### thing-user-password {#thing-user-password}

<a id="code-snippet--thing-user-password-procedure"></a>
```racket
(define (thing-user-password queried-thing)
  (thing-quality queried-thing 'user-password))
```

#### thing-has-user-password? {#thing-has-user-password}

<a id="code-snippet--thing-has-user-password?-procedure"></a>
```racket
(define (thing-has-user-password? queried-thing)
  (thing-has-quality? queried-thing 'user-password))
```

#### set-thing-user-password! {#set-thing-user-password}

<a id="code-snippet--set-thing-user-password!-procedure"></a>
```racket
(define (set-thing-user-password! changed-thing new-user-password)
  (log-info "Setting ~a User-Password to ~a"
	  (thing-name changed-thing)
	  new-user-password)
  (cond [(thing-has-user-password? changed-thing)
       (set-thing-quality! changed-thing 'user-password new-user-password)]
      [else
       (add-user-password-to-thing! changed-thing new-user-password)]))
```

#### add-user-password-to-thing! {#add-user-password-to-thing}

<a id="code-snippet--add-user-password-to-thing!-procedure"></a>
```racket
(define (add-user-password-to-thing! changed-thing new-user-password)
  (unless (thing-has-user-password? changed-thing)
    (log-debug "Adding User-Password quality to ~a" (thing-name changed-thing))
    (set-thing-quality! changed-thing 'user-password (void))
    (set-thing-user-password! changed-thing new-user-password)))
```

### add-user-accounts-to-universe!-event {#add-user-accounts-to-universe-event}

<a id="code-snippet--add-user-accounts-to-universe!-event-procedure"></a>
```racket
(define (add-user-accounts-to-universe!-event
       [save-file "saved1-user-accounts.rktd"])
  (define user-accounts (make-hash))
  (define (user-account name) (hash-ref user-accounts name))
  (define (user-account? name) (hash-has-key? user-accounts name))
  (define (load-user-accounts)
    (cond [(file-exists? save-file)
	 (set! user-accounts (deserialize-file save-file))]
	[else
	 (log-info "Invalid save file ~a cannot load accounts."
		   save-file)]))
  (define (register-user-account! reference-thing)
    (let ([name (thing-name reference-thing)])
      (log-info "Registering new user account for thing named ~a" name)
      (hash-set! user-accounts name
	       (make-hash
		(list
		 (cons 'user-name (thing-user-name reference-thing))
		 (cons 'user-password (thing-user-password reference-thing)))))
      ((universe-procedure (thing-universe reference-thing) 'save-user-accounts!))))
  (define (save-user-accounts!)
    (cond [(serializable? user-accounts)
	 (with-output-to-file save-file
	   (λ () (write (serialize user-accounts)))
	   #:exists 'replace)
	 (load-user-accounts)]
	[else
	 (log-warning "User account data not serializable; data not saved.")]))
  (λ (ticked-universe)
    (log-info "Adding user accounts to universe ~a" (universe-name ticked-universe))
    (set-universe-procedure!
     ticked-universe 'user-account user-account)
    (set-universe-procedure!
     ticked-universe 'user-account? user-account?)
    (set-universe-procedure!
     ticked-universe 'load-user-accounts load-user-accounts)
    (set-universe-procedure!
     ticked-universe 'register-user-account! register-user-account!)
    (set-universe-procedure!
     ticked-universe 'save-user-accounts! save-user-accounts!)
    (set-universe-procedure!
     ticked-universe 'check-user-account-password?
     (λ (queried-user-name provided-password)
       (string=? (hash-ref (hash-ref user-accounts queried-user-name) 'user-password) provided-password)))
    (load-user-accounts)
    ticked-universe))
```
