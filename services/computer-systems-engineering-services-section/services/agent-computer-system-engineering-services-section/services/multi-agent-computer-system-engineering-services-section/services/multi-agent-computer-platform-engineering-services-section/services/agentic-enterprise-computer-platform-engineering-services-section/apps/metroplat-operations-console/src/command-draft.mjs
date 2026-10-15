/** A navigation link prepares a command. Only an explicit send performs it. */
export function commandDraft(search) {
  const line = new URLSearchParams(search).get('command') ?? '';
  return line.length <= 4096 ? line.trim() : '';
}
