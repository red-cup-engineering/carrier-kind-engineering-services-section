#lang racket

(require "../structs/mud.rkt"
         "../structs/exceptions.rkt")

(provide raise-thing-quality-missing-error
         raise-thing-quality-type-error)

(define (raise-thing-quality-missing-error trigger-procedure
                                           missing-thing
                                           missing-quality)
  (unless (symbol? trigger-procedure)
    (raise-argument-error 'raise-thing-quality-missing-error
                           "symbol?"
                           trigger-procedure))
  (unless (thing? missing-thing)
    (raise-argument-error 'raise-thing-quality-missing-error
                          "thing?"
                          missing-thing))
  (unless (symbol? missing-quality)
    (raise-argument-error 'raise-thing-quality-missing-error
                          "symbol?"
                          missing-quality))
  (raise (exn:qtmud:thing:quality:missing
          (format "~a tried to use ~a's non-existent ~a quality."
                  trigger-procedure
                  (thing-name missing-thing)
                  missing-quality)
          (current-continuation-marks))))

(define (raise-thing-quality-type-error trigger-procedure
                                        errored-thing
                                        errored-quality
                                        expected-type)
  (unless (symbol? trigger-procedure)
    (raise-argument-error 'raise-thing-quality-type-error
                           "symbol?"
                           trigger-procedure))
  (unless (thing? errored-thing)
    (raise-argument-error 'raise-thing-quality-type-error
                          "thing?"
                          errored-thing))
  (unless (symbol? errored-quality)
    (raise-argument-error 'raise-thing-quality-type-error
                          "symbol?"
                          errored-quality))
  (raise (exn:qtmud:thing:quality:type
          (format"~a wanted ~a's quality, but it was the wrong type: expected ~a."
           trigger-procedure
           (thing-name errored-thing)
           errored-quality
           expected-type)
          (current-continuation-marks))))
