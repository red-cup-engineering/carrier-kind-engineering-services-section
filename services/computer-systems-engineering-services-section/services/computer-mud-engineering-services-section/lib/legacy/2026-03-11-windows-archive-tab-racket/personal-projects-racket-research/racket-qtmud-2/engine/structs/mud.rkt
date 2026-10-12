#lang racket

(provide (struct-out universe)
         (struct-out thing))

(struct universe
  (name time schedule things procedures)
  #:mutable)

(struct thing
  (name universe grammar qualities procedures)
  #:mutable)
