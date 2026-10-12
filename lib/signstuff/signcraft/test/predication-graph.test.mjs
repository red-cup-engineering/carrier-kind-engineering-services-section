import test from 'node:test';
import assert from 'node:assert/strict';
import { cohomologyOfEdgeGraph, componentsOf, firstCohomologyRankOfCells } from '@red-cup-engineering/signgraph/cohomology';
test('canonical cohomology preserves isolated vertices and cycles', () => {
  const graph = cohomologyOfEdgeGraph(['a','b','c','alone'], [['a','b'],['b','c'],['c','a']]);
  assert.equal(graph.zeroCohomology.rank, 2);
  assert.equal(graph.firstCohomology.rank, 1);
  assert.deepEqual(componentsOf(graph).map(component => component.map(term => String(term)).sort()), [['a','b','c'],['alone']]);
  assert.equal(firstCohomologyRankOfCells(graph.cells, graph.entities), 1);
  const empty = cohomologyOfEdgeGraph(['isolated'], []);
  assert.equal(empty.zeroCohomology.rank, 1);
  assert.equal(empty.firstCohomology.rank, 0);
});
