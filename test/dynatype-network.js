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
// var type_error = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/type_error.json')))
var facGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/fac.json')))
var fac2Graph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/fac2.json')))
var secondInput = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/secondInput.graphlib')))
var secondInput2 = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/secondInput2.graphlib')))
var walkForward = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/walkForward.graphlib')))
var map_recursive2 = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map_recursive2.json')))

convertGraph.setNode('int', 'int')
convertGraph.setNode('string', 'string')

convertGraph.setEdge('int', 'string', {from: 'int', to: 'string'})
convertGraph.setEdge('string', 'int', {from: 'string', to: 'int'})

describe('Dynamic type network graph', function () {
  it('replaces a normal generic type with a basic type', () => {
    var newType = dtypenet.replaceGeneric('generic', 'number')
    expect(newType).to.equal('number')
  })

  it('replaces a normal generic type with an array type', () => {
    var newType = dtypenet.replaceGeneric('generic', '[string]')
    expect(newType).to.equal('[string]')
  })

  /* unclear ;)
  it('replaces an array generic type with an array type', () => {
    var newType = dtypenet.replaceGeneric('[generic]', '[string]')
    expect(newType).to.equal('[string]')
  })*/

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
/*  it('Creates a processgraph with correct translator nodes without generics simple', function () {
    var g = dtypenet.replaceGenerics(processGraphGeneric)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var d = dtypenet.addTypeConversion(g, convertGraph)
    var curGraph = grlib.json.write(d)
    // fs.writeFileSync('test/fixtures/testgraph_generics.graphlib', JSON.stringify(grlib.json.write(d), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/testgraph_generics.graphlib'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('Creates a processgraph with correct translator nodes without generics complex', function () {
    var g = dtypenet.replaceGenerics(processGraphGeneric2)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var d = dtypenet.addTypeConversion(g, convertGraph)
    var curGraph = grlib.json.write(d)
    // fs.writeFileSync('test/fixtures/testgraph_generics2.graphlib', JSON.stringify(grlib.json.write(d), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/testgraph_generics2.graphlib'))
    expect(curGraph).to.deep.equal(testgraph)
  })*/
  it('Creates a processgraph without generics very complex', function () {
    var g = dtypenet.replaceGenerics(facGraph)
    expect(dtypenet.isGenericFree(g)).to.be.true
    expect(g.node('fac:is1').inputPorts.i1).to.equal('int64')
    expect(g.node('fac:is1').inputPorts.i2).to.equal('int64')
  })
/*  it('Propagates generics correctly which pass hierarchy borders', () => {
    var g = dtypenet.replaceGenerics(fac2Graph)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/fac2_corr.json', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/fac2_corr.json', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })
  it('Replaces generics correctly for nodes with generic input and no generic output', () => {
    var g = dtypenet.replaceGenerics(inc_generic)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/inc_withoutGeneric.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/inc_withoutGeneric.graphlib', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })*/
  it('Uses type hints to replace generics', () => {
    var hintGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/hint1.json')))
    var genGraph = dtypenet.replaceGenerics(hintGraph)
    expect(dtypenet.isGenericFree(genGraph)).to.be.true
    expect(genGraph.node('in').outputPorts['output']).to.equal('string')
  })
  it('Resolves generic arrays', () => {
    var arrGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/arr.json')))
    var genGraph = dtypenet.replaceGenerics(arrGraph)
    expect(dtypenet.isGenericFree(genGraph)).to.be.true
    expect(genGraph.node('out').inputPorts['input']).to.equal('[number]')
  })
  it('Resolves generic arrays with hints', () => {
    var arrGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/arrHint.json')))
    var genGraph = dtypenet.replaceGenerics(arrGraph)
    expect(dtypenet.isGenericFree(genGraph)).to.be.true
    expect(genGraph.node('out').inputPorts['input']).to.equal('[string]')
  })
/*  it('Can handle pack and unpacking arrays', () => {
    var arrGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/unpack.json')))
    var genGraph = dtypenet.replaceGenerics(arrGraph)
    expect(dtypenet.isGenericFree(genGraph)).to.be.true
    expect(genGraph.node('p').outputPorts['output']).to.equal('[int64]')
    expect(genGraph.node('p').inputPorts['stream']).to.equal('int64')
    expect(genGraph.node('up').outputPorts['stream']).to.equal('int64')
    expect(genGraph.node('up').inputPorts['data']).to.equal('[int64]')
    expect(genGraph.node('strToArr').outputPorts['output']).to.equal('[int64]')
    expect(genGraph.node('arrToStr').inputPorts['input']).to.equal('[int64]')
  })

  it('Throws an error if there is a type mismatch', () => {
    expect(() => dtypenet.replaceGenerics(type_error)).to.throw(Error)
  })
*/
  it('Can process the map example correctly', () => {
    var mapGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map.json')))
    var genGraph = dtypenet.replaceGenerics(mapGraph)
    expect(dtypenet.isGenericFree(genGraph)).to.be.true
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

  it('can backtrack compound inputs', () => {
    var mapGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map_recursive.json')))
    var path = dtypenet.replaceGenericInput(mapGraph, 'mapInc')
    expect(path).to.have.length(4)
  })

  it('can deduce all array types in recursive map', () => {
    var mapGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/map_recursive.json')))
    var typedGraph = dtypenet.replaceGenerics(mapGraph)
    expect(dtypenet.genericNodes(typedGraph)).to.deep.equal([])
    expect(typedGraph.node('mapInc:first').inputPorts['array']).to.equal('[int64]')
    expect(typedGraph.node('mapInc').inputPorts['data']).to.equal('[int64]')
    expect(typedGraph.node('mapInc:empty').inputPorts['array']).to.equal('[int64]')
    expect(typedGraph.node('mapInc:term').inputPorts['input']).to.equal('[int64]')
    expect(typedGraph.node('mapInc:term').outputPorts['outFalse']).to.equal('[int64]')
    expect(typedGraph.node('mapInc:rest').inputPorts['array']).to.equal('[int64]')
    expect(typedGraph.node('mapInc:rest').outputPorts['rest']).to.equal('[int64]')
    expect(typedGraph.node('mapInc:first').outputPorts['value']).to.equal('int64')
  })

  it('keeps the array type in a generic -> generic atomic', () => {
    var ggGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/g->g_path.json')))
    var typedGraph = dtypenet.replaceGenerics(ggGraph)
    expect(dtypenet.isGenericFree(typedGraph)).to.be.true
    expect(typedGraph.node('1_INC').inputPorts['i']).to.equal('[int]')
    expect(typedGraph.node('1_INC').outputPorts['inc']).to.equal('[int]')
  })

  it('extracts the array type in an array -> generic atomic', () => {
    var agGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/a->g_path.json')))
    var typedGraph = dtypenet.replaceGenerics(agGraph)
    expect(dtypenet.isGenericFree(typedGraph)).to.be.true
    expect(typedGraph.node('1_INC').inputPorts['i']).to.equal('[int]')
    expect(typedGraph.node('1_INC').outputPorts['inc']).to.equal('int')
    expect(typedGraph.node('2_STDOUT').inputPorts['input']).to.equal('int')
  })

  it('packs the array type in an generic -> array atomic', () => {
    var gaGraph = grlib.json.read(JSON.parse(fs.readFileSync('./test/fixtures/g->a_path.json')))
    var typedGraph = dtypenet.replaceGenerics(gaGraph)
    expect(dtypenet.isGenericFree(typedGraph)).to.be.true
    expect(typedGraph.node('1_INC').inputPorts['i']).to.equal('int')
    expect(typedGraph.node('1_INC').outputPorts['inc']).to.equal('[int]')
    expect(typedGraph.node('2_STDOUT').inputPorts['input']).to.equal('[int]')
  })

/*
  it('backtracks second path if first contains just generics', () => {
    var g = dtypenet.replaceGenerics(secondInput)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/secondInput_result.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/secondInput_result.graphlib', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })

  it('takes type of second input if first path contains just generics', () => {
    var g = dtypenet.replaceGenerics(secondInput2)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/secondInput2_result.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/secondInput2_result.graphlib', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })

  it('walks forward if backtrack contains just generics', () => {
    var g = dtypenet.replaceGenerics(walkForward)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/walkForward_result.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/walkForward_result.graphlib', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })

  it('replaces generics correctly in map_recursive', () => {
    var g = dtypenet.replaceGenerics(map_recursive2)
    expect(dtypenet.isGenericFree(g)).to.be.true
    var curGraph = grlib.json.write(g)
    // fs.writeFileSync('test/fixtures/map_recursive2_result.graphlib', JSON.stringify(grlib.json.write(g), null, 2))
    var testgraph = JSON.parse(fs.readFileSync('test/fixtures/map_recursive2_result.graphlib', 'utf8'))
    expect(curGraph).to.deep.equal(testgraph)
  })*/
})
