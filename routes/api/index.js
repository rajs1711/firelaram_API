const apiRoutes = async (app, options) => {
  app.register(require('./useraccount'), { prefix: 'users' });
  app.register(require('./device'), { prefix: 'device' });
  app.get('/', async (request, reply) => {
    return { hello: 'world' };
  });
};

module.exports = apiRoutes;
