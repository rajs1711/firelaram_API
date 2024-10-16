const WebSocket = require('ws');
const ipc = require('node-ipc');
var jwt = require('jsonwebtoken');
const redis = require("redis");
const redisclient = redis.createClient();

const secret = 'Indi12345Pt29Satqsknm5629nmvxdskl074vb';

const wss = new WebSocket.Server({ port: 5000 });

const clientInitTimeout = 5000;

let ws_sockets = [];
let ws_useridIdSocket_Map = new Map();
let wsSocket_bool_Map = new Map();
let deviceID_userID_Map = new Map();
let deviceID_Socket_Map = new Map();

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//IPC connection to server

ipc.config.id   = 'websocketBackend';
ipc.config.retry= 2000;
ipc.config.silent = true;
ipc.connectTo('wsserver');
ipc.of.wsserver.on('connect', connectedToServer);
ipc.of.wsserver.on('disconnect', disconnectedFromServer);
ipc.of.wsserver.on('message', dataRecFromTCPServer);

function connectedToServer() {
    console.log("connected to tcp server");
}

function disconnectedFromServer() {
    console.log("TCP Server down.");
    wss.clients.forEach((ws_socket) => {
		ws_socket.close();
		terminateSocket(ws_socket);
		if (wsSocket_bool_Map.has(ws_socket)) {
			wsSocket_bool_Map.delete(ws);
		}
	});	
}

function sendDataToWsClient(dataToSend, ws_client_socket) 
{
	try {
		ws_client_socket.send(JSON.stringify(dataToSend));
	}
	catch(error) {
		console.log("error in sending data to ws client.");
		console.log(error);
	}
}

async function dataRecFromTCPServer(dataReceived) {

	try {
		if (!(dataReceived.hasOwnProperty('data') || dataReceived.hasOwnProperty('status'))) {
			return 0;
		}
	}
	catch(err) {
		console.log("error in data received from tcp server");
		console.log(err);
		return 0;
	}
	
	if (dataReceived.hasOwnProperty('data')) {
		var data = dataReceived.data;
		var id = dataReceived.deviceID;
		const tempData = Number(data);
		var zoneData = [0,0,0,0,0,0,0,0];
		if ((tempData != null) && (tempData > 0)) {
			for (var i = 0; i < 8; i++) {
				zoneData[i] = (tempData >> i) & 1;
			}
		}
		
		var newDate = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
		var zonedataJson = {firealarmID: id,zone1Data:zoneData[0],zone2Data:zoneData[1],zone3Data:zoneData[2],zone4Data:zoneData[3],zone5Data:zoneData[4],zone6Data:zoneData[5],zone7Data:zoneData[6],zone8Data:zoneData[7],createdAt:newDate};
		if (deviceID_userID_Map.has(id)) {
			var tempUserID = deviceID_userID_Map.get(id);
			if (ws_useridIdSocket_Map.has(tempUserID)) {
				var tempSocket = ws_useridIdSocket_Map.get(tempUserID);
				//tempSocket.send(JSON.stringify(zonedataJson));
				sendDataToWsClient(zonedataJson, tempSocket);
			}
		}
	}
	else if (dataReceived.hasOwnProperty('status')) {
		var status = dataReceived.status;
		var id = dataReceived.deviceID;
		var newDate = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
		var statusdataJson = {firealarmID: id, onlineStatus:status, updatedAt:newDate};
		if (deviceID_userID_Map.has(id)) {
			var tempUserID = deviceID_userID_Map.get(id);
			if (ws_useridIdSocket_Map.has(tempUserID)) {
				var tempSocket = ws_useridIdSocket_Map.get(tempUserID);
				if (status == 1) {
					deviceID_Socket_Map.set(id, dataReceived.socket);
					//tempSocket.send(JSON.stringify(statusdataJson));
					sendDataToWsClient(statusdataJson, tempSocket);
				}
				else {
					if (deviceID_Socket_Map.has(id)) {
						var devicesocket = deviceID_Socket_Map.get(id);
						if (devicesocket == dataReceived.socket) {
							//tempSocket.send(JSON.stringify(statusdataJson));
							sendDataToWsClient(statusdataJson, tempSocket);
						}
					}
					else {
						//tempSocket.send(JSON.stringify(statusdataJson));
						sendDataToWsClient(statusdataJson, tempSocket);
					}
				}
			}
		}
	}
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Web socket connection to server
const parseJsonAsync = (jsonString) => {
	return new Promise(function(resolve,reject) {
		setTimeout(() => {
			try {
				resolve(JSON.parse(jsonString));
			} 
			catch(e) {
				reject(e);
			}
		})
	})
}

function terminateSocket(ws_socket)
{
	setTimeout(() => {
		if ([ws_socket.OPEN, ws_socket.CLOSING].includes(ws_socket.readyState)) {
			ws_socket.terminate();
		}	
	}, 5000);
}

function checkIfInitPktRec(ws_socket)
{
	if (!wsSocket_bool_Map.has(ws_socket)) {
		if ([ws_socket.OPEN, ws_socket.CLOSING].includes(ws_socket.readyState)) {
			//console.log("closing socket since no init packet received");
			ws_socket.close();
			terminateSocket(ws_socket);
		}
		else {
			console.log("socket already closed");
		}
	}
}

function verifyToken(jsonData) 
{
	if ((jsonData.hasOwnProperty("userID")) && (jsonData.hasOwnProperty("deviceList"))) {
		var userid = jsonData.userID;
		var token = jsonData.token;
		
		if (token) {
			try {
				var decoded = jwt.verify(token, secret);
				if (decoded.username == userid) {
					var tempKey = decoded.username + "_token";
					var loginTime = redisclient.get(tempKey);
					if (loginTime != null) {
						if (decoded.iat < loginTime) {
							return false;
						}
						else {
							return true;
						}
					}
				}
			}
			catch(err) {
				console.log(err);
				return false;
			}
		}
		return false;
	}
}

wss.on('connection', function connection(ws) {
	
	setTimeout(checkIfInitPktRec, clientInitTimeout, ws);
	
	ws.on('message', function incoming(message) {
		parseJsonAsync(message).then(
			jsonData => jsonData.hasOwnProperty("token")? jsonData : 0,
			error => {
				//console.log('Error in parsing JSON received from web client');
				ws.close();
				terminateSocket(ws);
				if (wsSocket_bool_Map.has(ws)) {
					wsSocket_bool_Map.delete(ws);
				}
			}
		).then(val => {
				//console.log(val);
				if (val != 0) {
					var ifTokenValid = verifyToken(val);
					if (ifTokenValid) {
						//console.log("token verified");
						if (val.hasOwnProperty("deviceList")) {
							var userid = val.userID;
							var deviceIds = val.deviceList.split(',');

							//If Session already open then signal it to close.
							if (ws_useridIdSocket_Map.has(userid)) {
								var tempSocket = ws_useridIdSocket_Map.get(userid);
								if (wsSocket_bool_Map.has(tempSocket)) {
									var ifReg = wsSocket_bool_Map.get(tempSocket);
									if (ifReg) {
										var tempJson = {firealarmID:userid, logout:true};
										tempSocket.send(JSON.stringify(tempJson));
									}
								}
							}
							deviceIds.forEach(device => deviceID_userID_Map.set(device,userid));
							ws_useridIdSocket_Map.set(userid, ws);
							wsSocket_bool_Map.set(ws, true);
						}
					}
					else {
						//console.log("token failed");
						ws.close()
						terminateSocket(ws);
						if (wsSocket_bool_Map.has(ws)) {
							wsSocket_bool_Map.delete(ws);
						}
					}
				}
				else {
					//console.log("packet not recognized");
					ws.close()
					terminateSocket(ws);
					if (wsSocket_bool_Map.has(ws)) {
						wsSocket_bool_Map.delete(ws);
					}
				}
			}).catch(function(error) {
				console.log("Client parsing error. Closing websocket: " + error);
				ws.close()
				terminateSocket(ws);
				if (wsSocket_bool_Map.has(ws)) {
					wsSocket_bool_Map.delete(ws);
				}
			});
		//console.log('received: %s', message);
	});
});
