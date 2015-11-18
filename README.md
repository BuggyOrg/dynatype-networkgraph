# Dynatype Network Graph

# Usage

| function | description |
|----------|-------------|
| 'addTypeConverting (processGraph, convertGraph)' | Adds translator nodes for type convertion to the processGraph using only translations which are defined in the convertGraph |

## Input Process Graph

The process graph is a directed multigraph.

Each node which doesn't represent a port should have the label = 'motherNode'.
Nodes which represent ports should have the datatype of the output/input signal as label. The id of port-nodes should be the id of the corresponding motherNode + '_OUT_' resp. '_IN_' + a number to differentiate between different input/output ports.

Edges from port to port should have the label 'edge' and edges between motherNodes and ports should have the label 'motherEdge_in' resp. 'motherEdge_out'.

## Convert Graph

The convert graph is a directed graph.

The nodes should have it's datatype as label and id.

An edge from a first node to a second node should have the label: id of the first node + ':' + id of the second node.

## Returned Process Graph

 The returned process graph is an expansion of the input process graph.

 The edges between two ports with different datatypes are removed. Instead translator nodes with input and output port-nodes are inserted.
 The translator nodes have the id : id of port-node with first datatype + ':' + id of port-node with second datatype + a number (to identify the different type convertions). The label is the first type + ':' + the second type.
 The input and output port-nodes of the translator have the id of the corresponding translator node + '_OUT_' resp. '_IN_' + a number, and the label 'translator_in' resp. 'translator_out'.
