var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');


var app = express();


//routes
//
var dataRoute = require('./routes/dataRoute');

//
//middlewares
//
var allowCORS = require('./middleware/allowCORS');
var checkUser = require('./middleware/checkUser');




//
//database
//
//database plugin
var oracledb = require('oracledb');
var DBConnector = require('./lib/DBConnector');



var dbConfig = {
    connectString:(process.env.CONNECT_STRING || 'localhost:1521/orcl'),
    user         :(process.env.USER || "system"),
    password     :'22sqcnF8',
    poolMax: 20,
    poolMin:    2,
    poolIncrement: 2,
    poolTimeout: 10
};
 


// if newVersion -> true
//    Creates a connecion and the tables again
// if newVersion -> false
//    creates a connecion
// if newData -> true
//    insert newdata into the existed tables
// if newData -> false
//    nothing
var newVersion = false;
var newData = false;

DBConnector.connectAndBuild( dbConfig, newVersion, newData ,function( pool ){

  // uncomment after placing your favicon in /public
  //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());


  /**
   * Development Settings
   */
  if (app.get('env')==='development') {
      // This will change in production since we'll be using the dist folder
      app.use(express.static(path.join(__dirname, '../client')));
      // This covers serving up the index page
      app.use(express.static(path.join(__dirname, '../client/.tmp')));
      app.use(express.static(path.join(__dirname, '../client/app')));


      // Error Handling
      app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
      });
  }

  //
  // Production Settings
  //
  if (app.get('env')==='production') {

      // changes it to use the optimized version for production
      app.use(express.static(path.join(__dirname, '/dist')));

      app.use('/', testRoute);

      // production error handler
      // no stacktraces leaked to user
      app.use(function(err, req, res, next) {
          res.status(err.status || 500);
          res.render('error', {
              message: err.message,
              error: {}
          });
      });
  }


  var cookie = { domain: '',
                 httpOnly: false,
                 secure: false };

  app.use(session({
    secret: 'session secret!',
    resave: false,
    saveUninitialized: true,
    cookie: cookie,
    name: 'session'
  }));


  //allow client to access the urls on the server
  app.use(allowCORS);
  // checks if user exists (not implemented)
  app.use(checkUser);
  // data traffic
  app.use('/data', dataRoute);

});

module.exports = app;



/*
oracledb.getConnection({  
     user: "system",  
     password: "22sqcnF8",  
     connectString: "localhost:1521/orcl"
}, function(err, connection) {  
     if (err) {  
          console.error(err.message);
          return;
     }  
     connection.execute( 'SELECT * FROM GRIPIR',
     [],  
     function(err, result) {
          if (err) {
               console.error(err.message);
               doRelease(connection);
               return;
          }  
          console.log(result.metaData);
          console.log(result.rows);
          doRelease(connection);
     });  
});  
  
function doRelease(connection) {
     connection.release(  
          function(err) {  
               if (err) {console.error(err.message);}
          }  
     );  
}  

*/