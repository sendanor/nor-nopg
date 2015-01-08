/**
 * nor-nopg -- NoSQL database library for PostgreSQL
 * Copyright 2014 Sendanor <info@sendanor.fi>,
 *           2014 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

"use strict";

/** Returns true if first letter is dollar */
module.exports = function first_letter_is_dollar(k) {
	return k[0] === '$';
};

/** EOF */
