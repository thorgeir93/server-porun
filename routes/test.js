var express = require('express');
var router = express.Router();

router.post('/testing', function(req, res) {
	console.log(req.body);
	res.json({
		'msg': 'success!'
	});
	//res.render('views/main', {});
	//res.render('index', { title: 'Express' });
	//return "a";
});

module.exports = router;