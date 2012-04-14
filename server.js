var U = require('util');
var express = require('express');
var app = express.createServer();

app.configure(function(){
    app.set('view engine', 'jade');
    app.set('view options', { layout: false });
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(app.router);
});

app.get('/', function(req, res){
  res.render('index');
});

app.listen(3000);
