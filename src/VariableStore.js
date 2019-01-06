
"use strict";

import debug from '@norjs/debug';

/** Create a new store for variables. This is useful for creating indexes for things like arrays and other objects. */
function VariableStore() {
	this.store = [];
}

/** Save variable in the store. This does not check if the variable is already in the store.
 * @returns {number} The ID for the variable
 */
VariableStore.prototype.save = function store_save(value) {
	return this.store.push(value) - 1;
};

/** Search the variable from the store using the variable itself.
 * @param {mixed} Any variable to find from the store
 * @returns {number|undefined} The unique ID as number or undefined if not found.
 */
VariableStore.prototype.search = function store_search(value) {
	// FIXME: Should we simply use .indexOf()?
	var s = this.store;
	var l = s.length;
	var i = 0;
	for(; i !== l; i += 1) {
		if(s[i] === value) {
			return i;
		}
	}
};

/** Search variable and save it into the store if it is missing.
 * @returns {number} The ID for the variable
 */
VariableStore.prototype.saveIfMissing = function store_save_missing(value) {
	var id = this.search(value);
	if(id !== undefined) { return id; }
	return this.save(value);
};

/** Fetch the variable from store using the ID
 * @param {number} The ID
 * @returns {mixed} The variable
 */
VariableStore.prototype.fetch = function store_fetch(id) {
	var s = this.store;
	var l = s.length;
	debug.assert(id).is('number').range(0, l-1);
	return s[id];
};

// Exports
module.exports = VariableStore;

/* EOF */
