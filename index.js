/**
 * Created by nmondon on 17/07/2014.
 */

var express = require('express')
    , routes = require('./routes')
    , api = require('./routes/api')
    , http = require('http')
    , path = require('path')
    , app = module.exports = express();

/**
 * Configuration
 */
// set port
app.set('port', process.env.PORT || 3000);
// set views with ejs
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
// set assets dir
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Routes - index html page
 */
// index
app.route('/').get(routes.index);

// test
app.route('/test').get(routes.test);

/**
 * Routes - json api
 */
// hello
app.route('/api/hello').get(api.hello);

// deputes
app.route('/api/synthese').get(api.synthese);

/**
 * Launch server
 */
var port = Number(process.env.PORT || 5000);
app.listen(port, function () {
	console.log("Listening on " + port);
});