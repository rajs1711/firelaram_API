const fastifyPlugin = require('fastify-plugin');
const ipc = require('node-ipc');
const nodemailer = require('nodemailer');
const deviceModel = require('../models/deviceModel')
var deviceSocketMap = require('../config/socketmap')

const redis = require("redis");
const redisclient = redis.createClient();

const admin = require('../config/firebase');

const emailKeyName = "totEmailCount";
const maxEmails	 = 100;
const senderEmail = 'softchip.ts@gmail.com';
const senderPasswd = 'lmgv ohdl jugi roqd';

/**
 * Create a new Node IPC client and decorate Fastify with its instance.
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Plugin's options that will be sent to Socket.io contructor
 * @param {Function} next - Fastify next callback
 */
function fastifyNodeIPC(fastify, options, next) {
  try {
	  ipc.config.id   = 'backend';
	  ipc.config.retry= 2000;
	  ipc.config.silent = true;
      ipc.connectTo('world');
      ipc.of.world.on('connect', connectedToServer);
      ipc.of.world.on('disconnect', disconnectedFromServer);
      ipc.of.world.on('message', dataRecFromTCPServer);
      fastify.decorate('ipc', ipc);
      next();
  } 
  catch (error) {
      next(error);
  }
}

function connectedToServer() {
    console.log("connected");
}

function disconnectedFromServer() {
    console.log("TCP Server down....");
}

function pushNotificationToDevice(username, deviceName, deviceID, deviceStatus, alertMsg, notificationData) {
	const title_alert = deviceName + " Zone Alert";
	const message_notification = { 
		notification: {
			title: title_alert,
			body: alertMsg,
			sound: "notify",
			channel_id: "SMART_ALARM_ALERT"
        },
        data: notificationData
    };
	
	const notification_options = {
		priority: "high",
		timeToLive: 60 * 60 * 24
	};
	
	redisclient.get(username, function(err, res) {
		if (res) {
			const registrationToken = res;
			admin.firebaseadmin.messaging().sendToDevice(registrationToken, message_notification, notification_options).then (response => {
				;
			}).catch (error => {
				console.log("Error push notification");
				console.log(error);
			});
		}
	});
}

function adminPushNotificationToDevice(username, deviceName, deviceID, deviceStatus, alertMsg, notificationData) {
	redisclient.get(username, function(err, registrationToken) {
		if (registrationToken) {
			const title_alert = deviceName + " Zone Alert";
			const message_notification = { 
				notification: {
					title: title_alert,
					body: alertMsg,
					sound: "notify",
					channel_id: "SMART_ALARM_ALERT"
				},
				data: notificationData
			};
	
			const notification_options = {
				priority: "high",
				timeToLive: 60 * 60 * 24
			};
			admin.firebaseadmin.messaging().sendToDevice(registrationToken, message_notification, notification_options).then (response => {
				;
			}).catch (error => {
				console.log("Error admin 1 push notification");
				console.log(error);
			});
		}
	});
}

async function dataRecFromTCPServer(dataReceived) {
    if (dataReceived.hasOwnProperty('status')) {
		//Update device status if connected or not
        if (dataReceived['status'] == 0) {
            tempSocket = deviceSocketMap.getDeviceID_SocketMap(dataReceived['deviceID']);
            
            if (tempSocket == dataReceived['socket']) {
            
				res = await deviceModel.updateDeviceStatus(dataReceived['deviceID'], 0);
				deviceSocketMap.deleteDeviceID_SocketMap(dataReceived['deviceID']);
				notificationData = {id:res.deviceID, status:"false"};
				if (res.retVal) {
					pushNotificationToDevice(res.user, res.deviceName, res.deviceID, "false", res.alert, notificationData);
				}
				if ((res.groupAdmin != "") && (res.user != res.groupAdmin)) {
					adminPushNotificationToDevice(res.groupAdmin, res.deviceName, res.deviceID, "false", res.alert, notificationData);
				}
			}
        }
        else {
			res = await deviceModel.updateDeviceStatus(dataReceived['deviceID'], 1);
			notificationData = {id:res.deviceID, status:"true"};
			if (res.retVal) {
				pushNotificationToDevice(res.user, res.deviceName, res.deviceID, "true", res.alert, notificationData);
			}
			if ((res.groupAdmin != "") && (res.user != res.groupAdmin)) {
				adminPushNotificationToDevice(res.groupAdmin, res.deviceName, res.deviceID, "true", res.alert, notificationData);
			}
		}
    }
    
    else if (dataReceived.hasOwnProperty('register')) {
		//Check if device is registered or not. If yes then update device status
		res = await deviceModel.getDevice(dataReceived['deviceID']);
		if ((res) && (res.length > 0)) {
			dataReceived['status'] = 1;
			deviceSocketMap.saveDeviceID_SocketMap(dataReceived['deviceID'], dataReceived['socket']);
			ipc.of.world.emit('message', dataReceived);
			res = await deviceModel.updateDeviceStatus(dataReceived['deviceID'], 1);
			notificationData = {id:res.deviceID, status:"true"};
			if (res.retVal) {
				pushNotificationToDevice(res.user, res.deviceName, res.deviceID, "true", res.alert, notificationData);
			}
			if ((res.groupAdmin != "") && (res.user != res.groupAdmin)){
				adminPushNotificationToDevice(res.groupAdmin, res.deviceName, res.deviceID, "true", res.alert, notificationData);
			}
		}
		else {
			dataReceived['status'] = 0;
			deviceSocketMap.deleteDeviceID_SocketMap(dataReceived['deviceID']);
			ipc.of.world.emit('message', dataReceived);
		}
	}
	
	else if (dataReceived.hasOwnProperty('data')) {
		if (deviceSocketMap.hasDeviceID_SocketMap(dataReceived['deviceID'])) {
			var data = dataReceived['data'];
			var id = dataReceived['deviceID'];
			var alert = "";
			const tempData = Number(data);
			var zoneData = [];
			for (var i = 0; i < 8; i++) {
				zoneData[i] = (tempData >> i) & 1;
				if (zoneData[i] == 1) {
					alert += "ZONE " + (i+1).toString() + ", ";
				}
			}
			alert = alert.slice(0, -2) + " ALERT";
			var redisKey = id + "_zonedata";
			var newDate = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			var zonedataJson = {firealarmID: id,zone1Data:zoneData[0],zone2Data:zoneData[1],zone3Data:zoneData[2],zone4Data:zoneData[3],zone5Data:zoneData[4],zone6Data:zoneData[5],zone7Data:zoneData[6],zone8Data:zoneData[7],createdAt:newDate};
			redisclient.set(redisKey,JSON.stringify(zonedataJson));
			
			notificationData = {id: id,zone1Data:zoneData[0].toString(),zone2Data:zoneData[1].toString(),zone3Data:zoneData[2].toString(),zone4Data:zoneData[3].toString(),zone5Data:zoneData[4].toString(),zone6Data:zoneData[5].toString(),zone7Data:zoneData[6].toString(),zone8Data:zoneData[7].toString(),createdAt:newDate};

			res = await deviceModel.updateDeviceDataLog(id, zoneData, alert);
			tempSocket = deviceSocketMap.getDeviceID_SocketMap(dataReceived['deviceID']);
			
			if (dataReceived.hasOwnProperty('seqNo')) { //For SIA Packet
				delete dataReceived['deviceID'];
				delete dataReceived['data'];
				dataReceived.socket = tempSocket; 
				dataReceived.returnVal = res.retVal;
				ipc.of.world.emit('message', dataReceived);	
			}
			else { //For esp32 based device
				ipc.of.world.emit('message', {"socket":tempSocket, "returnVal":res.retVal});
			}
			
			var alertUserMsg = alert;
			var res1 = await deviceModel.getZoneName(id);
			if (Array.isArray(res1) && !res1.length)
			{
				alertUserMsg = alert;
			}
			else
			{
				alertUserMsg = "";
				for (var i = 0; i < 8; i++) {
					if (zoneData[i] == 1) {
						alertUserMsg += res1[i] + ", ";
					}
				}
				alertUserMsg = alertUserMsg.slice(0, -2) + " ALERT";
			}
			
			if (res.retVal) {
				pushNotificationToDevice(res.user, res.deviceName, res.deviceID, "null", res.alert, notificationData);
			}
			if ((res.groupAdmin != "") && (res.user != res.groupAdmin)) {
				adminPushNotificationToDevice(res.groupAdmin, res.deviceName, res.deviceID, "null", res.alert, notificationData);
			}
			
			var res2 = await deviceModel.checkEmailEnabled(res.deviceID);
			
			if ((res2.returnVal) && (res2.emailEnabled))
			{
				var userName = "";
				if (res.user != "")
				{
					userName = res.user.split("_")[0];
				}
				var organizationName = await deviceModel.getOrganizationName(userName);
				var emailSubj = res.deviceName + " Health Monitoring Alarm " + organizationName;
				alertUserMsg = res.deviceName + " ZONE ALERT. " + alertUserMsg;
				//Send Email alert for zone alert
				generateMail(res2.emailList, emailSubj, alertUserMsg); 
			}
		}
		else {
			ipc.of.world.emit('message', {"socket":"", "returnVal":false});
		}
	}
	else if (dataReceived.hasOwnProperty('sendEmail')) {
		if (deviceSocketMap.hasDeviceID_SocketMap(dataReceived['deviceID'])) {
			var device_id = dataReceived['deviceID'];
			var pinNo = dataReceived['pin'];
			var pinVal = dataReceived['pinVal'];
			var res1 = await deviceModel.checkEmailEnabled(res.deviceID);
			
			if ((res1.returnVal) && (res1.emailEnabled))
			{
				var alertsList = ["TEST", "HOOTER OFF", "HOOTER ON", "RESET"];
				const userName = await deviceModel.getUsernameDeviceId(device_id);
				const organizationName = await deviceModel.getOrganizationName(userName);
				const deviceNameT = await deviceModel.getFirealarmName(device_id);
				
				var emailSubj = deviceNameT + " " + alertsList[Number(pinNo) - 1] + " Alert " + organizationName;
				var emailMsg = deviceNameT + " " + alertsList[Number(pinNo) - 1] + " Alert ";
				//Send Email alert for zone alert
				generateMail(res1.emailList, emailSubj, emailMsg); 
			}
		}
		
	}
}

async function generateMail(receiverEmailIds, emailSubject, emailBody) {
	let totalEmailsSent = 0;
	console.log("Testing email temp code");
	console.log(receiverEmailIds);
	console.log(emailSubject);
	console.log(emailBody);
	redisclient.get(emailKeyName, function(err, data) {
		if(err) {
			console.log("totEmailCount key doesn't exist or failed to read it's value stored in Redis.");
		}
		else {
			totalEmailsSent = parseInt(data,10);
		}
		
		if (((totalEmailsSent < maxEmails) || isNaN(totalEmailsSent)) && (receiverEmailIds.trim() !== ""))
		{
			let transporter = nodemailer.createTransport({
				host: 'smtp.gmail.com',
				port: 465,
				secure: true,
				auth: {
					user: senderEmail,
					pass: senderPasswd
				},
				logger: false,
				debug: false // include SMTP traffic in the logs
			});
			
			let mailOptions = {
				to: receiverEmailIds,
				subject: emailSubject,
				text: 'Hello',
				html: emailBody,
			};
			
			transporter.sendMail(mailOptions, function(error, info) {
				if (error) {
					console.log(error);
				} 
				else {
					totalEmailsSent += receiverEmailIds.split(",").length;
					console.log('Email sent: ' + info.response);
					redisclient.set(emailKeyName, totalEmailsSent, function(err, data) {
						if (err) {
							console.log("Error while setting key value totEmailCount");
						}
                        console.log("Set total email sent count in Redis.");
                        //redisclient.quit();
                    });
				}
			});
		}
	});
}

/*async function generateMailForZoneAlert(senderEmailId, senderPasswd, receiverEmailId, emailSubject, emailBody, zoneAlert) {
    // Generate SMTP service account from ethereal.email
    let account = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport(
        {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: senderEmailId,
                pass: senderPasswd
            },
            logger: false,
            debug: false // include SMTP traffic in the logs
        },
        {
            // default message fields

            // sender info
            from: 'Admin <pratyush@geotechsystems.in>',
            headers: {
                'X-Laziness-level': 1000 // just an example header, no need to use this
            }
        }
    );

    // Message object
    let message = {
        // Comma separated list of recipients
        to: receiverEmailId,

        // Subject of the message
        subject: emailSubject,

        // plaintext body
        text: 'Hello',

        // HTML body
        html: emailBody,
    };

    let info = await transporter.sendMail(message);

    console.log('Message sent successfully!');
    console.log(nodemailer.getTestMessageUrl(info));

    // only needed when using pooled connections
    transporter.close();
    return true;
}*/

module.exports = fastifyPlugin(fastifyNodeIPC);
