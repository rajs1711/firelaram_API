const fastify = require('fastify')();
fastify.register(require('./routes/api'));
//fastify.register(require('fastify-bcrypt'),{ saltWorkFactor: 10 });
//fastify.register(require('fastify-jwt'), { secret: 'Indi12345Pt29Satqsknm5629nmvxdskl074vb' , sign: { expiresIn:"1d" }});
//fastify.register(require('fastify-auth'));

// Export a handler function instead of starting the server with fastify.listen
fastify.get('/',(request,response)=>{
  return  "hello";
})
module.exports = async (req, res) => {
  await fastify.ready();
  fastify.server.emit('request', req, res); 
};

