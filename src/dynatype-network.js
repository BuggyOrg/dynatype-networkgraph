var grlib = require('graphlib')
// var graphtools = require('@buggyorg/graphtools')
import _ from 'lodash'
import * as graphtools from '@buggyorg/graphtools'
var utils = graphtools.utils

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
  var repl = replacement
  return str.split(search).join(repl)
}

function isGeneric (name) {
  return name === 'generic' || name === '[generic]'
}

export function replaceGeneric (what, replacement) {
  if (what === 'function' && typeof (replacement) === 'object') {
    return replacement
  } else if (what !== 'function' && typeof (replacement) === 'string') {
    return replaceAll(what, 'generic', replacement)
  } else {
    return what
  }
}

function entangleType (type, template) {
  if (template[0] === '[' && template[template.length - 1] === ']') {
    if (typeof (type) === 'object' && type.type === 'type-ref') {
      return _.merge({}, type, {template})
    }
    return type.replace(/\[/g, '').replace(/\]/g, '')
  } else {
    return type
  }
}

function tangleType (type, template) {
  if (template[0] === '[' && template[template.length - 1] === ']') {
    if (typeof (type) === 'object' && type.type === 'type-ref') {
      return type
    }
    return '[' + type + ']'
  } else {
    return type
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
  } else if (!curNode.atomic && !curNode.recursive) {
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
  graph = replaceGenericsInternal(graph)
  var typeRefs = determineTypeReferences(graph)
  applyKnownTypeRefs(graph, typeRefs)
  replaceUnkownTypeReferences(graph)
  graph = replaceGenericsInternal(graph)
  return graph
}

function replaceGenericsInternal (graph) {
  var processGraph = replaceTypeHints(graph)
  var nodes = processGraph.nodes()
  for (var j = 0; j < nodes.length; j++) {
    var paths = replaceGenericInput(processGraph, nodes[j])
    var pathsToReplace = []
    var validType = null
    for (let i = 0; i < paths.length; i++) {
      var currentPath = paths[i]
      var type = processGraph.node(currentPath[0].node).outputPorts[currentPath[0].port] ||
        processGraph.node(currentPath[0].node).inputPorts[currentPath[0].port]
      if (isGeneric(type)) {
        pathsToReplace = pathsToReplace.concat([currentPath])
      } else {
        validType = type
        // finds the type backwards
        replacePathGenerics(processGraph, currentPath, type)
      }
    }
    if (!validType && pathsToReplace.length !== 0) {
      var secondInputs = processGraph.node(nodes[j]).inputPorts
      var keys = Object.keys(secondInputs)
      for (let i = 0; i < keys.length; i++) {
        if (secondInputs[keys[i]] !== 'generic') {
          // takes the type of another input
          if (validType !== undefined && validType !== secondInputs[keys[i]]) {
            var error = 'Type mismatch: Two pathes to node ' + nodes[j] + ' have different types: ' + validType + ' and ' + secondInputs[keys[i]] + '.'
            throw new Error(error)
          }
          validType = secondInputs[keys[i]]
        }
      }
    }
    if (!validType) {
      paths = replaceGenericOutput(processGraph, nodes[j])
      for (let i = 0; i < paths.length; i++) {
        currentPath = _.filter(paths[i], (node) => node.port !== null)
        var lastPathItem = _.last(currentPath)
        type = utils.portType(processGraph, lastPathItem.node, lastPathItem.port)
        if (type === 'generic') {
          pathsToReplace = pathsToReplace.concat([currentPath])
        } else if (!isTypeRef(type)) {
          validType = type
          // finds the type forwards
          replacePathGenericsForward(processGraph, currentPath, validType)
        }
      }
    }

    if (!validType && pathsToReplace.length !== 0) {
      throw new Error('Generics could not be replaced: No type found.')
    }
    for (let p = 0; p < pathsToReplace.length; p++) {
      // takes the type of the second input
      replacePathGenericsForward(processGraph, pathsToReplace[p], validType)
    }
  }
  return processGraph
}

function isTypeRef (type) {
  return typeof (type) === 'object' && type.type === 'type-ref'
}

function determineTypeReferences (graph) {
  return _(graph.edges())
    .map((e) => _.merge({}, e, {value: graph.edge(e)}))
    .filter((e) => isTypeRef(utils.portType(graph, e.v, e.value.outPort)) && !isTypeRef(utils.portType(graph, e.w, e.value.inPort)) ||
      isTypeRef(utils.portType(graph, e.w, e.value.inPort)) && !isTypeRef(utils.portType(graph, e.v, e.value.outPort)))
    .reject((e) => isGeneric(utils.portType(graph, e.v, e.value.outPort)) ||
      isGeneric(utils.portType(graph, e.w, e.value.inPort)))
    .map((e) => {
      var vTypeNode = isTypeRef(utils.portType(graph, e.v, e.value.outPort))
      return {
        refNode: (vTypeNode) ? e.v : e.w,
        refPort: (vTypeNode) ? e.value.outPort : e.value.inPort,
        reference: (vTypeNode) ? utils.portType(graph, e.v, e.value.outPort) : utils.portType(graph, e.w, e.value.inPort),
        type: (vTypeNode) ? utils.portType(graph, e.w, e.value.inPort) : utils.portType(graph, e.v, e.value.outPort)
      }
    })
    .value()
}

function applyKnownTypeRefs (graph, typeRefs) {
  _(typeRefs)
  .each((r) => {
    var node = graph.node(r.refNode)
    var oNode = graph.node(r.reference.node)
    node[utils.portDirectionType(graph, r.refNode, r.refPort)][r.refPort] = r.type
    oNode[utils.portDirectionType(graph, r.reference.node, r.reference.port)][r.reference.port] = r.type
    graph.setNode(r.refNode, _.cloneDeep(node))
    graph.setNode(r.reference.node, _.cloneDeep(oNode))
  })
}

function replaceUnkownTypeReferences (graph) {
  _(graph.nodes())
    .map((n) => graph.node(n))
    .each((n) => {
      replacePortReferences(graph, n, 'inputPorts')
      replacePortReferences(graph, n, 'outputPorts')
    })
}

function replacePortReferences (graph, node, portType) {
  node[portType] = _.mapValues(node[portType], (type, key) => {
    if (isTypeRef(type)) {
      return graph.node(type.node)[utils.portDirectionType(graph, type.node, type.port)][type.port]
    }
    return type
  })
  graph.setNode(node.branchPath, _.cloneDeep(node))
}

function replacePathGenericsForward (graph, path, type) {
  for (var r = path.length - 1; r >= 0; r--) {
    // takes the parameter type if it's defined
    if (r === path.length - 1 && type !== undefined) {
      var genInput = genericInputs(graph, path[r].node)
      var genOutput = genericOutputs(graph, path[r].node)
      graph.node(path[r].node).generic = true
      graph.node(path[r].node).genericType = type
      for (let l = 0; l < genInput.length; l++) {
        graph.node(path[r].node).inputPorts[genInput[l]] =
          tangleType(graph.node(path[r].node).genericType, graph.node(path[r].node).inputPorts[genInput[l]])
      }
      for (let l = 0; l < genOutput.length; l++) {
        graph.node(path[r].node).outputPorts[genOutput[l]] =
          tangleType(graph.node(path[r].node).genericType, graph.node(path[r].node).outputPorts[genOutput[l]])
      }
    }
    if ((r > 0 || type !== undefined) && path[r].edge) {
      var toNode = graph.node(path[r].edge.to)
      var toType = (graph.parent(path[r].edge.from) === path[r].edge.to) ? toNode.outputPorts[path[r].edge.inPort] : toNode.inputPorts[path[r].edge.inPort]
      if (isGeneric(toType)) {
        if (!toNode.generic || !toNode.genericType) {
          throw new Error('Cannot resolve generic type for ' + path[r].edge.to + ' on path ' + JSON.stringify(path))
        }
        toType = tangleType(toNode.genericType, toType)
        toNode[utils.portDirectionType(graph, path[r].edge.to, path[r].edge.inPort)][path[r].edge.inPort] = toType
      }
      var fromNode = graph.node(path[r].edge.from)
      var fromType = (graph.parent(path[r].edge.to) === path[r].edge.from) ? fromNode.inputPorts[path[r].edge.outPort] : fromNode.outputPorts[path[r].edge.outPort]
      var entangled = (fromNode.atomic) ? (fromNode.genericType || entangleType(toType, fromType)) : entangleType(toType, fromType)
      if (isGeneric(fromType)) {
        if (fromNode.genericType !== undefined && fromNode.atomic && fromNode.genericType !== entangleType(toType, fromType) &&
          !isTypeRef(utils.portType(graph, path[r].edge.from, path[r].edge.outPort)) &&
          !isTypeRef(utils.portType(graph, path[r].edge.to, path[r].edge.inPort))) {
          var error = 'Type mismatch: Two pathes to node ' + path[r].edge.from + ' have different types: ' + JSON.stringify(fromNode.genericType) + ' and ' + JSON.stringify(entangleType(toType, fromType)) + '.'
          throw new Error(error)
        }
        fromNode.generic = true
        fromNode.genericType = entangled
        fromNode[utils.portDirectionType(graph, path[r].edge.from, path[r].edge.outPort)][path[r].edge.outPort] = tangleType(entangled, fromType)
      }
    }
  }
  var firstNode = path[0].node
  genInput = genericInputs(graph, firstNode)
  for (let l = 0; l < genInput.length; l++) {
    graph.node(firstNode)[utils.portDirectionType(graph, firstNode, genInput[l])][genInput[l]] =
      tangleType(graph.node(firstNode).genericType, graph.node(firstNode)[utils.portDirectionType(graph, firstNode, genInput[l])][genInput[l]])
  }
}

function replacePathGenerics (graph, path, type) {
  for (var r = 0; r < path.length - 1; r++) {
    var fromNode = graph.node(path[r].edge.from)
    var fromType = fromNode[utils.portDirectionType(graph, path[r].edge.from, path[r].edge.outPort)][path[r].edge.outPort]
    // if the output of this node is not yet set
    if (isGeneric(fromType)) {
      // there should be some other path that should have assigned the generic type
      if (!fromNode.generic || !fromNode.genericType) {
        throw new Error('Cannot resolve generic type for ' + path[r].edge.from + ' on path ' + JSON.stringify(path))
      }
      fromType = tangleType(fromNode.genericType, fromType)
      fromNode[utils.portDirectionType(graph, path[r].edge.from, path[r].edge.outPort)][path[r].edge.outPort] = fromType
    }
    var toNode = graph.node(path[r].edge.to)
    var toType = toNode[utils.portDirectionType(graph, path[r].edge.to, path[r].edge.inPort)][path[r].edge.inPort]
    var entangled = toNode.genericType || entangleType(fromType, toType)
    if (isGeneric(toType)) {
      if (toNode.genericType !== undefined && toNode.genericType !== entangleType(fromType, toType) &&
          !isTypeRef(utils.portType(graph, path[r].edge.from, path[r].edge.outPort)) &&
          !isTypeRef(utils.portType(graph, path[r].edge.to, path[r].edge.inPort)) &&
          !isTypeRef(toNode.genericType)) {
        var error = 'Type mismatch: Two pathes to node ' + path[r].edge.to + ' have different types: ' + JSON.stringify(toNode.genericType) + ' and ' + JSON.stringify(entangleType(fromType, toType)) + '.'
        throw new Error(error)
      }
      if (isTypeRef(toNode.genericType)) {
        entangled = entangleType(fromType, toType)
      }
      toNode.generic = true
      toNode.genericType = entangled
      toNode[utils.portDirectionType(graph, path[r].edge.to, path[r].edge.inPort)][path[r].edge.inPort] = tangleType(entangled, toType)
    }
  }
  var lastNode = path[path.length - 1].node
  var genOutput = genericOutputs(graph, lastNode)
  for (var l = 0; l < genOutput.length; l++) {
    graph.node(lastNode)[utils.portDirectionType(graph, lastNode, genOutput[l])][genOutput[l]] =
      tangleType(graph.node(lastNode).genericType, graph.node(lastNode)[utils.portDirectionType(graph, lastNode, genOutput[l])][genOutput[l]])
  }
  /* for (var k = 1; k < path.length; k++) {
    var curNode = graph.node(path[k].node)
    var curPort = curNode.inputPorts[path[k].port]
    if (!curPort) {
      if (curNode.outputPorts[path[k].port] && curNode.genericType) {
        curType = tangleType(curNode.genericType, curNode.outputPorts[path[k].port])
      }
      continue
    }
    curNode.genericType = entangleType(curType, curPort)
    curNode.generic = true
    curType = curNode.genericType
    var genInput = genericInputs(graph, path[k].node)
    for (var l = 0; l < genInput.length; l++) {
      curNode.inputPorts[genInput[l]] =
        replaceGeneric(curNode.inputPorts[genInput[l]], curNode.genericType)
    }
    var genOutput = genericOutputs(graph, path[k].node)
    for (var m = 0; m < genOutput.length; m++) {
      curNode.outputPorts[genOutput[m]] =
        replaceGeneric(curNode.outputPorts[genOutput[m]], curNode.genericType)
    }
  }
  if (firstPort !== undefined) {
    graph.node(path[0].node).generic = true
    graph.node(path[0].node).outputPorts[firstPort] =
      replaceGeneric(graph.node(path[0].node).outputPorts[firstPort], type)
  }*/
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

export function genericNodes (graph) {
  var nodes = graph.nodes()
  var genNodes = []
  for (let i = 0; i < nodes.length; i++) {
    var inp = graph.node(nodes[i]).inputPorts
    if (inp !== undefined) {
      var inpKeys = Object.keys(inp)
      for (let j = 0; j < inpKeys.length; j++) {
        if (isGeneric(inp[inpKeys[j]])) {
          genNodes.push(nodes[i])
        }
      }
    }
    var outp = graph.node(nodes[i]).outputPorts
    if (outp !== undefined) {
      var outpKeys = Object.keys(outp)
      for (let j = 0; j < outpKeys.length; j++) {
        if (isGeneric(outp[outpKeys[j]])) {
          genNodes.push(nodes[i])
        }
      }
    }
  }
  return genNodes
}

export function isGenericFree (graph) {
  var nodes = graph.nodes()
  for (let i = 0; i < nodes.length; i++) {
    var inp = graph.node(nodes[i]).inputPorts
    if (inp !== undefined) {
      var inpKeys = Object.keys(inp)
      for (let j = 0; j < inpKeys.length; j++) {
        if (isGeneric(inp[inpKeys[j]])) {
          return false
        }
      }
    }
    var outp = graph.node(nodes[i]).outputPorts
    if (outp !== undefined) {
      var outpKeys = Object.keys(outp)
      for (let j = 0; j < outpKeys.length; j++) {
        if (isGeneric(outp[outpKeys[j]])) {
          return false
        }
      }
    }
  }
  return true
}
