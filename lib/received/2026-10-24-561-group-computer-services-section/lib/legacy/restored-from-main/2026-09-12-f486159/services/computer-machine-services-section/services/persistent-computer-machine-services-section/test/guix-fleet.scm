(use-modules (srfi srfi-64)
             (gnu packages)
             (guix packages)
             (guix profiles)
             (five-six-one persistent-machine guix-fleet))

(test-begin "guix-fleet")

(define fixture-service
  (make-service-runtime "fixture"
                        (list (specification->package "hello"))))
(define fixture-machine
  (make-machine-declaration "fixture-machine" "x86_64-linux"
                            'foreign-distro-pack (list fixture-service)))

(test-equal "a machine exposes the packages supplied by its service"
  '("hello")
  (map package-name (machine-declaration-packages fixture-machine)))
(test-assert "a machine compiles to a real Guix manifest"
  (manifest? (machine-declaration-manifest fixture-machine)))
(test-equal "the manifest keeps the service package"
  '("hello")
  (map manifest-entry-name
       (manifest-entries (machine-declaration-manifest fixture-machine))))
(test-equal "Koios service exposes its service-owned runtime package"
  '("koios-news-scheduled-runtime")
  (map package-name (service-runtime-packages koios-news-scheduled-service)))
(test-equal "Go service exposes its engine and its separately-addressed model"
  '("katago-eigen" "katago-network-b6c96")
  (map package-name (service-runtime-packages go-analysis-engine-service)))
(test-assert "a machine cannot hold an empty service list"
  (catch #t
    (lambda ()
      (machine-declaration-manifest
       (make-machine-declaration "invalid" "x86_64-linux"
                                 'foreign-distro-pack '()))
      #f)
    (lambda _ #t)))

(test-end "guix-fleet")
