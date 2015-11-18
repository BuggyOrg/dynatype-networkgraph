/*
normal node:
id = name of node
label = motherNode

input-node:
id = id of node + '_IN_' + number
label = input datatype

output-node:
id = id of node + '_OUT_' + number
label = output datatype

translator-node:
id = id of node 1 + ':' + id of node 2 + '_' + number
label = type of node 1 + ':' + type of node 2

translator-input-node:
id = id of translator-node + '_IN_' + number
label = translator_in

translator-output-node:
id = id of translator-node + '_OUT_' + number
label = translator_out

edge from output- to input-node:
label = 'edge'

edge from input- to mother-node:
label = 'motherEdge_in'

edge from mother- to output-node:
label = 'motherEdge_out'

edge from input- to translator-node:
label = 'converterEdge_in'

edge from translator- to output-node:
label = 'converterEdge_out'
*/

export function addTypeConverting (processGraph, convertGraph) {
  var grlib = require('graphlib')
  var newProcessGraph = new grlib.Graph({ directed: true, compound: false, multigraph: true })
  var nodes = processGraph.nodes()
  for (var i = 0; i < processGraph.nodeCount(); i++) {
    newProcessGraph.setNode(nodes[i], processGraph.node(nodes[i]))
  }
  var edges = processGraph.edges()
  for (var l = 0; l < processGraph.edgeCount(); l++) {
    newProcessGraph.setEdge(edges[l].v, edges[l].w, processGraph.edge(edges[l]))
  }
  for (var j = 0; j < processGraph.edgeCount(); j++) {
    if (processGraph.node(edges[j].v) !== 'motherNode' && processGraph.node(edges[j].w) !== 'motherNode' && processGraph.node(edges[j].v) !== 'translator_in' && processGraph.node(edges[j].w) !== 'translator_in' && processGraph.node(edges[j].v) !== 'translator_out' && processGraph.node(edges[j].w) !== 'translator_out') {
      newProcessGraph.removeEdge(edges[j].v, edges[j].w)
      var typeV = processGraph.node(edges[j].v)
      var typeW = processGraph.node(edges[j].w)
      var dijkstra = grlib.alg.dijkstra(convertGraph, typeV)
      var way = [typeW]
      while (way[way.length - 1] !== typeV) {
        way.push(dijkstra[way[way.length - 1]].predecessor)
      }
      for (var k = way.length - 1; k >= 1; k--) {
        var number = way.length - k
        var id = edges[j].v + ':' + edges[j].w + '_' + number
        newProcessGraph.setNode(id, way[k] + ':' + way[k - 1])
        newProcessGraph.setNode(id + '_IN_1', 'translator_in')
        newProcessGraph.setNode(id + '_OUT_1', 'translator_out')
        newProcessGraph.setEdge(id + '_IN_1', id, 'converterEdge_in')
        newProcessGraph.setEdge(id, id + '_OUT_1', 'converterEdge_out')
        if (k === way.length - 1) {
          newProcessGraph.setEdge(edges[j].v, id + '_IN_1', 'edge')
        } else {
          newProcessGraph.setEdge(edges[j].v + ':' + edges[j].w + '_' + (number - 1) + '_OUT_1', id + '_IN_1', 'edge')
        }
        if (k === 1) {
          newProcessGraph.setEdge(id + '_OUT_1', edges[j].w, 'edge')
        }
      }
    }
  }
  console.log(JSON.stringify(newProcessGraph, null, 2))
  return newProcessGraph
}
