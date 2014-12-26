/* nor-nopg -- NoPg.Document implementation */
"use strict";

//var fs = require('nor-fs');
//var debug = require('nor-debug');
//var util = require("util");
var ARRAY = require('nor-array');
var FUNCTION = require('nor-function');
var events = require("events");

/** The constructor */
function NoPgORM(opts) {
	opts = opts || {};
	var self = this;
	self.$events = new events.EventEmitter();
}

/** */
ARRAY(['addListenter', 'on', 'once', 'removeListener', 'removeAllListeners', 'setMaxListeners', 'listeners', 'emit', 'listenerCount']).forEach(function(method) {
	NoPgORM.prototype[method] = function() {
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		return FUNCTION(self.$events[method]).apply(self.$events, args);
	};
});

// Exports
module.exports = NoPgORM;

/* EOF */
