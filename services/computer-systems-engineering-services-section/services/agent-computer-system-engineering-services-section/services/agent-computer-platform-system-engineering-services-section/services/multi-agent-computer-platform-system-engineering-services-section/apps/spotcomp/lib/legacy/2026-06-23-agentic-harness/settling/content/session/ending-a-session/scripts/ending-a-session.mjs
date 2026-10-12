// ending-a-session — chain morphism for session end.
// Stamps the session with end-t. Persistence of EAVT rows accumulated during
// the session is left to the caller (typically session-driver code) — this
// morphism is the structural close, not the disk-side persistence.

export default function endingASession(input) {
  const { sessionState } = input;
  if (!sessionState) throw new TypeError('ending-a-session: sessionState required');
  const endT = input['end-t'] || new Date().toISOString();
  return { ...sessionState, 'end-t': endT };
}
