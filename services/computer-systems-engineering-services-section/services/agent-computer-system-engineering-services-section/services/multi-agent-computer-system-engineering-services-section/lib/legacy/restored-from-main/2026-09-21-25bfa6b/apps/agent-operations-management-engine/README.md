# @red-cup-engineering/agent-operations-management-engine

Agent operations management — coordinated work execution as one engineering application downstream of the agent and relating substrates.

This package realizes the work-management capabilities that were scattered across the ecosystem — the operations manifold's planning surface, the animating work/governance algebra, the ledger accounting — into one coherent practice whose capability set meets or beats Asana, Todoist, and Odoo.
It does not rewire the downstream consumers; it draws on them as a source of capability and gives that capability a single principled home.

Every carrier holds its facts as cells over minted relating terms and descends to the animating work algebra, so a managed plan is one cell graph, never a private data model.

## The sub-practices

| Module | Capability | Beats |
| --- | --- | --- |
| `structuring` | portfolios, projects, milestones, sections, tasks, subtasks, dependencies (FS/SS/FF/SF), tags; cycle detection; topological order; work-type derivation (inquiry/derivation/procedure/process) | Asana projects, Odoo project WBS |
| `scheduling` | working calendars, recurrence rules (RFC-5545 core), critical-path method (earliest/latest, slack, critical path) | MS-Project / Asana timeline |
| `prioritizing` | priority bands, manual fractional ranking, weighted & WSJF scoring, capacity-bounded sprint selection on the animating linear-budget allocator | Jira backlog, SAFe WSJF |
| `flowing` | workflow statuses as a state machine, kanban boards, WIP limits, cumulative-flow snapshots, charge-valued completion | Jira workflows, kanban |
| `assigning` | assignment **to-office** and δ-dispatch readiness ranking on the animating governance algebra; workload aggregation and balancing | Asana assignees, Odoo HR |
| `governing` | fleet/swarm approval gates settled on the animating bilattice network-sheaf — quorum, multi-reviewer sign-off, contradiction surfaced not averaged | Asana approvals, Odoo sign-off |
| `automating` | when/if/then rules over operation events (pure action emission); recurring-task spawning | Asana Rules, Todoist filters |
| `accounting` | timesheets, estimate-vs-actual, double-entry project budgets on the animating accounting substrate | Harvest, Odoo budgets |
| `reporting` | burndown, burnup, throughput, velocity, cycle/lead time | Jira/Asana dashboards |
| `viewing` | list, calendar, timeline/Gantt, table view models | Asana views |

The root morphism `operate(plan)` reads an operation plan (tasks + dependencies + workflow) into its derived operational state: dependency validity, an execution order, and the flow snapshot.

## Descent to the substrate

- `structuring.asWorkItem(task)` / `structuring.asWorkProject(project, tasks)` — the capability-preserving descent to animating `WorkItem` / `WorkProject`.
- `assigning.assignToOffice(...)
  ` / `assigning.rankOfficeWork(...)
  ` — assignment is to-office; readiness is the δ-residuation proven in animating governance, not a routing board.
- `prioritizing.selectIntoCapacity(...)
  ` — the animating `decide` linear-budget allocator, bound to sprint planning.
- `accounting.budgetStatus(...)
  ` — the animating double-entry books, read as a project budget.

Terms are interned (see `src/terms.mts`): a stable id always yields the same relating carrier, so a managed assignment's office coincides with the office it was built for under relating's reference identity.

## Package-bin transport

Four bins expose pure `document -> document` morphisms (JSON request in, JSON result out), mountable on the operations manifold per the package-bin doctrine:

| Bin | Morphism |
| --- | --- |
| `manage-breakdown` | `operate` a plan: validity, order, flow, work-types |
| `manage-schedule` | critical-path schedule |
| `manage-prioritize` | capacity-bounded selection |
| `manage-report` | burndown / throughput / velocity / durations |

```sh
echo '{"keys":["a","b","c"],"durations":{"a":3,"b":2,"c":4},
       "dependencies":[{"predecessor":"a","successor":"b"},
                       {"predecessor":"a","successor":"c"}]}' \
  | node dist/scripts/schedule.mjs
```

## Build

```sh
pnpm --filter @red-cup-engineering/agent-operations-management-engine run build
pnpm --filter @red-cup-engineering/agent-operations-management-engine run check
```
