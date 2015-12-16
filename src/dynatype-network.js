export function addTypeConverting (processGraph, convertGraph) {
  var fs = require('fs')
  var compLib = '../component-library/meta/'
  var grlib = require('graphlib')
  var newProcessGraph = processGraph
  var edges = processGraph.edges()
  // Add Translator nodes
  var edgeCount = processGraph.edgeCount()
  for (var j = 0; j < edgeCount; j++) {
    // Translator nodes only exist between Port
    if ((processGraph.node(edges[j].v)['nodeType'] === 'inPort' || processGraph.node(edges[j].v)['nodeType'] === 'outPort') && (processGraph.node(edges[j].w)['nodeType'] === 'inPort' || processGraph.node(edges[j].w)['nodeType'] === 'outPort')) {
      // get datatypes
      var processV = edges[j].v.substring(0, edges[j].v.indexOf('_', 2))
      var processW = edges[j].w.substring(0, edges[j].w.indexOf('_', 2))
      var portNameV = edges[j].v.substring(edges[j].v.lastIndexOf('_') + 1)
      var portNameW = edges[j].w.substring(edges[j].w.lastIndexOf('_') + 1)
      var metaV = newProcessGraph.node(processV)['meta']
      var metaW = newProcessGraph.node(processW)['meta']
      var typeV
      var typeW
      if (processGraph.node(edges[j].v)['nodeType'] === 'inPort') {
        typeV = JSON.parse(fs.readFileSync(compLib + metaV + '.json'))['inputPorts'][portNameV]
      } else {
        typeV = JSON.parse(fs.readFileSync(compLib + metaV + '.json'))['outputPorts'][portNameV]
      }
      if (processGraph.node(edges[j].w)['nodeType'] === 'inPort') {
        typeW = JSON.parse(fs.readFileSync(compLib + metaW + '.json'))['inputPorts'][portNameW]
      } else {
        typeW = JSON.parse(fs.readFileSync(compLib + metaW + '.json'))['outputPorts'][portNameW]
      }
      // if the types are different add translator
      if (typeV !== typeW) {
        newProcessGraph.removeEdge(edges[j].v, edges[j].w)
        var parentV = processGraph.parent(edges[j].v)
        // datatype translator
        var dijkstra = grlib.alg.dijkstra(convertGraph, typeV)
        var way = [typeW]
        while (way[way.length - 1] !== typeV) {
          way.push(dijkstra[way[way.length - 1]].predecessor)
        }
        for (var k = way.length - 1; k >= 1; k--) {
          var number = way.length - k
          var id = edges[j].v + ':' + edges[j].w + '_' + number
          // translator nodes
          newProcessGraph.setNode(id, {'nodeType': 'translator', 'typeFrom': way[k], 'typeTo': way[k - 1], 'parent': parentV})
          newProcessGraph.setNode(id + '_PORT_in', {'nodeType': 'inPort_trans', 'portName': 'in'})
          newProcessGraph.setNode(id + '_PORT_out', {'nodeType': 'outPort_trans', 'portName': 'out'})
          // translator edges
          newProcessGraph.setEdge(id + '_PORT_in', id)
          newProcessGraph.setEdge(id, id + '_PORT_out')
          // set parents  TODO: parent ok?
          newProcessGraph.setParent(id, parentV)
          newProcessGraph.setParent(id + '_PORT_in', parentV)
          newProcessGraph.setParent(id + '_PORT_out', parentV)
          // edges between translators and between processes and translators
          // is first translator
          if (k === way.length - 1) {
            newProcessGraph.setEdge(edges[j].v, id + '_PORT_in')
          } else {
            newProcessGraph.setEdge(edges[j].v + ':' + edges[j].w + '_' + (number - 1) + '_PORT_out', id + '_PORT_in')
          }
          // is last translator
          if (k === 1) {
            newProcessGraph.setEdge(id + '_PORT_out', edges[j].w)
          }
        }
      }
    }
  }
  // fs.writeFileSync('test/fixtures/testgraph.graphlib', JSON.stringify(grlib.json.write(newProcessGraph), null, 2))
  return newProcessGraph
}
