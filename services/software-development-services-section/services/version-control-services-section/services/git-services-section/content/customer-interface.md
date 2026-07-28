# Customer interface

For Git operations over `/home/emsenn/info`, use `request-git-operation`; do not invoke `git` directly.

`request-git-operation --repo /home/emsenn/info --wait-ms 300000 -- status --porcelain`

Every command, including a read, requires the customer's sovereign enterprise
smart account and controller custody through `GIT_ANT_CUSTOMER_ACCOUNT`,
`GIT_ANT_CUSTOMER_CONTROLLER_PRIVATE_KEY`, and `UNION_EVM_CHAIN`. The provider
constructs a typed, exact-request holonomy seam against its own smart account;
both enterprise accounts sign it and the seam is consumed on
`UNION_EVM_HOLONOMY_LEDGER` before device admission. Git Services then opens a
parent-linked child effect cell with the device I/O provider before the
syscall. No unsigned read, JSON grant, policy-file authorization, or fallback
path exists.
