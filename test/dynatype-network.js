/* global describe, it */

var expect = require('chai').expect
var dtypenet = require('../src/dynatype-network.js')
var grlib = require('graphlib')
var fs = require('fs')

var convertGraph = new grlib.Graph({ directed: true, compound: false, multigraph: false })
var processGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/testgraph.graphlib')))

convertGraph.setNode('int', 'int')
convertGraph.setNode('float', 'float')
convertGraph.setNode('string', 'string')

convertGraph.setEdge('int', 'float', {from: 'int', to: 'float'})
convertGraph.setEdge('float', 'string', {from: 'float', to: 'string'})
convertGraph.setEdge('string', 'int', {from: 'string', to: 'int'})

describe('Dynamic type network graph', function () {
  it('Creates a processgraph with correct translator nodes', function () {
    var d = dtypenet.addTypeConversion(processGraph, convertGraph)
    var curGraph = grlib.json.write(d)
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/testgraph.graphlib'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('The graph with added translators should not be changed', function () {
    var d = dtypenet.addTypeConversion(processGraph, convertGraph)
    var dtrans = dtypenet.addTypeConversion(d, convertGraph)
    expect(d.nodes.length).to.be.equal(dtrans.nodes.length)
    expect(d.edges.length).to.be.equal(dtrans.edges.length)
  })
})
