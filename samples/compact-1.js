var util = require('util');
var data = require('/home/jhh/git/sendanor/optimikodit-planner/tmp/2ea78a07-c4f2-5831-b8e7-0506c95ecfea.json');
var compact = require('../src/compact.js');
compact(data, {'inplace': true});
module.exports = data;
