var orawrap = require('orawrap');
var oracledb = require('oracledb');
var Iconv = require('iconv').Iconv;
var fs = require('fs');
var jschardet = require("jschardet");
var utf8 = require('utf8');

var dataNaut = require('./data/naut2007_des2015');
var dataKyr = require('./data/kyr');
var dataKynMat = require('./data/scrapeData'); 

var matAdapter = require('./kynbotamat_title_adapter');


/////////////////////
// DATABASE QUERYS //
/////////////////////

var outFormat = { outFormat: oracledb.OBJECT };


function getBulls( number, cb ){

    var queryStm = 
        "SELECT *"+
        "FROM NAUT";

    executeQuerySQL(queryStm, function(result){
        cb(result);
    });

}
module.exports.getBulls = getBulls;








/////////////////////////
// DATABASE INITIALIZE //
/////////////////////////

// connects to database
function connect( dbConfig, callback ){
    orawrap.createPool(dbConfig, function(err, pool) {
       //The pool that was created is provided in the callback function, 
       //but it's rarely needed as it's stored within orawrap for use later
       if (err) throw err;

       //console.log( pool );
       callback( pool );
    });
}
module.exports.connect = connect;


// drop all tables and rebuild them again
function buildDB( callback ){
    
    var root = './lib/sql/';

    var path = [
        root + 'create_kynbotamat',
        root + 'create_gripir',
        root + 'create_naut'
    ];


    // CALLBACK HELL!! 
    // drop tables NAUT, GRIPIR and KYNBOTAMAT
    // and creates them again
    executeQueryPL(dropTable.drop_naut, function(){ 
        executeQueryPL(dropTable.drop_gripir, function(){ 
            executeQueryPL(dropTable.drop_kynbotamat, function(){ 
                
                readAndExecute(path.pop(), function(){
                    readAndExecute(path.pop(), function(){
                        readAndExecute(path.pop(), function(){
                            loop();
                            callback();
                        });
                    });
                });

            });
        });
    });
}
module.exports.buildDB = buildDB;



// Adds a comments on table GRIPIR from
// array list query_comment
function loop(){
    var sql = query_comment.pop();
    if( !sql ){
        return;
    } else {
        executeQuerySQL(sql, loop);
    }
}

// Executes sql string.
function executeQuerySQL(sql, callback){
    orawrap.execute( 
        sql,
        [],
        outFormat,
        function(err, results) {
            if (err) {
                throw err;
            }
            //console.log( "results1" );
            //console.log( results );

            callback( results );
        }
    );
}
module.exports.executeQuerySQL = executeQuerySQL;


// Executes a PS/SQL query.
// PLsql is an array -> [statement, value]
// statement -> string, will be executed
// value -> object, containing value for statement
function executeQueryPL(PLsql, callback){
    orawrap.execute( 
        PLsql[0],
        PLsql[1],
        function(err, results) {
            if (err) {
                throw err;
            }

            console.log( "deleting result->" );
            console.log( results );
            callback();
    });
}


// executes a sql query for a giving path
function readAndExecute(path, callback){
    fs.readFile(path, 'utf8', function(error, sql){
        if( error ){
            console.log( error );
        }
        orawrap.execute( sql, function(err, results) {
            if (err) {
                throw err;
            }
            console.log( "Create table result->" );
            console.log( results );
            callback();
        });
    });
}

    


// Connects to database, drop all
// tables and rebuild them again
function connectAndBuild( dbConfig, newVersion, newData, callback ){
    //console.log( newData );
    
    connect( dbConfig, function( pool ){
        if(newVersion){
            buildDB( function(){
                if(newData){
                    insertAllData();
                    callback( pool );
                } else {
                    callback( pool );
                }
            });   
        } else {
            callback( pool );
        }
    });
};
module.exports.connectAndBuild = connectAndBuild;




// returns object containing a big string that 
// is composed of all gripir columns names and 
// also return values number e.g. ':1, :2, :3'
function getColumnsString( columns ){
    var string = "";
    var bindPar = ":";
    var comma = ",";
    var commaEqual = ", :";

    for( index in columns ){
        bindPar = bindPar + columns[index] + commaEqual;
        string = string + columns[index] + comma;
    }

    return {
        string: string.substr(0, string.length-comma.length), 
        bindPar: bindPar.substr(0, bindPar.length-commaEqual.length)
    };
}


// Takes JSON data, removes string quote
// from variables names and numbers and 
// return the new clean data.
function dataFormatting( data, columns ){

    var rightValue;
    var allData = [];
    var newData = {};

    for( i in data ){
        for( index in columns ){
            var value = data[i][columns[index]];
            var intValue = parseInt(value);
            var floatValue = parseFloat(value);

            if( intValue == 0 ){
                rightValue = intValue;
            }
            else if( value.length != intValue.toString().length ){
                if( value.length != floatValue.toString().length){
                    rightValue = value
                } else {
                    rightValue = floatValue;
                }
            } else if (intValue) {
                rightValue = intValue;
            }

            newData[columns[index]] = rightValue;
        }
        allData.push(newData);
        newData = {};
    }
    return allData;
}


// Filtering the data 
//  -> remove the undefined title
//  -> initilize new Date for column 'skradags'
//  result -> 
//  [   
//      { <column_name>:<data_value>, ... }, 
//      { <column_name>:<data_value>, ... }
//              .
//              .
//              .
//      { <column_name>:<data_value>, ... }
//  ]
function cleanKynbotamat( data, columns ){
    var rightValue;
    var allData = [];
    var newData = {};

    for( i in data ){
        var count = 0;
        var subData = data[i];

        for( index in subData ){
            // TODO: why is index undefined?
            if( index === 'undefined'){
                console.log("clearData: index undefined!");
            }else{
                if( index === 'skradags' ){
                    newData[index] =  new Date();
                } else {
                    newData[index] = subData[index];
                }
            }
        }
        allData.push(newData);
        newData = {};
    }
    return allData;
}


function insertAllData(){
    ////////////////////////////
    // INSERT KYNBOTAMAT DATA //
    ////////////////////////////
    var columnsValue = formatTraitTitles( dataKynMat );
    var columns = getColumnsString( getKynbotaColumns() );

    console.log(columnsValue);

    var statement=
        "INSERT INTO KYNBOTAMAT ("+columns.string+") "+ 
        "VALUES ("+columns.bindPar+")";

    var clean = cleanKynbotamat( columnsValue, getKynbotaColumns() );
    loopExecute(statement, clean, 0, loopExecute);

    /////////////////////////
    // INSERTING NAUT DATA //
    /////////////////////////
    var naut = dataNaut.naut;
    var gripirColumns = getGripirColumns();
    var columns = getColumnsString( gripirColumns );

    var statement=
        "INSERT INTO NAUT ("+columns.string+") "+ 
        "VALUES ("+columns.bindPar+")";

    var newData = dataFormatting( naut, gripirColumns );
    loopExecute(statement, newData, 0, loopExecute);
}




// Takes a JSON data wich contains traits titles
// in icelandic e.g. 'Gæðaröð: 111' and convert
// it to database column name 'gaedarod: 111'.
// It uses a adapter wich keeps the icelandic 
// title alongside the database column name
function formatTraitTitles( data ){
    var adapter = matAdapter();
    var dataForDB = {};

    for( var i in data ){
        //TODO: number should
        // be initialize differently
        var cow = {};
        cow.numer = i;

        var mat = data[i];

        for( var j in mat ){
            var traits = adapter[j];
            var ma = mat[j];
            

            for( var k in ma ){
                var trait = traits[k];
                var value = ma[k];
                cow[trait]=value;
            }
        }
        dataForDB[i] = cow;
    }
    return dataForDB;
}



// the statement is executed data.length times.
// the data sequence is:
//  -> data[index]...data[k]....data[data.length]
//  -> where index <= k <= data.length
//  index -> number
//  data -> object
//  statment -> string
function loopExecute(statement, data, index, callback){
    if( data.length > index ){
        insertionData = data[index];
        delete data.index;
        orawrap.execute(statement,insertionData, function(err){
            if( err ) {
                console.log( err );
            }
            index++;
            console.log("insertion number ");
            console.log(index);
            callback(statement, data, index, loopExecute );
        });
    } else return;
}



//printing in console
function p( message, data ){
    console.log( message+" -> " );
    console.log( data );
}








///////////////////////////////////////////////////
// CONSTANTS FOR INSERTING TO AND BUILD DATABASE //
///////////////////////////////////////////////////
//TODO: Seprate constants from DBConnector


// return array string list of all 
// column names in table NAUT
function getGripirColumns(){
    return [
        'EINSTAKLINGSNUMER', //2
        'FULLT_NAFN', //4
        'GRIPUR_NAUTANUMER', //3
        'FAEDINGARAR', //8
        'MJOLKURMAGN',
        'FITUHLUTFALL',
        'PROTEINHLUTFALL',
        'AFURDAMAT',
        'FRJOSEMI',
        'FRUMUR',
        'GAEDAROD',
        'SKROKKUR',
        'NM_BOLDYPT',
        'NM_UTLOGUR',
        'JUGUR',
        'NM_JUGURFESTA',
        'NM_JUGURBAND',
        'NM_JUGURDYPT',
        'SPENAR',
        'NM_SPENALENGD',
        'NM_SPENATHYKKT',
        'NM_SPENASTADA',
        'MJALTIR',
        'SKAP',
        'ENDING',
        'HEILDAREINKUNN',
        'MA_FJOLDI',
        'MA_LEKAR',
        'MA_MJOLKAST_SEINT',
        'MA_SELUR_ILLA',
        'MA_MISMJOLKAST',
        'MA_SKAPGALLAR',
        'MODIRHEILD',
        'MODIRAFURDIR'
    ];
}

function getKynbotaColumns(){
 return [
    'numer',
    'faedingarar',
    'kyn',
    'bu',
    'busnumer',
    'gripanumer',
    'einstaklingsnumer',
    'gripur_numer',
    'mjolk_kg_1',
    'mjolk_kg_2',
    'mjolk_kg_3',
    'fita_kg_1',
    'fita_kg_2',
    'fita_kg_3',
    'protein_kg_1',
    'protein_kg_2',
    'protein_kg_3',
    'fituhlutfall_1',
    'fituhlutfall_2',
    'fituhlutfall_3',
    'proteinhlutfall_1',
    'proteinhlutfall_2',
    'proteinhlutfall_3',
    'frjosemi_1',
    'frjosemi_2',
    'frjosemi_3',
    'frumutala_1',
    'frumutala_2',
    'frumutala_3',
    'em_bandmal',
    'em_bolur',
    'em_malir',
    'em_fotstada',
    'em_jugur',
    'em_spenar',
    'em_mjaltir',
    'em_skap',
    'nm_boldypt',
    'nm_utlogur',
    'nm_yfirlina',
    'nm_malabreidd',
    'nm_malahallir',
    'nm_malabratti',
    'nm_fotstada_hlid',
    'nm_fotstada_aftan',
    'nm_klaufahalli',
    'nm_jugurfesta',
    'nm_jugurband',
    'nm_jugurdypt',
    'nm_spenalengd',
    'nm_spenathykkt',
    'nm_spenastada',
    'nm_mjaltir',
    'nm_skap',
    'mjaltarod',
    'gaedarod',
    'mjolkurmagn',
    'fitumagn',
    'proteinmagn',
    'fituhlutfall',
    'proteinhlutfall',
    'eigin_afurdir',
    'afurdamat',
    'frjosemi',
    'frumur',
    'skrokkur',
    'jugur',
    'spenar',
    'mjaltir',
    'skap',
    'ending',
    'heildareinkunn',
    'fj_daetra_afurdir',
    'oryggi_afurdir',
    'fj_daetra_frumutala',
    'oryggi_frumutala',
    'fj_daetra_em',
    'oryggi_em',
    'fj_daetra_nm',
    'oryggi_nm',
    'fj_daetra_mjaltarod',
    'oryggi_mjaltarod',
    'fj_fargadra_daetra',
    'oryggi_ending',
    'nautanumer',
    'skrasetjari',
    'skradags',
    'manudur',
    'ar',
    'fjoldi_daetra'
  ];
}

var query_comment = [
    "comment on column GRIPIR.numer is \'Sequence\'",
    "comment on column GRIPIR.einstaklingsnumer is \'einstaklingsmerkingarnumer\'",
    "comment on column GRIPIR.gripanumer is \'numer grips innan bus\'",
    "comment on column GRIPIR.nafn is \'nafn gripsins\'",
    "comment on column GRIPIR.faedingardags is \'fadingardagsetnung gripsins (dd.mm.yyyy)\'",
    "comment on column GRIPIR.faedingardagur is \'fingardagur gripsins (dd)\'",
    "comment on column GRIPIR.faedingarman is \'fadingarmanudur gripsins (mm)\'",
    "comment on column GRIPIR.faedingarar is \'fadingarar gripsins (yyyy)\'",
    "comment on column GRIPIR.kyn_numer is \'kyn (1 = naut, 2 kyr)\'",
    "comment on column GRIPIR.fadir_numer is \'fodurnumer gripsins\'",
    "comment on column GRIPIR.modir_numer is \'modurnumer gripsins\'",
    "comment on column GRIPIR.framleidslubu is \'skyrsluhaldsnumer thess bus sem gripur tilheyrir a ,hverjum tima\'",
    "comment on column GRIPIR.faedingarbu is \'fadingarbu gripins (FK_BU)\'",
    "comment on column GRIPIR.einkenni_numer is \'einkenna lykill\'",
    "comment on column GRIPIR.litur_numer is \'litarlykill\'",
    "comment on column GRIPIR.afdrif_numer is \'afdrifalykill\'",
    "comment on column GRIPIR.stofn_numer is \'Stofn grips ( Mjolkurkyr, Holdakyr, ....... )\'",
    "comment on column GRIPIR.stada_numer is \'Stada grips i kerfinu ( Lifandi, i framleidslu, ,Slatrad, Drapst ..... )\'",
    "comment on column GRIPIR.danardags is \'Forgunardagur grips\'",
    "comment on column GRIPIR.byrjunardagur is \'Fyrsti dagur i framleidislu ( fadingardagurfyrsta kalfs )\'",
    "comment on column GRIPIR.valnumer is \'Valnumer grips\'",
    "comment on column GRIPIR.bidur_slatrunar is \'Grip verdur slatrad fljotlega. Hann birtist ekki a lista yfir fangskodanir\'"];


var dropStatement = 
    "BEGIN "+ 
      "EXECUTE IMMEDIATE :drop; "+
    "EXCEPTION "+
      "WHEN OTHERS THEN "+
       "IF SQLCODE != -942 THEN "+ 
          "RAISE; "+
        "END IF; "+
    "END;";

var dropTable ={
    drop_gripir:[
        dropStatement,
        {drop: "DROP TABLE GRIPIR"}
    ],
    drop_kynbotamat:[
        dropStatement,
        {drop: "DROP TABLE KYNBOTAMAT"}
    ],
    drop_naut:[
        dropStatement,
        {drop: "DROP TABLE NAUT"}
    ]
};



/*function checkNameExists(index){
    var colName = getKynbotaColumns();
    var exists = false;
    for(var i in colName ){

        if( colName[i]===index ){
            return true;
        }
    }
    p("colName[i]",colName[i]);
    p("index",index);
    return false;
}*/


/*function testing(){

    //p("testing","testing");

    var bindVar = ":skrasetjari,:numer,:einstaklingsnumer,:gripur_numer,:nautanumer,:skradags,:manudur,:ar";               
    
    var bindStr = " skrasetjari, numer, einstaklingsnumer, gripur_numer, nautanumer, skradags, manudur, ar";              

    var bindVal = {
        skrasetjari:'10',
        numer:'10',            
        einstaklingsnumer:'10',
        gripur_numer:'10',     
        nautanumer:'10',      
        skradags:'10',         
        manudur:'10',          
        ar:'10'               
    };


    var statement=
        "INSERT INTO KYNBOTAMAT ("+bindStr+")"+
        "VALUES ("+bindVar+")";

    orawrap.execute(statement,bindVal, function(err){
        if( err ) {
            console.log( err );
            p("bindVal",bindVal);
            p("bindVar",bindVar);
        }
        //index++;
        //console.log("index");
        //console.log(index);
        //callback(statement, data, index, loopExecute );
    });
}*/




/**
*
* code from: https://jsao.io/2015/03/making-a-wrapper-module-for-the-node-js-driver-for-oracle-database/
* 
*
*/

/*
var oracledb = require('oracledb');
var Promise = require('es6-promise').Promise;
var async = require('async');
var pool;
var buildupScripts = [];
var teardownScripts = [];
 
module.exports.OBJECT = oracledb.OBJECT;

// create reused connection to database
function createPool(config) {
    return new Promise(function(resolve, reject) {
        oracledb.createPool(
            config,
            function(err, p) {
                if (err) {
                    return reject(err);
                }
 
                pool = p;
 
                resolve(pool);
            }
        );
    });
}
 
module.exports.createPool = createPool;

// diconnect from database
function terminatePool() {
    return new Promise(function(resolve, reject) {
        if (pool) {
            pool.terminate(function(err) {
                if (err) {
                    return reject(err);
                }
 
                resolve();
            });
        } else {
            resolve();
        }
    });
}
 
module.exports.terminatePool = terminatePool;
 
function getPool() {
    return pool;
}
 
module.exports.getPool = getPool;
 
function addBuildupSql(statement) {
    var stmt = {
        sql: statement.sql,
        binds: statement.binds || {},
        options: statement.options || {}
    };
 
    buildupScripts.push(stmt);
}
 
module.exports.addBuildupSql = addBuildupSql;
 
function addTeardownSql(statement) {
    var stmt = {
        sql: statement.sql,
        binds: statement.binds || {},
        options: statement.options || {}
    };
 
    teardownScripts.push(stmt);
}
 
module.exports.addTeardownSql = addTeardownSql;
 
function getConnection() {
    return new Promise(function(resolve, reject) {
        pool.getConnection(function(err, connection) {
            if (err) {
                return reject(err);
            }
 
            async.eachSeries(
                buildupScripts,
                function(statement, callback) {
                    connection.execute(statement.sql, statement.binds, statement.options, function(err) {
                        callback(err);
                    });
                },
                function (err) {
                    if (err) {
                        return reject(err);
                    }
 
                    resolve(connection);
                }
            );
        });
    });
}
 
module.exports.getConnection = getConnection;
 
function execute(sql, bindParams, options, connection) {
    return new Promise(function(resolve, reject) {
        connection.execute(sql, bindParams, options, function(err, results) {
            if (err) {
                return reject(err);
            }
 
            resolve(results);
        });
    });
}
 
module.exports.execute = execute;
 
function releaseConnection(connection) {
    async.eachSeries(
        teardownScripts,
        function(statement, callback) {
            connection.execute(statement.sql, statement.binds, statement.options, function(err) {
                callback(err);
            });
        },
        function (err) {
            if (err) {
                console.error(err); //don't return as we still need to release the connection
            }
 
            connection.release(function(err) {
                if (err) {
                    console.error(err);
                }
            });
        }
    );
}
 
module.exports.releaseConnection = releaseConnection;
 
function simpleExecute(sql, bindParams, options) {
    options.isAutoCommit = true;
 
    return new Promise(function(resolve, reject) {
        getConnection()
            .then(function(connection){
                execute(sql, bindParams, options, connection)
                    .then(function(results) {
                        resolve(results);
 
                        process.nextTick(function() {
                            releaseConnection(connection);
                        });
                    })
                    .catch(function(err) {
                        reject(err);
 
                        process.nextTick(function() {
                            releaseConnection(connection);
                        });
                    });
            })
            .catch(function(err) {
                reject(err);
            });
    });
}
 
module.exports.simpleExecute = simpleExecute;*/