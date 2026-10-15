# Conditional provider lifetime

Owner: computer-system-platform capability lifecycle.

CAPABILITY-ENABLED-1: A provider may declare `enabled(capabilities)`. The platform evaluates it exactly once, synchronously, in provider startup order against the immutable snapshot of capabilities established at that moment. It must return a boolean. Missing `enabled` preserves existing behavior. Already started required providers are available; optional providers still starting are absent. No dependency is invented or awaited implicitly.

CAPABILITY-ENABLED-2: False marks the provider disabled, with zero start attempts and no published capability, start, retry or close. A disabled optional provider does not degrade readiness. Later providers see its capability absent and may explicitly disable themselves or fail under their own existing startup contract. Predicates are not reevaluated as capabilities change or an enabled optional provider retries.

CAPABILITY-ENABLED-3: True preserves ordinary required/optional startup, retries and reverse-order cleanup. A nonfunction predicate, a thrown exception or a nonboolean result (including a Promise) is a startup failure, not disablement; the platform fails and releases already started providers under its existing cleanup contract.

FeltOS consumes this conditional lifetime after its supervised runtime establishes schedules and clock configuration. No-clock and probe hosts expose no active work-clock or scheduled worker capability. The runtime still owns and closes a worker constructed during its setup exactly once, including when no scheduled capability is enabled.
