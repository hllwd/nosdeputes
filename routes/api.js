/**
 * Created by nmondon on 17/07/2014.
 */

var http = require('http');


/**
 * Hello world
 * @param req
 * @param res
 */
exports.hello = function(req, res){
    res.json({
        hello: 'world'
    });
};

/**
 * "les chiffres correspondant aux 12 derniers mois ou à toute la législature affichés sur la synthèse"
 * @param req
 * @param res
 */
exports.synthese = function(req, res){
    var url = 'http://www.nosdeputes.fr/synthese/data/json';
    var json = '';

    http.get(url ,function (syntheseRes) {
        console.log('got response from nosdeputes.fr: ' + syntheseRes.statusCode);

        // concate json data
        syntheseRes.on('data', function (chunk) {
            json += chunk;
        });

        // send to the client
        syntheseRes.on('end', function () {
            res.json(JSON.parse(json));
        });

    }).on('error', function (e) {
        console.log('got error on request to nodeputes.fr : ' + e.message);
    });
};

/**
 *
 * @param req
 * @param res
 */
exports.picture = function(req, res){
    res.json({
        hello: 'world'
    });
};

