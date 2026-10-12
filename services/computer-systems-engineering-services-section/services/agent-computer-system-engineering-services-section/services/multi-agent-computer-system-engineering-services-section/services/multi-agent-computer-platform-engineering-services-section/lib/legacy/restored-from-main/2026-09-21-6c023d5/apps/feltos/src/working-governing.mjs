import { defineCapability } from './capabilities.mjs';
import { runWorkingGoverning } from '../dist/lib/working-governing.mjs';
export { runWorkingGoverning } from '../dist/lib/working-governing.mjs';

/** Transport binding: the same library is callable by an agent or a queued FeltOS command. */
export const workingGoverningCapability = defineCapability({
  id: 'working-governing',
  commands: {
    work(context) {
      let result;
      try { result = runWorkingGoverning(JSON.parse(context.argument)); }
      catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        result = { kind: 'refused', reason: 'invalid-json' };
      }
      return { world: context.world, events: [context.message(context.actor, JSON.stringify(result))] };
    },
  },
});
