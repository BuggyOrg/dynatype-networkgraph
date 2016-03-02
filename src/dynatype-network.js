var grlib = require('graphlib')
// var compLib = require('@buggyorg/component-library').getComponentLibrary()

function isInPort (node) {
  return (node['nodeType'] === 'inPort' && node['isTrans'] === undefined && !node['isTrans'])
}

function isOutPort (node) {
  return (node['nodeType'] === 'outPort' && node['isTrans'] === undefined && !node['isTrans'])
}

function cloneGraph (graph) {
  return grlib.json.read(grlib.json.write(graph))
}

function processOfEdge (edgeName) {
  return edgeName.split('_').slice(0, -2).join('_')
}

function portOfEdge (graph, nodeName) {
  // return edgeName.split('_')[3]
  return graph.node(nodeName)['portName']
}

// function getMetaIdentifier (node) {
//  return node['meta']
// }

// function getComponent (metaIdentifier) {
//   return compLib[metaIdentifier]
// }

// function getInputs (graph, nodeId) {
//  return graph.node(nodeId)['inputPorts']
// }

function getOutputs (graph, nodeId) {
  return graph.node(nodeId)['outputPorts']
}

function getInputs (graph, nodeId) {
  return graph.node(nodeId)['inputPorts']
}

// export function replaceGenerics (processGraph) {
// }

export function addTypeConversion (processGraph, convertGraph) {
  var newProcessGraph = cloneGraph(processGraph)
  // Add Translator nodes
  for (let edge of processGraph.edges()) {
    // Translator nodes only exist between Ports
    var v = processGraph.node(edge.v)
    var w = processGraph.node(edge.w)
    if (isOutPort(v) && isInPort(w)) {
      var labelIn = edge.v
      var labelOut = edge.w
      // get datatypes
      var processV = processOfEdge(labelIn)
      var processW = processOfEdge(labelOut)
      var portNameV = portOfEdge(newProcessGraph, labelIn)
      var portNameW = portOfEdge(newProcessGraph, labelOut)
      // var metaV = getMetaIdentifier(processGraph.node(processV))
      // var metaW = getMetaIdentifier(processGraph.node(processW))
      // var typeV = getComponent(metaV)['outputPorts'][portNameV]
      // var typeW = getComponent(metaW)['inputPorts'][portNameW]

      var typeV = getOutputs(newProcessGraph, processV)[portNameV]
      console.log(getOutputs(newProcessGraph, processW))

      var typeW = getInputs(newProcessGraph, processW)[portNameW]
      console.log(typeW)
      // if the types are different add translator
      if (typeV !== typeW) {
        newProcessGraph.removeEdge(labelIn, labelOut)
        var parentV = processGraph.parent(labelIn)
        // datatype translator
        var dijkstra = grlib.alg.dijkstra(convertGraph, typeV)
        var way = [typeW]
        console.log(typeW)
        while (way[way.length - 1] !== typeV) {
          way.push(dijkstra[way[way.length - 1]].predecessor)
        }
        for (var k = way.length - 1; k >= 1; k--) {
          var number = way.length - k
          var id = labelIn + ':' + labelOut + '_' + number
          // translator nodes
          newProcessGraph.setNode(id, {'nodeType': 'process', 'typeFrom': way[k], 'typeTo': way[k - 1], 'parent': parentV})
          var meta = 'translator/' + way[k] + '_to_' + way[k - 1]
          newProcessGraph.setNode(id, {'nodeType': 'process', 'meta': meta, 'type': 'atomic', 'parent': parentV})
          newProcessGraph.setNode(id + '_PORT_in', {'nodeType': 'inPort', 'portName': 'input', 'isTrans': true})
          newProcessGraph.setNode(id + '_PORT_out', {'nodeType': 'outPort', 'portName': 'output', 'isTrans': true})
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
  // var fs = require('fs')
  // fs.writeFileSync('test/fixtures/testgraph.graphlib', JSON.stringify(grlib.json.write(newProcessGraph), null, 2))
  return newProcessGraph
}
