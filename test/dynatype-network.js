/* global describe, it */

var expect = require('chai').expect
var dtypenet = require('../src/dynatype-network.js')
var grlib = require('graphlib')
var fs = require('fs')

var convertGraph = new grlib.Graph({ directed: true, compound: false, multigraph: false })
var processGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/testgraph0.graphlib')))
var processGraphGeneric = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/testgraph0_generics.graphlib')))
var processGraphGeneric2 = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/testgraph0_generics2.graphlib')))
var inc_generic = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/inc_generic.json')))
var type_error = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/type_error.json')))
var facGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/fac.json')))
var fac2Graph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/fac2.json')))

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
    expect(g.node('fac:is1').inputPorts.i1).to.equal('int64')
    expect(g.node('fac:is1').inputPorts.i2).to.equal('int64')
  })
  it('Propagates generics correctly which pass hierarchy borders', () => {
    var g = dtypenet.replaceGenerics(fac2Graph)
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/facGraph.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/fac2_corr.json', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('Replaces generics correctly for nodes with generic input and no generic output', () => {
    var g = dtypenet.replaceGenerics(inc_generic)
    var curGraph = grlib.json.write(g)
    fs.writeFileSync('test/fixtures/inc_withoutGeneric.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/inc_withoutGeneric.graphlib', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('Uses type hints to replace generics', () => {
    var hintGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/hint1.json')))
    var genGraph = dtypenet.replaceGenerics(hintGraph)
    expect(genGraph.node('in').outputPorts['output']).to.equal('string')
  })
  it('Resolves generic arrays', () => {
    var arrGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/arr.json')))
    var genGraph = dtypenet.replaceGenerics(arrGraph)
    expect(genGraph.node('out').inputPorts['input']).to.equal('[number]')
  })
  it('Resolves generic arrays with hints', () => {
    var arrGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/arrHint.json')))
    var genGraph = dtypenet.replaceGenerics(arrGraph)
    expect(genGraph.node('out').inputPorts['input']).to.equal('[string]')
  })
  it('Can handle pack and unpacking arrays', () => {
    var arrGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/unpack.json')))
    var genGraph = dtypenet.replaceGenerics(arrGraph)
    expect(genGraph.node('p').outputPorts['output']).to.equal('[int64]')
    expect(genGraph.node('p').inputPorts['stream']).to.equal('int64')
    expect(genGraph.node('up').outputPorts['stream']).to.equal('int64')
    expect(genGraph.node('up').inputPorts['data']).to.equal('[int64]')
    expect(genGraph.node('strToArr').outputPorts['output']).to.equal('[int64]')
    expect(genGraph.node('arrToStr').inputPorts['input']).to.equal('[int64]')
  })
/*
  it('Throws an error if there is a type mismatch', () => {
    expect(() => dtypenet.replaceGenerics(type_error)).to.throw(Error)
  })
*/
  it('Can process the map example correctly', () => {
    var mapGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map.json')))
    var genGraph = dtypenet.replaceGenerics(mapGraph)
    // console.log(JSON.stringify(grlib.json.write(genGraph), null, 2))
    expect(genGraph.node('mapInc').inputPorts['data']).to.equal('[int64]')
    expect(genGraph.node('mapInc:apply').inputPorts['value']).to.equal('int64')
    expect(genGraph.node('mapInc:apply').outputPorts['result']).to.equal('int64')
    expect(genGraph.node('mapInc').inputPorts['fn']).to.be.an('object')
  })

  it('finds a way through map', () => {
    var mapGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map.json')))
    var path = dtypenet.replaceGenericInput(mapGraph, 'arrToStr')
    expect(path).to.have.length(1)
  })

  /* it('can deduce all array types in recursive map', () => {
    var mapGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map_recursive.json')))
    var path = dtypenet.replaceGenericInput(mapGraph, 'mapInc')
    console.log(path)
    expect(path).to.have.length(2)
  })*/

  it('can backtrack compound inputs', () => {
    var mapGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map.json')))
    var path = dtypenet.replaceGenericInput(mapGraph, 'mapInc')
    expect(path).to.have.length(2)
  })
})
