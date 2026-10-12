# Chu spaces and the four-valued bilattice

Import the bilattice operations from
`@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge`.

| Charge name | Mathematical reading | Coordinates |
| --- | --- | --- |
| potential | true only | present, absent |
| active | false only | absent, present |
| absurd | neither | absent, absent |
| stable | both | present, present |

```js
import { chargeValue, joinKnowledgeValue }
  from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

joinKnowledgeValue(chargeValue("potential"), chargeValue("active")).name; // stable
```

Chu spaces, duality, transforms, rows, columns, extensions and settlement are defined in
`@lenticule-science/metrologic/articulation/predicating/positing/logic/linear-logic-chu`.
Their matrix entries are charge carriers, retaining evidence through duality.
