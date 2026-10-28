(define-module (five-six-one persistent-machine guix-fleet)
  #:use-module (srfi srfi-1)
  #:use-module (srfi srfi-9)
  #:use-module (guix packages)
  #:use-module (guix profiles)
  #:use-module (lib emsenn services 561-group services public-services-section services public-social-services-section services public-media-services-section services media-services-section services public-news-media-services-section services koios-news koios-news)
  #:use-module (lib emsenn services 561-group services engineering-services-section services computer-engineering-services-section services computer-systems-engineering-services-section services computer-game-system-services-section services go-engine-services-section go-engine)
  #:export (make-service-runtime service-runtime?
            service-runtime-name service-runtime-packages
            make-machine-declaration machine-declaration?
            machine-declaration-name machine-declaration-system
            machine-declaration-realization machine-declaration-services
            machine-declaration-manifest machine-declaration-packages
            koios-news-scheduled-service go-analysis-engine-service))

;; Guix owns the timeless executable closure.  A service names the real Guix
;; packages that carry its app and scripts; a machine names the services it
;; realizes.  Scheduling, credentials, network placement, capacity, and
;; activation are temporal effects and therefore remain in their owning
;; operations rather than being fabricated as fields in a Guix declaration.
(define-record-type <service-runtime>
  (make-service-runtime name packages) service-runtime?
  (name service-runtime-name)
  (packages service-runtime-packages))

(define-record-type <machine-declaration>
  (make-machine-declaration name system realization services) machine-declaration?
  (name machine-declaration-name)
  (system machine-declaration-system)
  (realization machine-declaration-realization)
  (services machine-declaration-services))

(define (non-empty-string? value)
  (and (string? value) (not (string-null? value))))

(define (valid-service-runtime? service)
  (and (service-runtime? service)
       (non-empty-string? (service-runtime-name service))
       (list? (service-runtime-packages service))
       (not (null? (service-runtime-packages service)))
       (every package? (service-runtime-packages service))))

(define (assert-machine-declaration declaration)
  (unless (and (machine-declaration? declaration)
               (non-empty-string? (machine-declaration-name declaration))
               (non-empty-string? (machine-declaration-system declaration))
               (memq (machine-declaration-realization declaration)
                     '(foreign-distro-pack guix-system))
               (list? (machine-declaration-services declaration))
               (not (null? (machine-declaration-services declaration)))
               (every valid-service-runtime?
                      (machine-declaration-services declaration)))
    (error "invalid machine declaration" declaration))
  declaration)

(define (machine-declaration-packages declaration)
  (assert-machine-declaration declaration)
  (append-map service-runtime-packages
              (machine-declaration-services declaration)))

(define (machine-declaration-manifest declaration)
  (assert-machine-declaration declaration)
  ;; This is a real Guix manifest.  `guix pack -m` and `guix shell -m` accept
  ;; it directly, so a machine declaration is executable rather than a plan
  ;;-shaped association list.
  (packages->manifest (machine-declaration-packages declaration)))

;; These are the current service-owned runtime closures.  Neither is assigned
;; to a particular machine here: host placement is an observed operations
;; decision, not an assumption embedded in the closure model.
(define koios-news-scheduled-service
  (make-service-runtime
   "koios-news-scheduled-runtime"
   (list (koios-news-scheduled-runtime-package))))

(define go-analysis-engine-service
  (make-service-runtime
   "go-analysis-engine"
   (list (katago-eigen-package)
         (katago-network-b6c96-package))))
