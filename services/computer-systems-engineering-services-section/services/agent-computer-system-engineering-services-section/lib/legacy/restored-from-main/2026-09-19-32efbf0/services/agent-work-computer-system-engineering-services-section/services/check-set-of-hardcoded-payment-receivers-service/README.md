# @red-cup-engineering/check-set-of-hardcoded-payment-receivers-service

Scans files for hardcoded payment receivers with configurable allowlists and recipient distinctions.

## Operation

~~~js
export function findHardcodedPaymentReceivers(request)
~~~

### Parameters

- request (object): A record with files, allowlistPaths, and fieldNames.

### Returns

object: A check result record with violations and status.

### Refusals

- TypeError: When files is not an array.

## Command

check-set-of-hardcoded-payment-receivers reads one JSON value per input line and writes one JSON value per output line.

## Examples

### clean allowlisted file

Input:

~~~json
{
  "files": [
    {
      "path": "test/fixtures/worker.test.mjs",
      "content": "const to = '0x1111111111111111111111111111111111111111';"
    }
  ]
}
~~~

Output:

~~~json
{
  "status": "clean",
  "violations": [],
  "allowlistPaths": [
    "data/records/",
    "test/fixtures/"
  ]
}
~~~

### violation found outside allowlist

Input:

~~~json
{
  "files": [
    {
      "path": "src/route-catalog.mjs",
      "content": "const to = '0x2222222222222222222222222222222222222222';"
    }
  ]
}
~~~

Output:

~~~json
{
  "status": "violations-found",
  "violations": [
    {
      "path": "src/route-catalog.mjs",
      "field": "to",
      "address": "0x2222222222222222222222222222222222222222"
    }
  ],
  "allowlistPaths": [
    "data/records/",
    "test/fixtures/"
  ]
}
~~~
