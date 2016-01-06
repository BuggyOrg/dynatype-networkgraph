#!/usr/bin/env node
/* global __dirname, process */

import program from 'commander'
import fs from 'fs'
import getStdin from 'get-stdin'
import graphlib from 'graphlib'
import addTypeConversion from './dynatype-network.js'

program
  .version(JSON.parse(fs.readFileSync(__dirname + '/../package.json'))['version'])
  .option('-t, --typegraph <typegraph>', 'Set the dynatype type conversion graph.')
  .option('-f, --graphfile [graphfile]', 'Set graph file to parse. If none is given stdin is read')
  .parse(process.argv)

if (!program.typegraph) {
  console.error('No type conversion graph given')
}

try {
  var typeGraph = graphlib.json.read(JSON.parse(fs.readFileSync(program.typegraph)))

  var processGraph = str => {
    var graph = graphlib.json.read(JSON.parse(str))
    var typed = addTypeConversion(graph, typeGraph)
    return JSON.stringify(graphlib.json.write(typed))
  }

  if (program.graphfile) {
    var str = fs.readFileSync(program.graphfile)
    console.log(processGraph(str))
  } else {
    getStdin().then(str => {
      try {
        console.log(processGraph(str))
      } catch (e) {
        console.error(e)
      }
    })
  }
} catch (e) {
  console.error(e)
}
