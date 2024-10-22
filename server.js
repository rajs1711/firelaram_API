'use strict'
//var deviceSocketMap = require('./config/socketmap');
const fastify = require('./app')

// Export a handler function instead of starting the server with fastify.listen
module.exports = async (req, res) => {
  await fastify.ready(); // Ensure Fastify is ready to handle requests
  fastify.server.emit('request', req, res); // Pass the request to Fastify's HTTP server
};


/*const start = async () => {
    try {
        await fastify.listen(process.env.PORT || 3000, '0.0.0.0');
        
      await fastify.listen(process.env.PORT || 3000, '0.0.0.0')
      fastify.log.info(`server listening on 3000`);
      const channel = "webserver_channel";
      fastify.redis.pubsub.subscribe(channel, (error, count) => {
        if (error) {
          fastify.log.error(error);
        }
        fastify.log.info(`Subscribed to ${count} channel. Listening for updates on the '${channel}' channel.`)
      });
      
      fastify.redis.pubsub.on('message', (channel, message) => {
        fastify.log.info(`We received the following message from '${channel}': ${message}`)
        const sendData = JSON.parse(message);
        fastify.log.info(sendData);
        if (deviceSocketMap.hasDeviceID_SocketMap(sendData['deviceID'])) {
          sendData['socket'] = deviceSocketMap.getDeviceID_SocketMap(sendData['deviceID']);
          fastify.ipc.of.world.emit('message', sendData);
        }
        else
        {
          fastify.log.info("Device not registered. No operation permitted for this device.");
        }
      });
      
    } 
    catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
}
start();*/
