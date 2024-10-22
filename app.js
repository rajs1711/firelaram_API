'use strict'
const fastify = require('fastify')();

fastify.register(require('./routes/api'), { prefix: '/api' });
fastify.register(require('fastify-cors'), { 
  // put your options here
  origin: "*",
  methods: ['GET', 'PUT', 'POST']
});

fastify.register(require('fastify-bcrypt'),{ saltWorkFactor: 10 });
fastify.register(require('fastify-jwt'), { secret: 'Indi12345Pt29Satqsknm5629nmvxdskl074vb' , sign: { expiresIn:"1d" }});
fastify.register(require('fastify-auth'));

// Export a handler function instead of starting the server with fastify.listen
module.exports = async (req, res) => {
  await fastify.ready().then(() => {
  console.log(fastify.printRoutes());
}); 
// Ensure Fastify is ready to handle requests
  fastify.server.emit('request', req, res); // Pass the request to Fastify's HTTP server
};

