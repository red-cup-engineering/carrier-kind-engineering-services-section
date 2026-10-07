;;; A deployed application is its admitted JS closure and a pinned interpreter.
;;; npm's lockfile remains the dependency authority; no parallel Guix registry.
(define-module (guix-deployment)
  #:use-module (guix packages)
  #:use-module (guix gexp)
  #:use-module (guix build-system trivial)
  #:use-module (gnu packages node)
  #:use-module (gnu packages bash)
  #:use-module (ice-9 format)
  #:use-module (srfi srfi-1)
  #:export (enterprise-deployment))

;; Units and launchers are built with their actual store paths. The host's
;; systemd remains responsible for sockets, cgroups and process supervision.
(define* (enterprise-deployment name directory entry
                               #:key environment-file (environment '())
                               socket (heap 512) (restart-seconds 5)
                               oom-score memory-high)
  (let ((source (getenv "GUIX_DEPLOYMENT_SOURCE")))
    (unless (and source (file-exists? source))
      (error "GUIX_DEPLOYMENT_SOURCE must name the admitted runtime closure"))
    (package
      (name (string-append name "-deployment"))
      (version "1")
      (source #f)
      (build-system trivial-build-system)
      (arguments
       (list
        #:modules '((guix build utils) (ice-9 format) (ice-9 regex) (srfi srfi-1))
        #:builder
        #~(begin
            (use-modules (guix build utils) (ice-9 format) (ice-9 regex) (srfi srfi-1))
            (let* ((out #$output)
                   (runtime #$(file-append node "/bin/node"))
                   (bin (string-append out "/bin"))
                   (units (string-append out "/.guix-systemd"))
                   (launcher (string-append bin "/" #$name))
                   (unit (string-append units "/" #$name "-561-group.service"))
                   (env
                    (map (lambda (pair)
                           (cons (car pair)
                                 (regexp-substitute/global
                                  #f "\\{release\\}" (cdr pair) 'pre out 'post)))
                         '#$environment)))
              (copy-recursively #$(local-file source "admitted-runtime" #:recursive? #t) out)
              (mkdir-p bin)
              (mkdir-p units)
              (symlink runtime (string-append bin "/node"))
              (call-with-output-file launcher
                (lambda (port)
                  (format port "#!~a~%exec ~s ~s \"$@\"~%"
                          #$(file-append bash-minimal "/bin/sh")
                          runtime (string-append out "/" #$entry))))
              (chmod launcher #o555)
              (call-with-output-file unit
                (lambda (port)
                  (format port "[Unit]~%Description=~a Guix enterprise deployment~%After=network-online.target~a~%Wants=network-online.target~a~%~%[Service]~%Type=simple~%WorkingDirectory=~a/~a~%ExecStart=~a~%EnvironmentFile=~a~%"
                          #$name
                          (if #$socket (string-append " " #$socket) "")
                          (if #$socket (string-append " " #$socket) "")
                          out #$directory launcher #$environment-file)
                  (format port "EnvironmentFile=~a/environment~%" units)
                  (format port "Environment=\"PATH=~a/bin:/home/emsenn/.local/bin:/usr/local/bin:/usr/bin:/bin\"~%" out)
                  (format port "Environment=\"NODE_OPTIONS=--max-old-space-size=~a --disable-sigusr1\"~%" #$heap)
                  (when #$oom-score (format port "OOMScoreAdjust=~a~%" #$oom-score))
                  (when #$memory-high (format port "MemoryHigh=~a~%" #$memory-high))
                  (format port "Restart=on-failure~%RestartSec=~a~%TimeoutStartSec=600~%UMask=0077~%~%[Install]~%WantedBy=default.target~%" #$restart-seconds)))
              (call-with-output-file (string-append units "/environment")
                (lambda (port)
                  (for-each (lambda (pair) (format port "~a=~s~%" (car pair) (cdr pair))) env)))
              #t))))
      (home-page "https://561.group")
      (synopsis (string-append name " enterprise deployment"))
      (description
       "An admitted application closure, its Guix interpreter, launcher and service.
Persistent state and credentials remain in the host's existing custody.")
      (license #f))))
