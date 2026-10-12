# SignStuff

The SignStuff libraries carry the existing SignStuff computation independently
of the engineering departments that organize its development:

- `@red-cup-engineering/signcell`: semiotic cells, evidence and data specializations. SignCell is the data facet of the substrate, so its one home is computer-data-engineering-services-section (`apps/signcell`); this directory holds the other three.
- `@red-cup-engineering/signchain`: witnessed rules, evidence order and contracts.
- `@red-cup-engineering/signgraph`: sites, valuations, transport, graphs and projections.
- `@red-cup-engineering/signcraft`: settlement, history, inference and presentations.

Each library's `package.json` declares its actual public entrypoints and
runtime providers. Its `src/README.md` retains the implementation's theoretical
account. Source and required source assets form the library payload; nested
enterprises, services, deployments and institutional records are separate carriers.

For example, a contradictory observation remains affirmed and denied through
settlement; neither side of its evidence is discarded:

```js
import { cell, told } from '@red-cup-engineering/signcell/cell';
import { settleCells } from '@red-cup-engineering/signcraft/settle';

const observed = cell('example', 'observed', 'example', {
  for: ['observation'], against: ['counter-observation'],
});
const result = settleCells([observed]);
console.log(told(result.settled[0])); // [true, true]
```

AOE's communicating descent consumes these libraries directly. SignCraft
history retains content-addressed observations across serialization and reload.
The library boundaries do not establish that a consuming service is deployed:
its release and operating receiving conditions still need their own evidence.
