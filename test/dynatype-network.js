/* global describe, it */

var expect = require('chai').expect
var dtypenet = require('../src/dynatype-network.js')
var grlib = require('graphlib')

var convertGraph = new grlib.Graph({ directed: true, compound: false, multigraph: false })
var processGraph = new grlib.Graph({ directed: true, compound: true, multigraph: true })

convertGraph.setNode('int', 'int')
convertGraph.setNode('float', 'float')
convertGraph.setNode('string', 'string')

convertGraph.setEdge('int', 'float', 'int_float')
convertGraph.setEdge('float', 'string', 'float_string')
convertGraph.setEdge('string', 'int', 'string_int')

// process Nodes
processGraph.setNode('0_STDIN', {nodeType: 'process', type: 'io/stdin'})
processGraph.setNode('1_INC', {nodeType: 'process', type: 'math/inc'})
processGraph.setNode('2_STDOUT', {nodeType: 'process', type: 'io/stdout'})
// port Nodes
processGraph.setNode('0_STDIN_OUTPORT_output', {nodeType: 'outPort', portName: 'output'})
processGraph.setNode('1_INC_INPORT_i', {nodeType: 'inPort', portName: 'i'})
processGraph.setNode('1_INC_OUTPORT_inc', {nodeType: 'outPort', portName: 'inc'})
processGraph.setNode('2_STDOUT_INPORT_input', {nodeType: 'inPort', portName: 'input'})

// edges from/to ports
processGraph.setEdge('0_STDIN', '0_STDIN_OUTPORT_output')
processGraph.setEdge('1_INC_INPORT_i', '1_INC')
processGraph.setEdge('1_INC', '1_INC_OUTPORT_inc')
processGraph.setEdge('2_STDOUT_INPORT_input', '2_STDOUT')

// edges between ports
processGraph.setEdge('0_STDIN_OUTPORT_output', '1_INC_INPORT_i')
processGraph.setEdge('1_INC_OUTPORT_inc', '2_STDOUT_INPORT_input')

describe('Dynamic type network graph', function () {
  it('Creates a processgraph with the same nodes', function () {
    var d = dtypenet.addTypeConverting(processGraph, convertGraph)
    expect(d).to.be.ok
    expect(d.node('0_STDIN')['nodeType']).to.be.equal('process')
    expect(d.node('0_STDIN')['type']).to.be.equal('io/stdin')
    expect(d.node('1_INC')['nodeType']).to.be.equal('process')
    expect(d.node('1_INC')['type']).to.be.equal('math/inc')
    expect(d.node('2_STDOUT')['nodeType']).to.be.equal('process')
    expect(d.node('2_STDOUT')['type']).to.be.equal('io/stdout')

    expect(d.node('0_STDIN_OUTPORT_output')['nodeType']).to.be.equal('outPort')
    expect(d.node('0_STDIN_OUTPORT_output')['portName']).to.be.equal('output')
    expect(d.node('1_INC_INPORT_i')['nodeType']).to.be.equal('inPort')
    expect(d.node('1_INC_INPORT_i')['portName']).to.be.equal('i')
    expect(d.node('1_INC_OUTPORT_inc')['nodeType']).to.be.equal('outPort')
    expect(d.node('1_INC_OUTPORT_inc')['portName']).to.be.equal('inc')
    expect(d.node('2_STDOUT_INPORT_input')['nodeType']).to.be.equal('inPort')
    expect(d.node('2_STDOUT_INPORT_input')['portName']).to.be.equal('input')
  })

  it('Creates a processgraph with type-convertion', function () {
    var d = dtypenet.addTypeConverting(processGraph, convertGraph)
    expect(d.node('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0')['nodeType']).to.be.equal('translator')
    expect(d.node('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0')['typeFrom']).to.be.equal('string')
    expect(d.node('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0')['typeTo']).to.be.equal('int')

    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_0')['nodeType']).to.be.equal('translator')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_0')['typeFrom']).to.be.equal('int')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_0')['typeTo']).to.be.equal('float')

    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_1')['nodeType']).to.be.equal('translator')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_1')['typeFrom']).to.be.equal('float')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_1')['typeTo']).to.be.equal('string')

    expect(d.node('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_INPORT_in')['nodeType']).to.be.equal('inPort')
    expect(d.node('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_INPORT_in')['portName']).to.be.equal('in')

    expect(d.node('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_OUTPORT_out')['nodeType']).to.be.equal('outPort')
    expect(d.node('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_OUTPORT_out')['portName']).to.be.equal('out')

    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_0_INPORT_in')['nodeType']).to.be.equal('inPort')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_0_INPORT_in')['portName']).to.be.equal('in')

    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_0_OUTPORT_out')['nodeType']).to.be.equal('outPort')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_0_OUTPORT_out')['portName']).to.be.equal('out')

    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_1_INPORT_in')['nodeType']).to.be.equal('inPort')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_1_INPORT_in')['portName']).to.be.equal('in')

    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_1_OUTPORT_out')['nodeType']).to.be.equal('outPort')
    expect(d.node('1_INC_OUTPORT_inc:2_STDOUT_INPORT_input_1_OUTPORT_out')['portName']).to.be.equal('out')
  })
  it('All nodes are connected with edges', function () {
    var d = dtypenet.addTypeConverting(processGraph, convertGraph)
    expect(d.edge('0_STDIN', '0_STDIN_OUTPORT_output')).to.be.ok
    expect(d.edge('0_STDIN_OUTPORT_output', '0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_INPORT_in')).to.be.ok
    expect(d.edge('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_INPORT_in', '0_STDIN_OUTPORT_output:1_INC_INPORT_i_0')).to.be.ok
    expect(d.edge('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0', '0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_OUTPORT_out')).to.be.ok
    expect(d.edge('0_STDIN_OUTPORT_output:1_INC_INPORT_i_0_OUTPORT_out', '1_INC_INPORT_i')).to.be.ok
    expect(d.edge('1_INC_INPORT_i', '1_INC')).to.be.ok
    expect(d.edge('1_INC', '1_INC_OUTPORT_inc')).to.be.ok
  })
  it('The graph with added translators should not be changed', function () {
    var d = dtypenet.addTypeConverting(processGraph, convertGraph)
    var dtrans = dtypenet.addTypeConverting(d, convertGraph)
    expect(d.nodes.length).to.be.equal(dtrans.nodes.length)
    expect(d.edges.length).to.be.equal(dtrans.edges.length)
  })
})
