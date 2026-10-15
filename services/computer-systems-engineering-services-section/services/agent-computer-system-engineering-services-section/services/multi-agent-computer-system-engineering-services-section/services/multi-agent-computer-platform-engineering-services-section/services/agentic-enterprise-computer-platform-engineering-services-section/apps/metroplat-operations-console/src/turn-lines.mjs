/** A submitted request is a receipt for circulation; completion arrives separately. */
export function turnLines(turn) {
  return [
    ...(turn?.messages ?? []),
    ...(turn?.results ?? []).map(result => result.submitted === true
      ? `↗ Submitted ${result.verb}: ${JSON.stringify({ request: result.request, recipient: result.recipient })}`
      : result.ok === true ? `✓ ${result.verb}: ${JSON.stringify(result.value, null, 2)}`
      : result.ok === false ? `✗ ${result.verb}: ${JSON.stringify(result.error, null, 2)}`
      : `${result.verb ?? 'Result'}: ${JSON.stringify(result, null, 2)}`),
  ];
}
