// Include Express
var express = require('express');

// Initialize the Router
var router = express.Router();

// query methods to database
var db = require('../lib/DBConnector');

//middleware
var secureRequestBody = require('../middleware/secureRequestBody');


// sequrity middleware, clean the json data
router.use( secureRequestBody );


// Setup the Route
router.post('/submit/comfort', function (req, res, next) {
	console.log("req.body");
	console.log(req.body);

	db.getBulls(1, function( result ){
		// result -> { rows: [<data>,<data>, ... ], <info>, <metaData> }
		// <data> -> object
		// <info> -> result information
		// <metaData> -> [ {name: <column>}, {name: <column>}, ... ]
		// <column> -> String

		var traitFactors = req.body;
		var bulls = result.rows;

		var sortedBulls = sortTraits( result.rows, req.body );

		res.json( sortedBulls );
	});

});


function sortTraits( data, traitFactors ){
	var factors = {
			0: 1,
			1: 50,
			2: 100,
			3: 500
	};

	// adapter between database names and client names
	var col = getGripirColumns();
	
	//Afurðamat = Magn mjólkurpróteins*0,85 + Próteinhlutfall*0,15.
	//Kynbótaeinkunn = Afurðamat*0,44 + (Mjaltir + Frumutala + Júgur + Spenar + Ending + Frjósemi + Skap)*0,08

	var bullOrder = {};
	
	for( var j in data ){
		// j -> 0 ... bullData.length
		// bull[j] -> {<column name>: <value>, <column name>: <value>, ...}	

		var bull = data[j];
		var value = 0;

		for( var trait in traitFactors ){
			// traitFactors -> { <trait>:<factor> }
			// <factor> -> 1 | 2 | 3 | 0
			var factor = traitFactors[trait];
			value = value + ( bull[ col[trait] ] * factors[factor] );
		}
		
		// bullOrder is a object.
		// It will automatically sorts the
		// object using value
		bullOrder[value] = bull;
	}
	return bullOrder;
}

// x2 (in client -> tableModule.js)
function getGripirColumns(){
    return {
		'mjolk': 'MJOLKURMAGN',
		'fita': 'FITUHLUTFALL',
		'protein': 'PROTEINHLUTFALL',
		'afurdir': 'AFURDAMAT',
		'frjosemi': 'FRJOSEMI',
		'frumutala': 'FRUMUR',
		'gaedarod': 'GAEDAROD',
		'skrokkur': 'SKROKKUR',
		'boldypt': 'NM_BOLDYPT',
		'utlogur': 'NM_UTLOGUR',
		'jugur': 'JUGUR',
		'festa': 'NM_JUGURFESTA',
		'band': 'NM_JUGURBAND',
		'dypt': 'NM_JUGURDYPT',
		'spenar': 'SPENAR',
		'lengd': 'NM_SPENALENGD',
		'thykkt': 'NM_SPENATHYKKT',
		'stada': 'NM_SPENASTADA',
		'ending': 'ENDING',
		'mjaltir': 'MJALTIR',
		'skap': 'SKAP'
    };
}






//
//TABLE INITIALIZE
//
router.get('/table/default', function (req, res, next) {
	console.log("req.body");
	console.log(req.body);

	db.getBulls(1, function( result ){
		// rows = [ {column:value, ... }, ... ]
		res.json( result.rows );
	});
});




// Expose the module
module.exports = router;