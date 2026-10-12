#lang racket

(provide (struct-out exn:qtmud:thing:quality:missing)
         (struct-out exn:qtmud:thing:quality:type))

(struct exn:qtmud:thing:quality:missing exn:fail ())

(struct exn:qtmud:thing:quality:type exn:fail ())
