# @red-cup-engineering/allocate-attention-over-obstructions-service

Selects obstructions to reconcile under an attention budget by greedy benefit-per-cost extension, reporting cost, benefit, residual, and the read-next order.

## Operation

~~~js
export function allocateAttentionOverObstructions(request)
~~~

### Parameters

- request (object): A record with obstructions ([{id, cost, benefit}]) and a budget.

### Returns

object: An AttentionAllocation record.

### Refusals

- TypeError: When obstructions, budget, or an obstruction is malformed.

## Command

allocate-attention-over-obstructions reads one JSON value per input line and writes one JSON value per output line.

## Examples

### budget four

Input:

~~~json
{
  "obstructions": [
    {
      "id": "a",
      "cost": 2,
      "benefit": 4
    },
    {
      "id": "b",
      "cost": 3,
      "benefit": 3
    },
    {
      "id": "c",
      "cost": 1,
      "benefit": 1
    }
  ],
  "budget": 4
}
~~~

Output:

~~~json
{
  "type": "AttentionAllocation",
  "budget": 4,
  "readNext": [
    "a",
    "c"
  ],
  "selected": [
    {
      "id": "a",
      "cost": 2,
      "benefit": 4
    },
    {
      "id": "c",
      "cost": 1,
      "benefit": 1
    }
  ],
  "cost": 3,
  "benefit": 5,
  "residual": 3
}
~~~
