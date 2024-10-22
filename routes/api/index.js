const apiRoutes = async (app, options) => {
  app.register(require('./useraccount/index'), { prefix: '/users' });
  app.register(require('./device/index'), { prefix: '/device' });
  app.get('/', async (request, reply) => {
    return { hello: 'world' };
  });
};

module.exports = apiRoutes;
