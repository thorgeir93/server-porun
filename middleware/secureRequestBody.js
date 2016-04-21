'use strict';

// third library
var xss = require('xss');

module.exports = function secureRequestBody(req, res, next) {
  	var jsonString = JSON.stringify( req.body );
	var sequreJSON = xss( jsonString );
	req.body = JSON.parse(sequreJSON);
	next();
};