# Lean Blueprint chart service

This package owns the dependency-free reader that joins a Lean declaration
catalog to a Lean Blueprint claim graph. It supplies graph-shape and
Lean-witness findings without importing the retired MetroPlat aggregate.

The reader observes source files only. It does not run Lean or LaTeX and does
not claim that a declaration compiles; callers bind its chart to their own
build and audit gates.
