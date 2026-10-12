# @red-cup-engineering/classify-work-demand-service

Reads one work item's skillful-work type and attention lane off the item itself.

## Operation

~~~js
export function classifyWorkDemand(request)
~~~

### Parameters

- request (object): A record with scope, optional text, and optional grammar parameters.

### Returns

object: A WorkDemand record.

### Refusals

- TypeError: When the scope is not a non-empty string.

## Command

classify-work-demand reads one JSON value per input line and writes one JSON value per output line.

## Examples

### repair-script scope is a Process

Input:

~~~json
{
  "scope": "task:data-custody-lib-y",
  "text": "move data"
}
~~~

Output:

~~~json
{
  "type": "WorkDemand",
  "scope": "task:data-custody-lib-y",
  "workType": "Process",
  "lane": "script",
  "nuclei": {
    "meaningClosed": true,
    "executionClosed": true
  },
  "repairScript": "data-custody",
  "evidence": [
    "scope owned by repair script data-custody: sigma and delta closed"
  ]
}
~~~

### gated friction is a Procedure

Input:

~~~json
{
  "scope": "task:friction-tool-def",
  "text": "it failed"
}
~~~

Output:

~~~json
{
  "type": "WorkDemand",
  "scope": "task:friction-tool-def",
  "workType": "Procedure",
  "lane": "bounded-inference",
  "nuclei": {
    "meaningClosed": true,
    "executionClosed": false
  },
  "repairScript": null,
  "evidence": [
    "friction scope carries its own gate (tool): sigma closed",
    "delta open: no repair script or script path names the execution"
  ]
}
~~~

### bare prose is an Inquiry

Input:

~~~json
{
  "scope": "task:friction-missing-capability-z",
  "text": "decide whether the claim is true"
}
~~~

Output:

~~~json
{
  "type": "WorkDemand",
  "scope": "task:friction-missing-capability-z",
  "workType": "Inquiry",
  "lane": "frontier",
  "nuclei": {
    "meaningClosed": false,
    "executionClosed": false
  },
  "repairScript": null,
  "evidence": [
    "sigma open: no scope kind or command gate names the output",
    "delta open: no repair script or script path names the execution"
  ]
}
~~~
