import { normalizeTufteForm, renderTufteForm, escapeHtml } from '@red-cup-engineering/web-page-tiling-engine/browser';
import { operationInputFields, operationCommand } from '@red-cup-engineering/qwzspace/operation-input';

export function perceivedOperationsHtml(frame, route) {
  return (frame?.situation?.actions ?? []).map((action, index) => {
    const identity = [{ name: 'operation-ref', kind: 'hidden', value: action.ref },
      { name: 'operation-scope', kind: 'hidden', value: action.scope ?? '' }];
    const form = (fields, suffix = '') => renderTufteForm(normalizeTufteForm({
      id: `perceived-operation-${index}${suffix}`, action: route, method: 'post', enhance: false,
      fields: [...identity, ...fields], submitters: [{ label: 'Send operation' }],
    }));
    const input = action.input && action.ref
      ? form(operationInputFields(action)) + `<details><summary>Full JSON input</summary>${form([{ name: 'input-body', kind: 'textarea', label: 'Input as JSON', value: '{}', required: true }], '-json')}</details>`
      : renderTufteForm(normalizeTufteForm({ id: `perceived-command-${index}`, action: route, method: 'post', enhance: false,
          fields: [{ name: 'line', label: 'Command', value: action.command, required: true }], submitters: [{ label: 'Send command' }] }));
    return `<details><summary>${escapeHtml(action.command)}</summary><p>${escapeHtml(action.description)}</p>${action.scope === undefined ? '' : `<p>Scope: ${escapeHtml(action.scope)}</p>`}${input}${action.output ? `<details><summary>Output contract</summary><pre>${escapeHtml(JSON.stringify(action.output, null, 2))}</pre></details>` : ''}</details>`;
  }).join('');
}

/** Posted metadata chooses only among this subject's retained native perceptions. */
export function perceivedCommand(frame, params) {
  if (!params.has('operation-ref')) return String(params.get('line') ?? '').trim();
  const action = frame?.situation?.actions?.find(action => action.ref === params.get('operation-ref') && (action.scope ?? '') === params.get('operation-scope'));
  if (!action) throw new TypeError('This operation is absent from your current perception. Refresh to read available operations.');
  return operationCommand(action, params);
}
