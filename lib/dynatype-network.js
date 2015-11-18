'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.addTypeConverting = addTypeConverting;

function addTypeConverting(processGraph, convertGraph) {
  var grlib = require('graphlib');
  var newProcessGraph = new grlib.Graph({ directed: true, compound: false, multigraph: true });
  var nodes = processGraph.nodes();
  for (var i = 0; i < processGraph.nodeCount(); i++) {
    newProcessGraph.setNode(nodes[i], processGraph.node(nodes[i]));
  }
  var edges = processGraph.edges();
  for (var j = 0; j < processGraph.edgeCount(); j++) {
    if (processGraph.node(edges[j].v) !== 'motherNode' && processGraph.node(edges[j].w) !== 'motherNode') {
      var typeV = processGraph.node(edges[j].v);
      var typeW = processGraph.node(edges[j].w);
      var dijkstra = grlib.alg.dijkstra(convertGraph, typeV);
      var way = [typeW];
      while (way[way.length - 1] !== typeV) {
        way.push(dijkstra[way[way.length - 1]].predecessor);
      }
      for (var k = way.length - 1; k >= 1; k--) {
        newProcessGraph.setNode(edges[j].v + ':' + edges[j].w + '_' + k, way[k] + ':' + way[k - 1]);
      }
    }
  }
  return newProcessGraph;
}