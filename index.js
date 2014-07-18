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
app.get('/', routes.index);

/**
 * Routes - json api
 */
// hello
app.get('/api/hello', api.hello);

// deputes
app.get('/api/deputes', api.deputes);

// picture
app.get('/api/picture', api.picture);

/**
 * Launch server
 */
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});