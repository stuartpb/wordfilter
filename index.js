var express = require("express");
var request = require("request");
var xkcdify = require("xkcdify");
var urlLib = require("url");

module.exports = function appctor(cfg) {
    var app = express();
    app.get('/xkcdify/:url(*)', function(req, res, next) {
      request(req.params.url, function(err, response, body) {
        if (err) return next(err);
        if (response.headers['content-type']
          && response.headers['content-type'].slice(-4)=='html') {
          res.set(response.headers)
            .status(response.statusCode)
            .send(xkcdify.html(body));
        } else {
          res.set(response.headers)
            .status(response.statusCode)
            .send(response.statusCode, body);
        }
      });
    });

    // To write a proper hijacking proxy that doesn't keep the original host
    // info inside the hostname, you need to do deep rewriting on all hrefs,
    // and all URLs inside CSS (and a shim to hijack XHR etc).
    // This is mondo hacky, and it doesn't work for things like assets
    // referenced in CSS (although it should?), but it works well enough for a
    // demo.
    // TODO: Some kind of middleware that can do this based on the route
    // (automatically listen to referers and redirect anything referred from
    // the above route)
    app.get('/*', function(req, res, next) {
      var ref = req.get('referer');
      ref = ref && urlLib.parse(ref);
      if (ref && (!ref.host || ref.host == req.hostname)) {
        //this is the part that would come from parsing the route
        var endOfFirstLevel = ref.path.indexOf('/',1)+1;
        var refOrigUrl = ref.path.substring(endOfFirstLevel);
        var newUrl = urlLib.resolve(refOrigUrl, req.url);
        res.redirect(ref.path.substring(0,endOfFirstLevel) + newUrl);
      }
      else res.status(404).send();
    });

    return app;
};