var http = require("http");
var U    = require('util');

http.createServer(function(request, response) {
  U.debug( U.inspect( request.url ) );
  U.debug( U.inspect( request.headers ) ); 

  response.writeHead(204);
  response.end();
}).listen( process.argv[3] || 8000 );
