import { executeJavascriptNodeCommandAsynchronously } from '@red-cup-engineering/execute-javascript-node-command-service/asynchronously';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

/** Provider interpretation over Code's existing exact asynchronous executor.
 * Receipts, their request environments, and stderr remain inside this boundary.
 */
export function createProviderCommandBoundary({
  executeCommand = executeJavascriptNodeCommandAsynchronously,
  environment = process.env, directory = process.cwd(), exists = existsSync,
} = {}) {
  const executable = name => {
    const dirs = [...(environment.PATH ?? '').split(delimiter).filter(Boolean),
      ...(environment.HOME ? [join(environment.HOME, '.local/bin')] : [])];
    return dirs.map(dir => join(dir, name)).find(path => exists(path)) ?? name;
  };
  async function command(bin, args, overrides = {}) {
    try {
      const receipt = await executeCommand({
        type: 'JavascriptNodeCommandExecutionRequest', version: 1,
        command: executable(bin), arguments: args, directory,
        environment: {...environment, ...overrides}, input: null,
      }, {timeoutMilliseconds: 45_000, outputLimit: 4 * 1024 * 1024});
      const result = receipt?.result;
      if (!result || result.type !== 'JavascriptNodeCommandExecutionResult'
          || result.version !== 1 || typeof result.stdout !== 'string') {
        return {status:'unavailable', reason:'invalid-command-receipt'};
      }
      if (result.status !== 0 || result.signal || result.error) {
        const reason = /ENOENT/u.test(result.error ?? '') ? 'executable-unavailable'
          : /timed out/u.test(result.error ?? '') ? 'provider-timeout' : 'provider-command-failed';
        return {status:'unavailable', reason};
      }
      return {status:'observed', text:result.stdout.trim()};
    } catch {
      return {status:'unavailable', reason:'provider-command-failed'};
    }
  }
  async function jsonCommand(bin, args, overrides = {}) {
    const result = await command(bin, args, overrides);
    if (result.status !== 'observed') return result;
    if (!result.text) return {status:'unavailable', reason:'empty-native-response'};
    try { return {status:'observed', value:JSON.parse(result.text)}; }
    catch { return {status:'unavailable', reason:'invalid-json'}; }
  }
  return Object.freeze({command, jsonCommand});
}
