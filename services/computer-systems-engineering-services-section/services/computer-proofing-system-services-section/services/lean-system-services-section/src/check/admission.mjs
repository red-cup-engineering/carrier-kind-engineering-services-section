/**
 * Fail-closed admission of an actual Lean/Lake compiler result. A zero exit code
 * is necessary, not sufficient: incomplete compiler output or uncleared
 * processes cannot certify what was checked.
 */
export function leanCheckSucceeded({
  timedOut = false,
  exitCode,
  signal = null,
  spawnError = null,
  compilerErrors,
  outputTruncated = false,
  scopeClean = false,
  sourceChanged = false,
} = {}) {
  return timedOut === false &&
    exitCode === 0 &&
    signal === null &&
    spawnError == null &&
    Array.isArray(compilerErrors) && compilerErrors.length === 0 &&
    outputTruncated === false &&
    scopeClean === true &&
    sourceChanged === false;
}
