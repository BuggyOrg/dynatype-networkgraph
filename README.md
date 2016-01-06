# Dynatype Network Graph

# Usage

| function | description |
|----------|-------------|
| `addTypeConversion (processGraph, convertGraph)` | Adds translator nodes for type conversion to the processGraph using only translations which are defined in the convertGraph |

## Input Process Graph

The process graph is a directed multigraph.

Each node which doesn't represent a port should have the label: `processNode`.
Nodes which represent ports should have the datatype of the output/input signal as label. The id of port-nodes should be the id of the corresponding `processNode + ('_OUT_' | '_IN_') + &lt;a number&gt;` to differentiate between different input/output ports.

Edges from port to port should have the label `edge` and edges between process nodes and ports should have the label `processNode_in` resp. `processEdge_out`.

## Convert Graph

The convert graph is a directed graph.

The nodes should have it's datatype as label and id.

An edge from a first node to a second node should have the label: `id_of_the_first_node + ':' + id_of_the_second_node`.

## Returned Process Graph

 The returned process graph is an expansion of the input process graph.

 The edges between two ports with different datatypes are removed. Instead translator nodes with input and output port-nodes are inserted.
 The translator nodes have the id : `id_of_port-node_with_first_datatype + ':' + id_of_port-node_with_second_datatype + &lt;a number&gt;` (to identify the different type conversions). The label is `first_type + ':' + second_type`.
 The input and output port-nodes of the translator have the id of the corresponding `translator_node + ('_OUT_' | '_IN_') + &lt;a number&gt;`,
 and the label `translator_in` resp. `translator_out`.
