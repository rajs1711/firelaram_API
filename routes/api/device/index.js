const deviceController = require('../../../controller/deviceController');
const { deviceStatusSchema, devicePinStatusSchema, wifiCredsSchema, serverCredsSchema, softResetSchema, getLogSchema, getDevicesSchema, getdeviceStatusSchema, getZoneNameSchema, setZoneNameSchema, setSiteNameSchema,upgradeFirmwareSchema,zoneReportSchema,devicestatusReportSchema } = require('./schema');
var deviceSocketMap = require('../../../config/socketmap');


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

async function sendDataTCPServer(fastify, request, reply) {
	var sendData = request.body
	delete sendData["username"];
	if (deviceSocketMap.hasDeviceID_SocketMap(sendData['deviceID'])) {
		sendData['socket'] = deviceSocketMap.getDeviceID_SocketMap(sendData['deviceID']);
		await fastify.ipc.of.world.emit('message', sendData);
		return reply.send({returnVal:true});
	}
	if (sendData.hasOwnProperty('update')) {
		if (sendData['update']) {
			console.log("sending update message");
			await fastify.ipc.of.world.emit('message', sendData);
			return reply.send({returnVal:true});
		}
	}
	return reply.send({returnVal:false});
}

async function getDeviceStatus(fastify, request, reply) {
	var sendData = request.body
	if (deviceSocketMap.hasDeviceID_SocketMap(sendData['deviceID'])) {
		return reply.send({returnVal:true, status: true});
	}
	return reply.send({returnVal:true, status: false});
}

function getDeviceOnlineOfflineStatus(fastify, request, reply) {
	var replyStatus = {"onlineStatus":0, "updatedAt": new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ')};
	if (deviceSocketMap.hasDeviceID_SocketMap(request.query.deviceID)) {
		replyStatus["onlineStatus"] = 1;
		return reply.send(replyStatus);
	}
	return reply.send(replyStatus);
}

function getZoneData(fastify, request, reply) {
	const redis = fastify.redis;
	const redisKey = request.query.deviceID + "_zonedata";
	redis.normal.get(redisKey, (err, val) => {
		if (val !== null) {
			reply.send([JSON.parse(val)]);
		}
		else {
			return deviceController.getDeviceLogData(request,reply);
		}
	});
	
}

async function deviceroutes (fastify, options) {
	fastify.decorate('verifyJWT', verifyJWT);
    
    fastify.route({
			method: 'POST',
			url: '/pinstatus',
			schema: devicePinStatusSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: (req,reply) => { sendDataTCPServer(fastify, req, reply) }
	});
	
	fastify.route({
			method: 'POST',
			url: '/updatefirmware',
			schema: upgradeFirmwareSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: (req,reply) => { sendDataTCPServer(fastify, req, reply) }
	});

	fastify.route({
		method: 'GET',
		url: '/getdevices',
		schema: getDevicesSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.getDevicesList
	});

	fastify.route({
		method: 'GET',
		url: '/getdevicestatus',
		schema: getdeviceStatusSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: (req,reply) => { getDeviceOnlineOfflineStatus(fastify, req, reply) }//deviceController.getDeviceStatus
	});
	
	fastify.route({
			method: 'POST',
			url: '/devicestatus',
			schema: deviceStatusSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: (req,reply) => { getDeviceStatus(fastify, req, reply) }
	});
	
	fastify.route({
			method: 'POST',
			url: '/wificreds',
			schema: wifiCredsSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: (req,reply) => { sendDataTCPServer(fastify, req, reply) }
	});
	
	fastify.route({
			method: 'POST',
			url: '/servercreds',
			schema: serverCredsSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: (req,reply) => { sendDataTCPServer(fastify, req, reply) }
	});
	
	fastify.route({
			method: 'POST',
			url: '/reset',
			schema: softResetSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: (req,reply) => { sendDataTCPServer(fastify, req, reply) }
	});
	
	fastify.route({
			method: 'GET',
			url: '/getlog',
			schema: getLogSchema,
			preHandler: await fastify.auth([fastify.verifyJWT]),
			handler: (req,reply) => { getZoneData(fastify, req, reply) } //deviceController.getDeviceLogData
	});

	fastify.route({
		method: 'GET',
		url: '/getmultilog',
		schema: getLogSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.getDeviceLogMultiData
	});
	
	fastify.route({
		method: 'GET',
		url: '/getmultiDeviceslog',
		schema: getLogSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.getMultiDevicesLog
	});

	fastify.route({
		method: 'GET',
		url: '/zonename',
		schema: getZoneNameSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.getZoneName
	});

	fastify.route({
		method: 'POST',
		url: '/setzonename',
		schema: setZoneNameSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.setZoneName
	});
	
	fastify.route({
		method: 'POST',
		url: '/setsitename',
		schema: setSiteNameSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.setSiteName
	});
	
	fastify.route({
		method: 'POST',
		url: '/zonereport',
		schema: zoneReportSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.getZoneReport
	});
	
	fastify.route({
		method: 'POST',
		url: '/devicestatusreport',
		schema: devicestatusReportSchema,
		preHandler: await fastify.auth([fastify.verifyJWT]),
		handler: deviceController.getDeviceStatusReport
	});
}
module.exports = deviceroutes
