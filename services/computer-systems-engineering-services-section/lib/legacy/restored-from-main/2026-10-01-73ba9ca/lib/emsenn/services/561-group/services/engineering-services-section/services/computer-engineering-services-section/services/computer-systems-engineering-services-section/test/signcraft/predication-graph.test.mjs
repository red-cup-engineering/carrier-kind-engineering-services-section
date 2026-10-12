import test from 'node:test';
import assert from 'node:assert/strict';
import { cohomologyOfEdgeGraph, componentsOf, firstCohomologyRankOfCells } from '../../src/signcraft/cohomology.mjs';
import { toCount } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";
test('canonical cohomology preserves isolated vertices and cycles', () => {
  const graph = cohomologyOfEdgeGraph(['a','b','c','alone'], [['a','b'],['b','c'],['c','a']]);
  assert.equal(toCount(graph.zeroCohomology.rank), 2);
  assert.equal(toCount(graph.firstCohomology.rank), 1);
  assert.deepEqual(componentsOf(graph).map(component => component.map(term => term.mark.value).sort()), [['a','b','c'],['alone']]);
  assert.equal(toCount(firstCohomologyRankOfCells(graph.cells, graph.entities)), 1);
  const empty = cohomologyOfEdgeGraph(['isolated'], []);
  assert.equal(toCount(empty.zeroCohomology.rank), 1);
  assert.equal(toCount(empty.firstCohomology.rank), 0);
});
