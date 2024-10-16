'use strict'
const fastify = require('fastify')({
    bodyLimit: 1048576 * 2,
   // logger: { prettyPrint: true, level: 'info', file: '/home/pratyush/nodeServer/logs/backend_server/backend.log' },
});


const redis = require('redis').createClient({ host: '127.0.0.1' })

fastify
  .register(require('fastify-redis'), {
      host: '127.0.0.1',
      namespace: 'pubsub'
  })
  .register(require('fastify-redis'), {
      client: redis,
      namespace: 'normal'
  });


fastify.register(require('fastify-cors'), { 
  // put your options here
  origin: "*",
  methods: ['GET', 'PUT', 'POST']
});

//fastify.register(require('./plugins/nodeIPCPlugin'));
fastify.register(require('fastify-bcrypt'),{ saltWorkFactor: 10 });
fastify.register(require('fastify-jwt'), { secret: 'Indi12345Pt29Satqsknm5629nmvxdskl074vb' , sign: { expiresIn:"1d" }});
fastify.register(require('fastify-auth'));
fastify.register(require('./routes/api'), { prefix: 'api' });


module.exports = fastify
