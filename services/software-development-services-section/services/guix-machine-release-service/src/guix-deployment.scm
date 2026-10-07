;;; A deployed application is its admitted JS closure and a pinned interpreter.
;;; npm's lockfile remains the dependency authority; no parallel Guix registry.
(define-module (guix-deployment)
  #:use-module (guix packages)
  #:use-module (guix gexp)
  #:use-module (guix build-system trivial)
  #:use-module (gnu packages node)
  #:use-module (gnu packages bash)
  #:use-module (gnu packages ssh)
  #:use-module (ice-9 format)
  #:use-module (srfi srfi-1)
  #:export (enterprise-deployment))

;; Units and launchers are built with their actual store paths. The host's
;; systemd remains responsible for sockets, cgroups and process supervision.
(define* (enterprise-deployment machine-name directory entry
                               #:key environment-file (environment '())
                               socket (heap 512) (restart-seconds 5)
                               oom-score memory-high (auxiliary-units '()) (commands '()) reverse-tunnel)
  (let ((admitted-source (getenv "GUIX_DEPLOYMENT_SOURCE")))
    (unless (and admitted-source (file-exists? admitted-source))
      (error "GUIX_DEPLOYMENT_SOURCE must name the admitted runtime closure"))
    (package
      (name (string-append machine-name "-deployment"))
      (version "1")
      (source #f)
      (build-system trivial-build-system)
      (arguments
       (list
        #:modules '((guix build utils) (ice-9 format) (ice-9 regex) (ice-9 ftw) (srfi srfi-1))
        #:builder
        #~(begin
            (use-modules (guix build utils) (ice-9 format) (ice-9 regex) (ice-9 ftw) (srfi srfi-1))
            (let* ((out #$output)
                   (runtime #$(file-append node "/bin/node"))
                   (bin (string-append out "/bin"))
                   (units (string-append out "/.guix-systemd"))
                   (launcher (string-append bin "/" #$machine-name))
                   (unit (string-append units "/" #$machine-name "-561-group.service"))
                   (env
                    (map (lambda (pair)
                           (cons (car pair)
                                 (regexp-substitute/global
                                  #f "\\{release\\}" (cdr pair) 'pre out 'post)))
                         (append '#$environment
                           (list (cons "NODE_OPTIONS" (format #f "--max-old-space-size=~a --disable-sigusr1" #$heap))
                                 (cons "PATH" (string-append out "/bin:/home/emsenn/.local/bin:/usr/local/bin:/usr/bin:/bin")))))))
              ;; The admitted tree is already an immutable Guix input. Retain it
              ;; in the output's closure without copying the entire tree twice.
              (mkdir-p out)
              (let ((tree #$(local-file admitted-source "admitted-runtime" #:recursive? #t)))
                (for-each (lambda (file)
                            (unless (member file '("." ".."))
                              (symlink (string-append tree "/" file) (string-append out "/" file))))
                          (scandir tree)))
              (mkdir-p bin)
              (mkdir-p units)
              (symlink runtime (string-append bin "/node"))
              (call-with-output-file launcher
                (lambda (port)
                  (format port "#!~a~%exec ~s ~s \"$@\"~%"
                          #$(file-append bash-minimal "/bin/sh")
                          runtime (string-append out "/" #$entry))))
              (chmod launcher #o555)
              (for-each
                (lambda (command)
                  (let ((path (string-append bin "/" (assoc-ref command 'name)))
                        (program (string-append out "/" (assoc-ref command 'program))))
                    (unless (file-exists? program) (error "operator program missing" program))
                    (call-with-output-file path
                      (lambda (port)
                        (format port "#!~a~%exec ~s ~s \"$@\"~%"
                                #$(file-append bash-minimal "/bin/sh") runtime program)))
                    (chmod path #o555)))
                '#$commands)
              (call-with-output-file (string-append bin "/owning-repository-release-only")
                (lambda (port)
                  (format port "#!~a~%echo 'Release through reviewed owning-repository merges and the GitHub Guix machine snapshot.' >&2~%exit 1~%"
                          #$(file-append bash-minimal "/bin/sh"))))
              (chmod (string-append bin "/owning-repository-release-only") #o555)
              (call-with-output-file unit
                (lambda (port)
                  (format port "[Unit]~%Description=~a Guix enterprise deployment~%After=network-online.target~a~%Wants=network-online.target~a~%~%[Service]~%Type=simple~%WorkingDirectory=~a/~a~%ExecStart=~a~%EnvironmentFile=~a~%"
                          #$machine-name
                          (if #$socket (string-append " " #$socket) "")
                          (string-append (if #$socket (string-append " " #$socket) "")
                            (if '#$reverse-tunnel (string-append " " #$machine-name "-ingress.service") ""))
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
              (when '#$reverse-tunnel
                (call-with-output-file (string-append units "/" #$machine-name "-ingress.service")
                  (lambda (port)
                    (format port "[Unit]~%Description=~a private ingress transport~%After=network-online.target~%[Service]~%Type=simple~%ExecStart=~a -NT -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R ~a ~a~%Restart=always~%RestartSec=5~%UMask=0077~%"
                      #$machine-name #$(file-append openssh "/bin/ssh")
                      (cadr '#$reverse-tunnel) (car '#$reverse-tunnel)))))
              ;; Additional services belong to the same immutable generation
              ;; and are installed by the same release transaction.
              (for-each
                (lambda (service)
                  (let* ((name (assoc-ref service 'name))
                         (program (assoc-ref service 'program))
                         (command (string-append out "/" program))
                         (interpreter (if (assoc-ref service 'shell?)
                                          #$(file-append bash-minimal "/bin/bash") runtime)))
                    (unless (file-exists? command) (error "auxiliary program missing" name program))
                    (call-with-output-file (string-append units "/" name)
                      (lambda (port)
                        (format port "[Unit]~%Description=~a Guix deployment~%After=network-online.target~%[Service]~%Type=oneshot~%WorkingDirectory=~a/~a~%ExecStart=~a ~a~%TimeoutStartSec=~a~%UMask=0077~%"
                                name out (assoc-ref service 'directory) interpreter command
                                (or (assoc-ref service 'timeout) "3600"))
                        (when (assoc-ref service 'precheck)
                          (format port "ExecStartPre=~a ~a/~a~%" runtime out (assoc-ref service 'precheck)))
                        (when (assoc-ref service 'memory-high)
                          (format port "MemoryHigh=~a~%" (assoc-ref service 'memory-high)))
                        (when (assoc-ref service 'nice)
                          (format port "Nice=~a~%" (assoc-ref service 'nice)))
                        (for-each (lambda (file) (format port "EnvironmentFile=~a~%" file))
                                  (or (assoc-ref service 'environment-files) '()))
                        (format port "EnvironmentFile=~a/~a.environment~%" units name)))
                    (call-with-output-file (string-append units "/" name ".environment")
                      (lambda (port)
                        (for-each
                          (lambda (pair)
                            (format port "~a=~s~%" (car pair)
                                    (regexp-substitute/global #f "\\{release\\}" (cdr pair) 'pre out 'post)))
                          (append (or (assoc-ref service 'environment) '())
                                  (list (cons "PATH" (string-append out "/bin:/home/emsenn/.local/bin:/usr/local/bin:/usr/bin:/bin")))))))
                    (when (assoc-ref service 'timer)
                      (let ((timer (assoc-ref service 'timer)))
                        (call-with-output-file (string-append units "/" (assoc-ref timer 'name))
                          (lambda (port)
                            (format port "[Unit]~%Description=~a schedule~%[Timer]~%OnBootSec=~a~%OnUnitInactiveSec=~a~%Unit=~a~%Persistent=true~%[Install]~%WantedBy=timers.target~%"
                                    name (assoc-ref timer 'boot) (assoc-ref timer 'interval) name)))))))
                '#$auxiliary-units)
              #t))))
      (home-page "https://561.group")
      (synopsis (string-append machine-name " enterprise deployment"))
      (description
       "An admitted application closure, its Guix interpreter, launcher and service.
Persistent state and credentials remain in the host's existing custody.")
      (license #f))))
