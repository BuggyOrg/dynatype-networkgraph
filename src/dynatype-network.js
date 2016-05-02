var grlib = require('graphlib')
// var graphtools = require('@buggyorg/graphtools')
import _ from 'lodash'
import * as graphtools from '@buggyorg/graphtools'

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

function getOutputs (graph, nodeId) {
  return graph.node(nodeId)['outputPorts']
}

function getInputs (graph, nodeId) {
  return graph.node(nodeId)['inputPorts']
}

var replaceAll = (str, search, replacement) => {
  // improve replacement!!
  var repl = replacement.replace(/\[/g, '').replace(/\]/g, '')
  return str.split(search).join(repl)
}

function genericInputs (graph, node) {
  var genericInputs = []
  if (graph.node(node)['inputPorts'] !== undefined) {
    var inputPorts = graph.node(node)['inputPorts']
    var inputNames = Object.keys(inputPorts)
    for (var i = 0; i < inputNames.length; i++) {
      if (inputPorts[inputNames[i]] === 'generic' || inputPorts[inputNames[i]] === '[generic]') {
        genericInputs = genericInputs.concat([inputNames[i]])
      }
    }
  }
  return genericInputs
}

function genericOutputs (graph, node) {
  var genericOutputs = []
  if (graph.node(node)['outputPorts'] !== undefined) {
    var outputPorts = graph.node(node)['outputPorts']
    var outputNames = Object.keys(outputPorts)
    for (var i = 0; i < outputNames.length; i++) {
      if (outputPorts[outputNames[i]] === 'generic' || outputPorts[outputNames[i]] === '[generic]') {
        genericOutputs = genericOutputs.concat([outputNames[i]])
      }
    }
  }
  return genericOutputs
}

function followGenerics (graph, node, outPort) {
  if (graph.node(node)['outputPorts'][outPort] !== 'generic') {
    return []
  } else {
    return genericInputs(graph, node)
  }
}

function replaceTypeHints (graph) {
  var editGraph = graphtools.utils.edit(graph)
  _.merge(editGraph, {nodes: _.map(editGraph.nodes, (n) => {
    if (!n.value.id) { return n }
    return _.merge({}, n, { value: {
      inputPorts: _.mapValues(n.value.inputPorts, (p, k) => (n.value.typeHint && n.value.typeHint[k]) ? n.value.typeHint[k] : p),
      outputPorts: _.mapValues(n.value.outputPorts, (p, k) => (n.value.typeHint && n.value.typeHint[k]) ? n.value.typeHint[k] : p)
    }})
  })})
  return graphtools.utils.finalize(editGraph)
}

export function replaceGenerics (graph) {
  var processGraph = replaceTypeHints(graph)
  var nodes = processGraph.nodes()
  for (var j = 0; j < nodes.length; j++) {
    var genericPorts = genericInputs(processGraph, nodes[j])
    var paths = []
    for (let i = 0; i < genericPorts.length; i++) {
      var predecessor = graphtools.walkPort.predecessor(processGraph, nodes[j], genericPorts[i])[0]
      var outPort = graphtools.walkPort.predecessorPort(processGraph, nodes[j], genericPorts[i])[0]
      var walk = _.map(graphtools.walkPort.walkBack(processGraph, predecessor, followGenerics, outPort), (e) => e.concat([nodes[j]]))
      paths = paths.concat(walk)
    }
    var types = ''
    var path = []
    for (var i = 0; i < paths.length; i++) {
      var currentPath = paths[i]
      if (currentPath.length >= 2) {
        path = currentPath
        var genericInput = genericInputs(processGraph, currentPath[1])
        var outputs = graphtools['walkPort'].predecessorPort(processGraph, currentPath[1], genericInput[0])
        var type = processGraph.node(currentPath[0])['outputPorts'][outputs[0]]
        // TODO currentPath[0] ist nicht umbedingt vorgänger von genericInput[0]
        if (type === undefined) {
          console.log('path', currentPath)
          console.log('node', nodes[j])
          console.log('genericInput', genericInput)
          console.log('prevNode', currentPath[0])
          console.log('outputs', outputs)
          console.log('type', type)
        }
        if (types === '') {
          types = type
        } else if (type !== types) {
          var error = 'Type mismatch: Two pathes ending in node ' + currentPath[currentPath.length - 1] + ' have different types: ' + types + ' and ' + type
          throw new Error(error)
        }
      }
    }
    if (path !== []) {
      for (var k = 1; k < path.length; k++) {
        genericInput = genericInputs(processGraph, path[k])
        for (var l = 0; l < genericInput.length; l++) {
          processGraph.node(path[k])['inputPorts'][genericInput[l]] =
            replaceAll(processGraph.node(path[k])['inputPorts'][genericInput[l]], 'generic', type)
        }
        var genericOutput = genericOutputs(processGraph, path[k])
        for (var m = 0; m < genericOutput.length; m++) {
          processGraph.node(path[k])['outputPorts'][genericOutput[m]] =
            replaceAll(processGraph.node(path[k])['outputPorts'][genericOutput[m]], 'generic', type)
        }
      }
    }
  }
  return processGraph
}

export function addTypeConversion (processGraph, convertGraph) {
  var newProcessGraph = cloneGraph(processGraph)
  // Add Translator nodes
  for (let edge of newProcessGraph.edges()) {
    // Translator nodes only exist between Ports
    var v = newProcessGraph.node(edge.v)
    var w = newProcessGraph.node(edge.w)
    if (isOutPort(v) && isInPort(w)) {
      var labelIn = edge.v
      var labelOut = edge.w
      // get datatypes
      var processV = processOfEdge(labelIn)
      var processW = processOfEdge(labelOut)
      var portNameV = portOfEdge(newProcessGraph, labelIn)
      var portNameW = portOfEdge(newProcessGraph, labelOut)
      var typeV = getOutputs(newProcessGraph, processV)[portNameV]
      var typeW = getInputs(newProcessGraph, processW)[portNameW]

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
          // newProcessGraph.setNode(id, {'nodeType': 'process', 'typeFrom': way[k], 'typeTo': way[k - 1]})
          var meta = 'translator/' + way[k] + '_to_' + way[k - 1]
          newProcessGraph.setNode(id, {'nodeType': 'process', 'id': meta, 'atomic': 'true'})
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
  return newProcessGraph
}
