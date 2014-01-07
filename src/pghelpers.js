/** PostgreSQL helpers */

var pghelpers = module.exports = {};

/** Escape JavaScript function into PostgreSQL block.
 * @param f {string|function} A string of javascript code or a JS function 
 *                            which must not contain any native code or libs. 
 *                            Use `require("mod")` to require dependencies, 
 *                            which must be loaded on the database server.
 */
pghelpers.escapeFunction = function escape_function(f, args) {
	args = args || [];
	return '$js$\nreturn (' + f + ').call(' + ['this'].concat(args).join(', ') + ')\n$js$';
};

/* EOF */
