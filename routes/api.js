/**
 * Created by nmondon on 17/07/2014.
 */


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
