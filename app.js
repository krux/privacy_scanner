
/**
 * Module dependencies.
 */

var express = require('express');
var app = module.exports = express.createServer();
var port = process.argv[3] || 3000;
var config = process.argv[5] || {};

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  app.set('PSConfig', {
    ajaxPrefix: '/mock_data'
  });
});

app.configure('production', function() {
  app.use(express.errorHandler()); 
  app.use(require('stylus').middleware({
    force: true,
    src: __dirname + '/public',
    dest: __dirname + '/public',
    compress: true
  }));
});

// Routes
app.get('/', function(req, res) {
  res.render('index', {
    title: 'Privacy Scanner',
    PSConfig: app.set('PSConfig')
  });
});

app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
