;; Bare Cedar Fog's development toolchain, entered through the shared Guix
;; machine-service runner and its sibling channel pin.
(use-modules (guix profiles))

(specifications->manifest
 (list "guile"
       "guile-cbor"
       "guile-json"
       "guile-sqlite3"
       "guile-gcrypt"
       "git"
       "sqlite"
       "pkg-config"
       ;; Go engine for the house GTP client (go-engine-services-section).
       "gnugo"))
