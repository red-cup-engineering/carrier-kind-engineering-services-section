;;; (qtops node-worker) — WO-6, the Guile body invoking one Node worker.
;;;
;;; The node-worker is deliberately small and boring. It spawns the Node worker
;;; (scripts/eavt-worker.mjs) as a child process, speaks newline-delimited
;;; JSON frames over its stdin/stdout, and does exactly three things:
;;;
;;;   1. a session-start handshake — ask the worker's "verbs" verb what it
;;;      exposes, and remember that list;
;;;   2. call-worker — send one frame, read the matching reply, and PROJECT the
;;;      reply's JSON value into a Guile value (guile-json's parse — no byte
;;;      interpretation, no re-encoding, no local computation of anything the
;;;      worker could answer instead);
;;;   3. refuse, as a typed record, any verb the handshake did not list — the
;;;      node-worker never asks the worker to do something it did not first claim
;;;      to be able to do.
;;;
;;; Per the owner's binary law (2026-08-30): I/O and data transformation are
;;; Node's job; Guile maps operational reality. This module holds NO fold, no
;;; hash, no canonicalization, no CBOR/base64 decode — every substrate law
;;; (row identity, canonical encoding, append, fold) is a leaf-call to
;;; @red-cup-engineering/computer through eavt-worker.mjs. A Guile-resident
;;; value here is only ever a projection of what the worker already answered.
;;;
;;; Every call is tagged with an origin symbol from the WO-6 closed enum:
;;; local (kernel housekeeping), cross-thing (one thing's rule invoking
;;; another's affordance), session (a mask-wearing inhabitant), driver
;;; (scheduler/heartbeat).

(define-module (qtops node-worker)
  #:use-module (ice-9 popen)
  #:use-module (ice-9 rdelim)
  #:use-module (srfi srfi-9)
  #:use-module (json)
  #:export (open-worker
            close-worker
            worker-verbs
            call-worker
            origins
            refusal?
            refusal-state
            refusal-by
            refusal-at
            refusal-because))

;; The WO-6 closed enum of call origins. No richer provenance scheme yet.
(define origins '(local cross-thing session driver))

;; A refusal is ALWAYS this typed record — never a bare boolean (WO standing
;; rule). state is 'refused; by is the origin that made the refused call; at
;; is the epoch-second the refusal happened; because is a human-readable
;; string naming the reason.
(define-record-type <refusal>
  (make-refusal state by at because)
  refusal?
  (state   refusal-state)
  (by      refusal-by)
  (at      refusal-at)
  (because refusal-because))

(define (refuse origin because)
  (make-refusal 'refused origin (current-time) because))

;; A worker is the spawned Node process plus the verb list its handshake
;; reported, plus a request-id counter. Opaque outside this module.
(define-record-type <worker>
  (make-worker port verbs id-box)
  worker?
  (port    worker-port)
  (verbs   worker-verbs)
  (id-box  worker-id-box))

(define (next-id! worker)
  (let* ((box (worker-id-box worker))
         (n (+ 1 (car box))))
    (set-car! box n)
    n))

;; The qtOps app's own root, fixed rather than derived: `current-filename`
;; is unreliable here — it reads #f once this module has been auto-compiled
;; to its .go cache (a real Guile quirk, checked directly, not assumed), so a
;; path derived from it would work uncompiled and break silently once cached.
;; QTOPS_APP_ROOT overrides the constant for relocated checkouts.
(define qtops-app-root
  (or (getenv "QTOPS_APP_ROOT")
      "/home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/apps/qtops"))

(define (default-worker-command)
  (list "node" (string-append qtops-app-root "/scripts/eavt-worker.mjs")))

;; send-frame! — write one JSON frame line to the worker and flush. The ONLY
;; encoding step in this module: JSON text is the wire's own frame plumbing,
;; not a data transformation of what the frame carries.
(define (send-frame! port id verb args origin)
  (display (scm->json-string
            `(("id" . ,id)
              ("verb" . ,verb)
              ("args" . ,(or args '()))
              ("origin" . ,(symbol->string origin))))
           port)
  (newline port)
  (force-output port))

;; read-reply — read one reply line and project it to a Guile value via
;; guile-json. No interpretation of what the value MEANS happens here.
(define (read-reply port)
  (let ((line (read-line port)))
    (if (eof-object? line)
        (error "qtops node-worker: worker closed its output before replying")
        (json-string->scm line))))

;; open-worker — spawn the Node worker and run the session-start handshake: ask
;; its "verbs" verb what it exposes, and remember the answer. Every later
;; call-worker refuses any verb not in this list.
(define* (open-worker #:optional (command (default-worker-command)))
  (let* ((port (apply open-pipe* OPEN_BOTH command))
         (id 0))
    (send-frame! port id "verbs" '() 'local)
    (let* ((reply (read-reply port))
           (ok (assoc-ref reply "ok")))
      (unless (eq? ok #t)
        (error "qtops node-worker: worker refused its own verbs handshake"
               (assoc-ref reply "error")))
      (let ((verbs (map (lambda (v) v) (vector->list (assoc-ref reply "value")))))
        (make-worker port verbs (cons 0 #f))))))

(define (close-worker worker)
  (close-pipe (worker-port worker)))

;; call-worker — the node-worker's one verb for reaching the Node actuators.
;; Refuses (typed record, never a bare boolean) any verb the session-start
;; handshake did not list. Otherwise sends the frame, reads the matching
;; reply, and either returns the projected value (ok: #t) or errors with the
;; worker's own reported error (ok: #f) — the node-worker adds nothing to it.
(define* (call-worker worker verb #:optional (args '()) (origin 'local))
  (unless (memq origin origins)
    (error "qtops node-worker: unknown call origin" origin))
  (if (not (member verb (worker-verbs worker)))
      (refuse origin (string-append "unknown verb: " verb))
      (let* ((id (next-id! worker))
             (port (worker-port worker)))
        (send-frame! port id verb args origin)
        (let* ((reply (read-reply port))
               (reply-id (assoc-ref reply "id"))
               (ok (assoc-ref reply "ok")))
          (unless (equal? reply-id id)
            (error "qtops node-worker: reply id did not match request id"
                   (list 'sent id 'got reply-id)))
          (if (eq? ok #t)
              (assoc-ref reply "value")
              (error "qtops node-worker: worker reported an error"
                     (assoc-ref reply "error")))))))
