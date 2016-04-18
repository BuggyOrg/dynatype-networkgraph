/* global describe, it */

var expect = require('chai').expect
var dtypenet = require('../src/dynatype-network.js')
var grlib = require('graphlib')
var fs = require('fs')

var convertGraph = new grlib.Graph({ directed: true, compound: false, multigraph: false })
var processGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/testgraph0.graphlib')))
var processGraphGeneric = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/testgraph0_generics.graphlib')))
var processGraphGeneric2 = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/testgraph0_generics2.graphlib')))
var facGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/fac.json')))

convertGraph.setNode('int', 'int')
convertGraph.setNode('string', 'string')

convertGraph.setEdge('int', 'string', {from: 'int', to: 'string'})
convertGraph.setEdge('string', 'int', {from: 'string', to: 'int'})

describe('Dynamic type network graph', function () {
  it('Creates a processgraph with correct translator nodes', function () {
    var d = dtypenet.addTypeConversion(processGraph, convertGraph)
    var curGraph = grlib.json.write(d)
    // fs.writeFileSync('test/fixtures/testgraph.graphlib', JSON.stringify(grlib.json.write(d), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/testgraph.graphlib'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('The graph with added translators should not be changed', function () {
    var d = dtypenet.addTypeConversion(processGraph, convertGraph)
    var dtrans = dtypenet.addTypeConversion(d, convertGraph)
    expect(d.nodes.length).to.be.equal(dtrans.nodes.length)
    expect(d.edges.length).to.be.equal(dtrans.edges.length)
  })
  it('Creates a processgraph with correct translator nodes without generics simple', function () {
    var g = dtypenet.replaceGenerics(processGraphGeneric)
    var d = dtypenet.addTypeConversion(g, convertGraph)
    var curGraph = grlib.json.write(d)
    // fs.writeFileSync('test/fixtures/testgraph_generics.graphlib', JSON.stringify(grlib.json.write(d), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/testgraph_generics.graphlib'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('Creates a processgraph with correct translator nodes without generics complex', function () {
    var g = dtypenet.replaceGenerics(processGraphGeneric2)
    var d = dtypenet.addTypeConversion(g, convertGraph)
    var curGraph = grlib.json.write(d)
    // fs.writeFileSync('test/fixtures/testgraph_generics2.graphlib', JSON.stringify(grlib.json.write(d), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/testgraph_generics2.graphlib'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('Creates a processgraph without generics very complex', function () {
    var g = dtypenet.replaceGenerics(facGraph)
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/facGraph.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/facGraph.graphlib', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })
})
