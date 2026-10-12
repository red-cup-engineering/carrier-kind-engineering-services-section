# @red-cup-engineering/agent-skill-description-engineering-services-section

Admits bounded discovery descriptions that let an agent harness recognize when a `SKILL.md` applies.

## Operation

```js
export function admitAgentSkillDescription(value, { body, neighborDescriptions = [] } = {})
```

The operation imports the generic description admission contract, then requires recognizable work or artifact production, request conditions or scope, fidelity to the instructional body, and separation from supplied neighboring skill descriptions. It admits either one or several sentences, but refuses LF, CR, CRLF, U+2028, and U+2029.
