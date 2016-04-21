// Include Express
var express = require('express');
// Initialize the Router
var router = express.Router();

var DBConnector = require('../lib/DBConnector');

// Setup the Route
router.get('/', function (req, res) {

    // return a json response to angular
    res.json({
        'msg': 'success!'
    });
});

// Expose the module
module.exports = router;