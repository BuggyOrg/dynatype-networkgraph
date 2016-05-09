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

function isGeneric (name) {
  return name === 'generic' || name === '[generic]' || name === 'function'
}

function replaceGeneric (what, replacement) {
  if (what === 'function' && typeof (replacement) === 'object') {
    return replacement
  } else if (what !== 'function' && typeof (replacement) === 'string') {
    return replaceAll(what, 'generic', replacement)
  } else {
    return what
  }
}
function genericInputs (graph, node) {
  var genericInputs = []
  if (graph.node(node)['inputPorts'] !== undefined) {
    var inputPorts = graph.node(node)['inputPorts']
    var inputNames = Object.keys(inputPorts)
    for (var i = 0; i < inputNames.length; i++) {
      if (isGeneric(inputPorts[inputNames[i]])) {
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
      if (isGeneric(outputPorts[outputNames[i]])) {
        genericOutputs = genericOutputs.concat([outputNames[i]])
      }
    }
  }
  return genericOutputs
}

function genericInputPorts (graph, node, port) {
  var curNode = graph.node(node)
  if (curNode.inputPorts[port]) {
    return _.filter(genericInputs(graph, node), (follow) => follow === port)
  } else if (!curNode.atomic) {
    return _.filter(genericOutputs(graph, node), (follow) => follow === port)
  } else {
    return genericInputs(graph, node)
  }
}

function genericOutputPorts (graph, node, port) {
  var curNode = graph.node(node)
  if (curNode.outputPorts[port]) {
    return _.filter(genericOutputs(graph, node), (follow) => follow === port)
  } else {
    return _.filter(genericInputs(graph, node), (follow) => follow === port)
  }
}

function followGenerics (graph, node, port) {
  var curNode = graph.node(node)
  if (port && !isGeneric(curNode.inputPorts[port]) && !isGeneric(curNode.outputPorts[port])) {
    return []
  } else {
    return genericInputPorts(graph, node, port)
  }
}

function followGenericsForward (graph, node, port) {
  var curNode = graph.node(node)
  if (port && !isGeneric(curNode.inputPorts[port]) && !isGeneric(curNode.outputPorts[port])) {
    return []
  } else {
    return genericOutputPorts(graph, node, port)
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

/**
 * replaces a generic input port by walking the path back until a non generic is found
 *
 * @param graph the graphlib graph
 * @param node the node from which the generic port should be replaced
 * @param node the port of the input node to follow
 */
export function replaceGenericInput (graph, node) {
  var curNode = graph.node(node)
  var ports
  if (curNode.atomic) {
    ports = curNode.inputPorts
  } else {
    ports = _.merge({}, curNode.inputPorts, curNode.outputPorts)
  }
  return _.filter(_.flatten(_.map(ports, (type, port) =>
    _.map(graphtools.walk.walkBack(graph, {node, port}, followGenerics, {keepPorts: true}),
        (path) =>
          _.reject(path, (n) => n.port === null))))
    , (list) => list.length > 1)
}

export function replaceGenericOutput (graph, node) {
  var curNode = graph.node(node)
  var ports
  if (curNode.atomic) {
    ports = curNode.outputPorts
  } else {
    ports = _.merge({}, curNode.inputPorts, curNode.outputPorts)
  }
  return _.filter(_.flatten(_.map(ports, (type, port) =>
    graphtools.walk.walk(graph, {node, port}, followGenericsForward, {keepPorts: true})))
    , (list) => list.length > 1)
}

export function replaceGenerics (graph) {
  var processGraph = replaceTypeHints(graph)
  var nodes = processGraph.nodes()
  for (var j = 0; j < nodes.length; j++) {
    var paths = replaceGenericInput(graph, nodes[j])
    // var types = ''
    var pathsToReplace = []
    for (let i = 0; i < paths.length; i++) {
      var currentPath = paths[i]
      var type = processGraph.node(currentPath[0].node).outputPorts[currentPath[0].port] ||
        processGraph.node(currentPath[0].node).inputPorts[currentPath[0].port]
      /* if (types === '') {
        types = type
      } else if (type !== types) {
        var error = 'Type mismatch: Two pathes ending in node ' + currentPath[currentPath.length - 1].node + ' have different types: ' + types + ' and ' + type
        throw new Error(error)
      }*/
      if (type === 'generic') {
        pathsToReplace = pathsToReplace.concat([currentPath])
      } else {
        var validType = type
        replacePathGenerics(processGraph, currentPath, type)
      }
    }
    if (validType === undefined && pathsToReplace.length !== 0) {
      var secondInputs = processGraph.node(nodes[j]).inputPorts
      var keys = Object.keys(secondInputs)
      for (let i = 0; i < keys.length; i++) {
        if (secondInputs[keys[i]] !== 'generic') {
          validType = secondInputs[keys[i]]
        }
      }
    }
    if (validType === undefined && pathsToReplace.length !== 0) {
      paths = replaceGenericOutput(graph, nodes[j])
      for (let i = 0; i < paths.length; i++) {
        currentPath = _.filter(paths[i], (node) => node.port !== null)
        type = processGraph.node(currentPath[currentPath.length - 1].node).inputPorts[currentPath[currentPath.length - 1].port] ||
            processGraph.node(currentPath[currentPath.length - 1].node).outputPorts[currentPath[currentPath.length - 1].port]
        if (type === 'generic') {
          pathsToReplace = pathsToReplace.concat([currentPath])
        } else {
          validType = type
          replacePathGenerics(processGraph, currentPath, type)
        }
      }
    }
    if (validType === undefined && pathsToReplace.length !== 0) {
      throw new Error('Generics could not be replaced: No type found.')
    }
    for (let p = 0; p < pathsToReplace.length; p++) {
      replacePathGenerics(processGraph, pathsToReplace[p], validType, pathsToReplace[p][0].port)
    }
  }
  return processGraph
}

function replacePathGenerics (graph, path, type, firstPort) {
  for (var k = 1; k < path.length; k++) {
    var genInput = genericInputs(graph, path[k].node)
    for (var l = 0; l < genInput.length; l++) {
      graph.node(path[k].node).inputPorts[genInput[l]] =
        replaceGeneric(graph.node(path[k].node).inputPorts[genInput[l]], type)
    }
    var genOutput = genericOutputs(graph, path[k].node)
    for (var m = 0; m < genOutput.length; m++) {
      graph.node(path[k].node).outputPorts[genOutput[m]] =
        replaceGeneric(graph.node(path[k].node).outputPorts[genOutput[m]], type)
    }
  }
  if (firstPort !== undefined) {
    graph.node(path[0].node).outputPorts[firstPort] =
      replaceGeneric(graph.node(path[0].node).outputPorts[firstPort], type)
  }
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

export function isGenericFree (graph) {
  var nodes = graph.nodes()
  for (let i = 0; i < nodes.length; i++) {
    var inp = nodes[i].inputPorts
    if (inp !== undefined) {
      var inpKeys = Object.keys(inp)
      for (let j = 0; j < inpKeys.length; j++) {
        if (inp[inpKeys[j]] === 'generic') {
          return false
        }
      }
    }
    var outp = nodes[i].outputPorts
    if (outp !== undefined) {
      var outpKeys = Object.keys(outp)
      for (let j = 0; j < outpKeys.length; j++) {
        if (outp[outpKeys[j]] === 'generic') {
          return false
        }
      }
    }
  }
  return true
}
