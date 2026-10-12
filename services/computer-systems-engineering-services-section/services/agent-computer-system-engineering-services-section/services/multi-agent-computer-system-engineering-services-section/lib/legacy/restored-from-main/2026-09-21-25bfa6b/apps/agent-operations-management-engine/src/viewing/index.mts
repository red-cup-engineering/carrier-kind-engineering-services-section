/**
 * @red-cup-engineering/agent-operations-management-engine/viewing — view-model projections.
 *
 * List, calendar, timeline/Gantt, and table view models — plain data for any
 * renderer. The kanban board view lives in `flowing`.
 */

export {
  listView,
  calendarView,
  timelineView,
  tableView,
} from "./views.mjs";
export type { ListGroup, TimelineBar, TableView } from "./views.mjs";
