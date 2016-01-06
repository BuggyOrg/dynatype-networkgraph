#!/usr/bin/env node

/* global __dirname, process */

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _getStdin = require('get-stdin');

var _getStdin2 = _interopRequireDefault(_getStdin);

var _graphlib = require('graphlib');

var _graphlib2 = _interopRequireDefault(_graphlib);

var _dynatypeNetworkJs = require('./dynatype-network.js');

var _dynatypeNetworkJs2 = _interopRequireDefault(_dynatypeNetworkJs);

_commander2['default'].version(JSON.parse(_fs2['default'].readFileSync(__dirname + '/../package.json'))['version']).option('-t, --typegraph <typegraph>', 'Set the dynatype type conversion graph.').option('-f, --graphfile <graphfile>', 'Set graph file to parse. If none is given stdin is read').parse(process.argv);

var processGraph = function processGraph(str) {
  var graph = _graphlib2['default'].json.read(JSON.parse(str));
  var typed = (0, _dynatypeNetworkJs2['default'])(graph);
  return JSON.stringify(_graphlib2['default'].json.write(typed));
};

if (_commander2['default'].graphfile) {
  var str = _fs2['default'].readFileSync(_commander2['default'].graphfile);
  console.log(processGraph(str));
} else {
  (0, _getStdin2['default'])().then(function (str) {
    try {
      console.log(processGraph(str));
    } catch (e) {
      console.error(e);
    }
  });
}