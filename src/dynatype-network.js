var grlib = require('graphlib')
var compLib = require('@buggyorg/component-library').getComponentLibrary()

function isInPort (node) {
  return node['nodeType'] === 'inPort'
}

function isOutPort (node) {
  return node['nodeType'] === 'outPort'
}

function cloneGraph (graph) {
  return grlib.json.read(grlib.json.write(graph))
}

function processOfEdge (edgeName) {
  return edgeName.split('_').slice(0, -2).join('_')
}

function portOfEdge (edgeName) {
  return edgeName.split('_')[2]
}

function getMetaIdentifier (node) {
  return node['meta']
}

function getComponent (metaIdentifier) {
  return compLib[metaIdentifier]
}

export function addTypeConverting (processGraph, convertGraph) {
  var newProcessGraph = cloneGraph(processGraph)
  // Add Translator nodes
  for (let edge of processGraph.edges()) {
    // Translator nodes only exist between Port
    var v = processGraph.node(edge.v)
    var w = processGraph.node(edge.w)
    if ((isInPort(v) || isOutPort(v)) && (isInPort(w) || isOutPort(w))) {
      var labelIn = edge.v
      var labelOut = edge.w
      // get datatypes
      var processV = processOfEdge(labelIn)
      var processW = processOfEdge(labelOut)
      var portNameV = portOfEdge(labelIn)
      var portNameW = portOfEdge(labelOut)
      var metaV = getMetaIdentifier(processGraph.node(processV))
      var metaW = getMetaIdentifier(processGraph.node(processW))
      var typeV = getComponent(metaV)['inputPorts'][portNameV]
      var typeW = getComponent(metaW)['outputPorts'][portNameW]
      // if the types are different add translator
      if (typeV !== typeW) {
        newProcessGraph.removeEdge(labelIn, labelOut)
        var parentV = processGraph.parent(labelIn)
        // datatype translator
        var dijkstra = grlib.alg.dijkstra(convertGraph, typeV)
        var way = [typeW]
        while (way[way.length - 1] !== typeV) {
          way.push(dijkstra[way[way.length - 1]].predecessor)
        }
        for (var k = way.length - 1; k >= 1; k--) {
          var number = way.length - k
          var id = labelIn + ':' + labelOut + '_' + number
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
            newProcessGraph.setEdge(labelIn, id + '_PORT_in')
          } else {
            newProcessGraph.setEdge(labelIn + ':' + labelOut + '_' + (number - 1) + '_PORT_out', id + '_PORT_in')
          }
          // is last translator
          if (k === 1) {
            newProcessGraph.setEdge(id + '_PORT_out', labelOut)
          }
        }
      }
    }
  }
  // fs.writeFileSync('test/fixtures/testgraph.graphlib', JSON.stringify(grlib.json.write(newProcessGraph), null, 2))
  return newProcessGraph
}
