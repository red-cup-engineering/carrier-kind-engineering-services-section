"""``pyfars work`` — produce workitem entities for the post-planning spokes.

Each sub-verb emits one substrate entity for one spoke of the work-cycle:

  assign    — dispatch-stage Assignment
  execute   — execution-stage ExecutionEvent (invokes endpoint when target is one)
  track     — tracking-stage Observation
  review    — review-stage Finding
  feedback  — feedback-stage Adjustment

Per Part II of pyfars-algebraic-readings-of-work-terms, the six work-cycle stages
are one Lambek adjunction walked in six directions; each sub-verb produces the
substrate entity that materializes one of those walks. See:
- library/.../predicated-work/objects/{assignment,execution-event,
  observation,finding,adjustment}.md
"""
