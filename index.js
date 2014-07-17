/**
 * Created by nmondon on 17/07/2014.
 */

var express = require('express')
    , api = require('./api')
    , http = require('http')
    , path = require('path')
    , app = module.exports = express();



/**
 * Configuration
 */
// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.favicon());
// router, has to be below bodyParser
app.use(app.router);

// development only
if (app.get('env') === 'development') {
    app.use(express.errorHandler());
}

// production only
if (app.get('env') === 'production') {
    // TODO
};

/**
 * Routes
 */
// serve index and view partials
app.get('/', routes.index);