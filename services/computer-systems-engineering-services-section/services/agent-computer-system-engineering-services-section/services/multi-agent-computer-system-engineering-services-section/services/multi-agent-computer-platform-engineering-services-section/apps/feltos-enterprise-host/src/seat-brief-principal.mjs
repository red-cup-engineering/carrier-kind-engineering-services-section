/**
 * Determine one institutional character for a seat brief from the host's trusted
 * authenticated account→provider projection. This function does not authenticate
 * any principal and MUST NOT consume untrusted client-selected providers.
 *
 * The account itself may be a character; alternatively its authoritatively
 * admitted organ or signed network-actor binding must supply the character.
 * A missing/ambiguous mapping is not evidence that the caller holds zero seats.
 */
export function canonicalSeatBriefBearer({ account, providers, resolveCharacter }) {
  if (typeof account !== 'string' || account.trim() === '')
    throw new TypeError('seat-brief requires a named authenticated account');
  if (!Array.isArray(providers) || providers[0] !== account || typeof resolveCharacter !== 'function')
    throw new TypeError('seat-brief requires the host-derived provider set for this account');
  const characters = new Map();
  for (const provider of providers) {
    if (typeof provider !== 'string' || provider.trim() === '')
      throw new TypeError('seat-brief provider testimony is malformed');
    const record = resolveCharacter(provider);
    if (record === undefined || record === null) continue;
    if (typeof record.id !== 'string' || !record.id || typeof record.key !== 'string' || !record.key)
      throw new TypeError('seat-brief institutional character record is malformed');
    characters.set(record.key, record);
  }
  if (characters.size !== 1)
    throw new TypeError(characters.size === 0
      ? 'seat-brief: authenticated account has no verified institutional character binding'
      : 'seat-brief: authenticated account has ambiguous institutional character bindings');
  return [...characters.values()][0].id;
}
