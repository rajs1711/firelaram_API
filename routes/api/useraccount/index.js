const userController = require('../../../controller/userController');
const { getSingleUserSchema, updateSingleUserSchema, updateSingleUserPasswordSchema, userLoginSchema, registerSchema,forgotPasswdUsernameSchema } = require('./schema');


function verifyJWT (request, reply, done) {
	const jwt = this.jwt
	const redis = this.redis;

    if (request.body && request.body.failureWithReply) {
		reply.code(401).send({ error: 'Unauthorized' })
		return done(new Error())
    }

    if (!request.raw.headers.auth) {
		return done(new Error('Missing token header'))
    }

    jwt.verify(request.raw.headers.auth, onVerify)

    function onVerify (err, decoded) {
		if (err || !decoded.username) {
			return done(new Error('Token not valid'))
		}
		else {
			var tempUsername = null;
			if (request.method == 'GET') {
				tempUsername = request.query.username;
			}
			else {
				tempUsername = request.body.username;
			}
			if (decoded.username !== tempUsername) {
				return done(new Error('Token not valid'))
			}
			else {
				const tempKey = decoded.username + "_token";
				redis.normal.get(tempKey, (err, val) => {
					if (val !== null) {
						if (decoded.iat < val)
							return done(new Error('Token expired'));
						else
							done();
					}
					else
						return done(new Error('Token not valid'))
				});
			}
		}
	}
}

async function userroutes (fastify, options) {
	fastify.decorate('verifyJWT', verifyJWT);
    
    fastify.route({
			method: 'GET',
			url: '/',
			schema: getSingleUserSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: userController.getSingleUser
	});

    fastify.route({
			method: 'PATCH',
			url: '/update',
			schema: updateSingleUserSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: userController.updateSingleUser
	});

    fastify.route({
			method: 'PATCH',
			url: '/updatepassword',
			schema: updateSingleUserPasswordSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: userController.updateSingleUserPassword
	});
	
	fastify.route({
			method: 'POST',
			url: '/login',
			schema: userLoginSchema,
			handler: userController.userLogin
	});
	
	fastify.route({
			method: 'POST',
			url: '/weblogin',
			schema: userLoginSchema,
			handler: userController.userWebLogin
	});
	
	fastify.route({
			method: 'POST',
			url: '/register',
			schema: registerSchema,
			handler: userController.registerDevice
	});
	
	fastify.route({
			method: 'PATCH',
			url: '/updatedefaultpassword',
			schema: updateSingleUserPasswordSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: userController.updateSingleUserDefaultPassword
	});
	
	fastify.route({
			method: 'POST',
			url: '/forgotPasswordUsername',
			schema: forgotPasswdUsernameSchema,
			handler: userController.checkUserForgotPasswd
	});
	
}
module.exports = userroutes
