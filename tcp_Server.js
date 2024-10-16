const net = require('net');
const ipc = require("node-ipc");
const ws_server_ipc = new ipc.IPC;
const redis = require("redis");
const client = redis.createClient();

const Logger = require('./logger')
const logger = new Logger('info')
var dateFormat = require("dateformat");

const emailKeyName = "totEmailCount";

//Flush Redis Database
try {
	let totalEmails = 0;
	client.get(emailKeyName, function(err, data) {
		if(err) {
			logger.error("totEmailCount key doesn't exist or failed to read it's value stored in Redis.");
		}
		else {
			totalEmails = parseInt(data,10);
		}
		client.flushall('ASYNC', function(err, reply) {
			if (err) {
				client.flushall(function(err, reply) {
					if (err) {
						logger.error(err);
						client.quit();
					}
					else {
						logger.info('Redis Database Flushed');
						client.set(emailKeyName, totalEmails, function(err, data) {
							if (err) {
								logger.error("Error while setting key value totEmailCount");
                            }
                            logger.info("Set total email sent count in Redis.");
                            client.quit();
                        });
					}
				});
			}
			else {
				client.quit();
			}
		});
	});
}
catch (e) {
	logger.error(e);
	client.quit(function (err, res) {
		logger.error('Exiting from Redis client due to unexpected error.');
	});
}

//TCP server configuration
const port = 7070;
const host = '127.0.0.1';
const clientInitTimeout = 60000; //60 seconds timeout if no init packet received
const noPktRecTimeOut = 90000;  //90 seconds timeout if no packet from client

/**
 * IPC server configurtion
 * Used for communication with REST API backend specially with nodeIPCPlugin. For mobile app
 */
ipc.config.id   = 'world';
ipc.config.retry= 1500;
ipc.config.silent = true;

/**
 * WS Server IPC congiuration
 * Used for communication with websocket backend for communication with web frontend
 */
ws_server_ipc.config.id = "wsserver";
ws_server_ipc.config.retry = 2000;
ws_server_ipc.config.silent = true;

let ipcClientConnStatus = false;  //icp client connection status

let sockets = [];     //To store sockets info
let clientcount = 0;
let sock_firealarmIDMap = new Map();   //socket - firealarmID map
let siaFirealarmArray = []; //To store sia protocol Firealarm IDs

const localIP = "::ffff:184.168.124.182";
//const localIP = "localhost";
var localSocket = null;
let localSIA_SMS_DeviceIds = [];


//IPC Server code
ipc.serve();

ipc.server.start();

ipc.server.on('start', ipcServerStarted);
ipc.server.on('connect', ipcClientConnected);
ipc.server.on('message', msgRecIPCClient);
ipc.server.on('socket.disconnected', ipcClientDisConnected);

//Ws Server code
ws_server_ipc.serve();
ws_server_ipc.server.start();
ws_server_ipc.server.on('start', ws_ipcStarted);
ws_server_ipc.server.on('connect', ws_ipcConnected);
ws_server_ipc.server.on('socket.disconnected', ws_ClientDisConnected);

function ws_ipcStarted()
{
	logger.info("WS IPC server started");
}


//IPC server started
function ipcServerStarted()
{
	logger.info('IPC server started');
}

function ws_ipcConnected()
{
	logger.info("Backend WS server connected");
}

function ws_ClientDisConnected(socket, destroyedSocketID)
{
	console.log(destroyedSocketID);
	logger.warn('Backend WS server Down !!!.');
}

//Backend server connected
function ipcClientConnected(socket)
{
	ipcClientConnStatus = true;
	logger.info('Backend Server started and connected.');
}

//Data send by backend server
function msgRecIPCClient(ipcClientData, socket)
{
	logger.info('Message received from backend');
	logger.info(JSON.stringify(ipcClientData));
	
	if (ipcClientData.hasOwnProperty('deviceID')) {
		let tempKey = ipcClientData['socket'];
		try {
			if (ipcClientData.hasOwnProperty('status')) {
				//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
				//Local SIA SMS client
				if  (tempKey.split("-")[0] == localIP)			//Local Client
				{
					if (ipcClientData['status'] == 1)
					{
						if (!localSIA_SMS_DeviceIds.includes(ipcClientData['deviceID']))
						{
							localSIA_SMS_DeviceIds.push(ipcClientData['deviceID']);
						}
					}
					return;
				}
				//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
						
				if (ipcClientData['status'] == 1) {
					if (!sock_firealarmIDMap.has(tempKey)) {
						sock_firealarmIDMap.set(tempKey, ipcClientData['deviceID']);
						ws_server_ipc.server.broadcast('message', ipcClientData);  //Test
					}
					
					//For SIA protocol
					if (ipcClientData.hasOwnProperty('nack')) {
						const tempSocketArr = tempKey.split("-");
						const remotePort = Number(tempSocketArr[1]);
						let index = sockets.findIndex(function(o) {
							return o.remoteAddress === tempSocketArr[0] && o.remotePort === remotePort;
						});
						var seqNo = '0000';
						if (ipcClientData['nack']) {
							var day = dateFormat(new Date(), "HH:MM:ss,mm-dd-yyyy");
							nackPacket = `\n82AA002D"NAK"${seqNo}L${ipcClientData.accPre}#${ipcClientData.accNumb}[]_${day}\r`;
							sockets[index].write(nackPacket);
						}
						else {
							ackPacket = `\n1E540019"ACK"${seqNo}L${ipcClientData.accPre}#${ipcClientData.accNumb}[]\r`;
							sockets[index].write(ackPacket);
						}
					}
				}
				else {	//Close socket since deviceID doesn't exist in database status = 0
					const tempSocketArr = tempKey.split("-");
					const remotePort = Number(tempSocketArr[1]);
					let index = sockets.findIndex(function(o) {
						return o.remoteAddress === tempSocketArr[0] && o.remotePort === remotePort;
					});
				  
					if (index != -1) {
						sockets[index].destroy();
						sockets.splice(index, 1);
					}
					if (sock_firealarmIDMap.has(tempKey)) {
						sock_firealarmIDMap.delete(tempKey);
					}
				  
					//Remove Sia Firealarm Id
					let siaIndex = siaFirealarmArray.indexOf(tempKey);
					if (siaIndex != -1) {
						siaFirealarmArray.splice(siaIndex, 1);
					}
				}
			}
			else {			//Forward data from backend to fire alarm client device
				//---------------------Email alert packet----------------------------
				let emailPktAlert = {};
				emailPktAlert.sendEmail = true;
				emailPktAlert.deviceID = ipcClientData['deviceID'];
				emailPktAlert.pin = ipcClientData['outputPINSTATUS']['outPIN'];
				emailPktAlert.pinVal = ipcClientData['outputPINSTATUS']['outPINVAL'];
				//-------------------------------------------------------------------
				
				//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
				//For local SIA SMS
				if  (tempKey.split("-")[0] == localIP)
				{
					outPin = ipcClientData['outputPINSTATUS']['outPIN'];
					outVal = ipcClientData['outputPINSTATUS']['outPINVAL'];
					if (outVal == 1) {
						var packetRet = null;
						const panelInfo = ipcClientData['deviceID'].split("-");
						var day = dateFormat(new Date(), "HH:MM:ss,mm-dd-yyyy");
						var seqNo = '0001';
						var accPrefix = panelInfo[0];
						var accNumb = panelInfo[1];
						ipc.server.broadcast('message', emailPktAlert);			//For email alert packet
						if (outPin == 4) {
							packetRet = `\nSIADCS 124\r;${accPrefix}-${accNumb}`;//`\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|000]_${day}\r`;
						}
						else if (outPin == 3) {
							packetRet = `\nSIADCS 123\r;${accPrefix}-${accNumb}`;//`\nBCB90048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|002|1]_${day}\r`;
						}
						else if (outPin == 2) {
							packetRet = `\nSIADCS 122\r;${accPrefix}-${accNumb}`;//`\n67320048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|002|0]_${day}\r`;
						}
						else if (outPin == 1) {
							packetRet = `\nSIADCS 121\r;${accPrefix}-${accNumb}`;//`\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|001]_${day}\r`;
						}
						
						if (packetRet != null) {
							localSocket.write(packetRet);
						}
					}
					else if (outVal == 0) {
						var packetRet = null;
						const panelInfo = ipcClientData['deviceID'].split("-");
						var day = dateFormat(new Date(), "HH:MM:ss,mm-dd-yyyy");
						var seqNo = '0001';
						var accPrefix = panelInfo[0];
						var accNumb = panelInfo[1];
						if (outPin == 4) {
							packetRet = `\nSIADCS 134\r;${accPrefix}-${accNumb}`;//`\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|007]_${day}\r`;
						}
						else if (outPin == 3) {
							packetRet = `\nSIADCS 133\r;${accPrefix}-${accNumb}`;//`\nBCB90048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|006]_${day}\r`;
						}
						else if (outPin == 2) {
							packetRet = `\nSIADCS 132\r;${accPrefix}-${accNumb}`;//`\n67320048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|005]_${day}\r`;
						}
						else if (outPin == 1) {
							packetRet = `\nSIADCS 131\r;${accPrefix}-${accNumb}`;//`\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|004]_${day}\r`;
						}
						
						if (packetRet != null) {
							//sockets[index].write(packetRet);
							 setTimeout(function() {
								 localSocket.write(packetRet);
                             }, 5000);
						}
					}
					
					return;
				}
				//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
				//let tempKey = ipcClientData['socket'];
				const tempSocketArr = tempKey.split("-");
				const remotePort = Number(tempSocketArr[1]);
				let index = sockets.findIndex(function(o) {
					return o.remoteAddress === tempSocketArr[0] && o.remotePort === remotePort;
				});
			  
				let siaIndex = siaFirealarmArray.indexOf(tempKey);
			  
				if (siaIndex == -1) {  //For esp32 based fire alarm
					if (emailPktAlert.pinVal == 1)
					{
						ipc.server.broadcast('message', emailPktAlert);				//For email alert packet
					}
					delete ipcClientData['socket'];
					sockets[index].write(JSON.stringify(ipcClientData));
				}
				else {  //For SIA based protocol
					outPin = ipcClientData['outputPINSTATUS']['outPIN'];
					outVal = ipcClientData['outputPINSTATUS']['outPINVAL'];
					if (outVal == 1) {
						var packetRet = null;
						const panelInfo = ipcClientData['deviceID'].split("-");
						var day = dateFormat(new Date(), "HH:MM:ss,mm-dd-yyyy");
						var seqNo = '0001';
						var accPrefix = panelInfo[0];
						var accNumb = panelInfo[1];
						ipc.server.broadcast('message', emailPktAlert);			//For email alert packet
						if (outPin == 4) {
							packetRet = `\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|000]_${day}\r`;
						}
						else if (outPin == 3) {
							packetRet = `\nBCB90048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|002|1]_${day}\r`;
						}
						else if (outPin == 2) {
							packetRet = `\n67320048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|002|0]_${day}\r`;
						}
						else if (outPin == 1) {
							packetRet = `\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|001]_${day}\r`;
						}
						
						if (packetRet != null) {
							sockets[index].write(packetRet);
						}
					}
					else if (outVal == 0) {
						var packetRet = null;
						const panelInfo = ipcClientData['deviceID'].split("-");
						var day = dateFormat(new Date(), "HH:MM:ss,mm-dd-yyyy");
						var seqNo = '0001';
						var accPrefix = panelInfo[0];
						var accNumb = panelInfo[1];
						if (outPin == 4) {
							packetRet = `\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|007]_${day}\r`;
						}
						else if (outPin == 3) {
							packetRet = `\nBCB90048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|006]_${day}\r`;
						}
						else if (outPin == 2) {
							packetRet = `\n67320048"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|005]_${day}\r`;
						}
						else if (outPin == 1) {
							packetRet = `\nFE6A0046"SIA-DCS"${seqNo}L${accPrefix}#${accNumb}[#${accNumb}|NYY005][N|004]_${day}\r`;
						}
						
						if (packetRet != null) {
							//sockets[index].write(packetRet);
							 setTimeout(function() {
								 sockets[index].write(packetRet);
                             }, 5000);
						}
					}
				} 
			}
		}
		catch (ex) {
			logger.error('Error in data received from backend');
			logger.error(ex);
		}
	
	}
	else if (ipcClientData.hasOwnProperty('update')) {
		try {
			if (ipcClientData['update']) {
				if (sockets.length > 0) {
					sockets.forEach(x => {
						setTimeout(() => {
							x.write(JSON.stringify(ipcClientData));
						});
					});
				}
			}
		}
		catch (ex) {
			logger.error("Error while sending update packet to device");
			logger.error(ex);
		}
	}
	else if (ipcClientData.hasOwnProperty('returnVal')) {
		try {
			let tempKey = ipcClientData['socket'];
			if (tempKey != "") {
				//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
				//Local SIA SMS client
				if  (tempKey.split("-")[0] == localIP)			//Local Client
				{
					return;
				}
				//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
				const tempSocketArr = tempKey.split("-");
				const remotePort = Number(tempSocketArr[1]);
				let index = sockets.findIndex(function(o) {
					return o.remoteAddress === tempSocketArr[0] && o.remotePort === remotePort;
				});
				delete ipcClientData['socket'];
				
				let siaIndex = siaFirealarmArray.indexOf(tempKey);
				
				if (siaIndex != -1) { //For SIA packet response
					if (ipcClientData['returnVal']) {
						seqNo = ipcClientData.seqNo.toString().padStart(4,'0');
						ackPacket = `\n1E540019"ACK"${seqNo}L${ipcClientData.accPre}#${ipcClientData.accNumb}[]\r`;
						sockets[index].write(ackPacket);
					}
					else {
						seqNo = seqNo.toString().padStart(4,'0');
						var day = dateFormat(new Date(), "HH:MM:ss,mm-dd-yyyy");
						nackPacket = `\n82AA002D"NAK"${seqNo}L${ipcClientData.accPre}#${ipcClientData.accNumb}[]_${day}\r`;
						sockets[index].write(nackPacket);
					}
				}
				else { //For normal esp32 based device
					sockets[index].write(JSON.stringify(ipcClientData));
				}
			}
			else {
				logger.info(JSON.stringify(ipcClientData));
				logger.info('No need to send packet to client');
			}
		}
		catch (ex) {
			logger.error("Error in returnVal packet from background.");
			logger.error(ex);
		}
	}
	else {
		logger.warn('Unexpected condition due to unexpected data from backend');
		logger.warn(ipcClientData);
	}
}

function ipcClientDisConnected(socket, destroyedSocketID)
{
	console.log(destroyedSocketID);
	ipcClientConnStatus = false;
	logger.warn('Backend server Down !!!.');
}


//-------------------------------------------------------------------------------------

//TCP Server
const server = net.createServer();

server.listen(4000);

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

//Function to check if init pkt received from client on timeout else close client
function checkIfInitPktRec(sock) 
{
	let tempKey = sock.remoteAddress + "-" + sock.remotePort;
	if (!sock_firealarmIDMap.has(tempKey)) {
		socketCleanUp(sock);
		sock.destroy();
	}
}

//Clean up socket information and send update to backend server for device connection status
function socketCleanUp(sock)
{
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	//Local SIA SMS client
	if  (sock.remoteAddress == localIP)			//Local Client
	{
		return;
	}
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	let tempKey = sock.remoteAddress + "-" + sock.remotePort;
	let index = sockets.findIndex(function(o) {
		return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
	});
	
	if (index !== -1) sockets.splice(index, 1);
	if (sock_firealarmIDMap.has(tempKey)) {
		var tempJson = new Object();
		tempJson.deviceID = sock_firealarmIDMap.get(tempKey);
		tempJson.timestamp = Math.floor(+new Date() / 1000);
		tempJson.status = 0;
		tempJson.socket = tempKey;
		sock_firealarmIDMap.delete(tempKey);
		if (ipcClientConnStatus) {
			ipc.server.broadcast('message', tempJson);
			ws_server_ipc.server.broadcast('message', tempJson); //test
		}
	}	
	//Remove Sia Firealarm Id
	let siaIndex = siaFirealarmArray.indexOf(tempKey);
	if (siaIndex != -1) {
		siaFirealarmArray.splice(siaIndex, 1);
	}
}

server.on('connection', function(sock) {
    
    if (sock.remoteAddress != localIP)
    {
		//Callback on timout to check if init pkt recevied from client else close client
		setTimeout(checkIfInitPktRec, clientInitTimeout, sock);
		logger.info('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
		sockets.push(sock);
		sock.setTimeout(noPktRecTimeOut); //Client timeout
		clientcount++;
	}
	else
	{
		localSocket = sock;
		logger.info('Local Client CONNECTED for SMS SIA: ' + sock.remoteAddress + ':' + sock.remotePort);
	}

	sock.on('data', function(data) {
		if (ipcClientConnStatus)
		{
			logger.info('DATA ' + sock.remoteAddress + ': ' + data);
			if ((data[0] == 0x0A) && (data[data.length - 1] == 0x0D)) {
				data = String(data);
				if (sock.remoteAddress != localIP)
				{
					parseSIAPacket(data).then(
						async (parsedPkt)	=> {

							let tempKey = sock.remoteAddress + "-" + sock.remotePort;
							if (parsedPkt.pktType != null) {
								if (parsedPkt.pktType == "NULL") {
									if (!sock_firealarmIDMap.has(tempKey)) {	//Register Packet
										let registerPkt = {};
										registerPkt.register = true;
										registerPkt.socket = tempKey;
										registerPkt.deviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
										registerPkt.timestamp = Math.floor(Date.now() / 1000);
										recvTimestamp = Math.floor(Date.parse(parsedPkt.recvTime)/1000);
										registerPkt.seqNo = parsedPkt.seqNo;
										registerPkt.accPre = parsedPkt.accPre;
										registerPkt.accNumb = parsedPkt.accNumb;
										
										if (((registerPkt.timestamp - recvTimestamp) > 45) || ((registerPkt.timestamp - recvTimestamp) < -45)) {
											registerPkt.nack = true;
										}
										else {
											registerPkt.nack = false;
										}
										siaFirealarmArray.push(tempKey);
										ipc.server.broadcast('message', registerPkt);
										logger.info(JSON.stringify(registerPkt));
									}
								}
								else if (parsedPkt.pktType == "ACK") {
									logger.info("received ack packet");
								}
								else if (parsedPkt.pktType == "SIA-DCS") {
									if (sock_firealarmIDMap.has(tempKey)) {
										let tempDeviceID = sock_firealarmIDMap.get(tempKey);
										let recvDeviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
										if (tempDeviceID === recvDeviceID) {
											let siaDcsPkt = {};
											siaDcsPkt.socket = tempKey;
											siaDcsPkt.deviceID = recvDeviceID;
											siaDcsPkt.timestamp = Math.floor(Date.now() / 1000);
											siaDcsPkt.data = parsedPkt.alarm;
										
											siaDcsPkt.seqNo = parsedPkt.seqNo;
											siaDcsPkt.accPre = parsedPkt.accPre;
											siaDcsPkt.accNumb = parsedPkt.accNumb;
										
											ipc.server.broadcast('message', siaDcsPkt);
											ws_server_ipc.server.broadcast('message', siaDcsPkt); //Test
											logger.info(JSON.stringify(siaDcsPkt));
										}
										else {
											socketCleanUp(sock);
											sock.destroy();
											logger.info("Closing socket since unknown deviceID from known socket");
										}
									}
									else {
										let registerPkt1 = {};
										registerPkt1.register = true;
										registerPkt1.socket = tempKey;
										registerPkt1.deviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
										registerPkt1.timestamp = Math.floor(Date.now() / 1000);
										recvTimestamp = Math.floor(Date.parse(parsedPkt.recvTime)/1000);
										
										registerPkt1.seqNo = parsedPkt.seqNo;
										registerPkt1.accPre = parsedPkt.accPre;
										registerPkt1.accNumb = parsedPkt.accNumb;
										
										if (((registerPkt1.timestamp - recvTimestamp) > 45) || ((registerPkt1.timestamp - recvTimestamp) < -45)) {
											registerPkt1.nack = true;
										}
										else {
											registerPkt1.nack = false;
										}
										siaFirealarmArray.push(tempKey);
										ipc.server.broadcast('message', registerPkt1);
										logger.info(JSON.stringify(registerPkt1));
									}
								}
								else if (parsedPkt.pktType == "DUH") {
									logger.info('DUH packet from ethernet device. Ignoring it');
								}
								else {
									logger.error('Closing SIA socket due to garbage data from client.');
									socketCleanUp(sock);
									sock.destroy();
								}
							}
							else {
								logger.error('Closing SIA socket due to garbage data from client.');
								socketCleanUp(sock);
								sock.destroy();
							}
						}
					).catch(function(error) {
						  logger.error("SIA packet parsing error: " + error);
					});
				}
				else
				{
					parseSIAPacket(data).then(
						async (parsedPkt)	=> {
							let tempKey = sock.remoteAddress + "-" + sock.remotePort;
							if (parsedPkt.pktType != null) {
								if (parsedPkt.pktType == "NULL") {
									let registerPkt = {};
									registerPkt.register = true;
									registerPkt.socket = tempKey;
									registerPkt.deviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
									registerPkt.timestamp = Math.floor(Date.now() / 1000);
									recvTimestamp = Math.floor(Date.parse(parsedPkt.recvTime)/1000);
									registerPkt.seqNo = parsedPkt.seqNo;
									registerPkt.accPre = parsedPkt.accPre;
									registerPkt.accNumb = parsedPkt.accNumb;
									
									if (((registerPkt.timestamp - recvTimestamp) > 45) || ((registerPkt.timestamp - recvTimestamp) < -45)) {
										registerPkt.nack = true;
									}
									else {
										registerPkt.nack = false;
									}
									/*if (!localSIA_SMS_DeviceIds.includes(registerPkt.deviceID))
									{
										localSIA_SMS_DeviceIds.push(registerPkt.deviceID);
									}*/
									ipc.server.broadcast('message', registerPkt);
									logger.info(JSON.stringify(registerPkt));
								}
								else if (parsedPkt.pktType == "SIA-DCS") {
									let tempDeviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
									if (localSIA_SMS_DeviceIds.includes(tempDeviceID))
									{
										let siaDcsPkt = {};
										siaDcsPkt.socket = tempKey;
										siaDcsPkt.deviceID = tempDeviceID;
										siaDcsPkt.timestamp = Math.floor(Date.now() / 1000);
										siaDcsPkt.data = parsedPkt.alarm;
									
										siaDcsPkt.seqNo = parsedPkt.seqNo;
										siaDcsPkt.accPre = parsedPkt.accPre;
										siaDcsPkt.accNumb = parsedPkt.accNumb;
									
										ipc.server.broadcast('message', siaDcsPkt);
										ws_server_ipc.server.broadcast('message', siaDcsPkt); //Test
										logger.info(JSON.stringify(siaDcsPkt));
									}
									else
									{
										let registerPkt1 = {};
										registerPkt1.register = true;
										registerPkt1.socket = tempKey;
										registerPkt1.deviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
										registerPkt1.timestamp = Math.floor(Date.now() / 1000);
										recvTimestamp = Math.floor(Date.parse(parsedPkt.recvTime)/1000);
										
										registerPkt1.seqNo = parsedPkt.seqNo;
										registerPkt1.accPre = parsedPkt.accPre;
										registerPkt1.accNumb = parsedPkt.accNumb;
										
										if (((registerPkt1.timestamp - recvTimestamp) > 45) || ((registerPkt1.timestamp - recvTimestamp) < -45)) {
											registerPkt1.nack = true;
										}
										else {
											registerPkt1.nack = false;
										}
										//siaFirealarmArray.push(tempKey);
										ipc.server.broadcast('message', registerPkt1);
										logger.info(JSON.stringify(registerPkt1));
									}
								}
							}
						}
					).catch(function(error) {
						logger.error("SIA SMS packet parsing error: " + error);
					});
				}
			}
			else if (data[0] == 0x69)
			{
				logger.info('local client');
			}
			else {
				parseJsonAsync(data).then(
					jsonData => jsonData.hasOwnProperty('deviceID')? jsonData : 0,
					error => logger.error('Error in parsing JSON received from client')
				).then(
					val => {
						if (val != 0) {
							let tempKey = sock.remoteAddress + "-" + sock.remotePort;
							if (val.hasOwnProperty('register')) { 
								//Add socket info to json received from device and send to backend server.
								val['socket'] = tempKey;
								ipc.server.broadcast('message', val);
								logger.info(JSON.stringify(val));
							}
							else if (val.hasOwnProperty('health')) {
								if (sock_firealarmIDMap.has(tempKey)) {
									if (val.deviceID === sock_firealarmIDMap.get(tempKey)) {
										logger.info(JSON.stringify(val));
									}
									else {
										socketCleanUp(sock);
										sock.destroy();
									}
								}
								else {
									socketCleanUp(sock);
									sock.destroy();
								}
							}
							else if (val.hasOwnProperty('data')) {
								if (sock_firealarmIDMap.has(tempKey)) {
									if (val.deviceID === sock_firealarmIDMap.get(tempKey)) {
										val['socket'] = tempKey;
										ipc.server.broadcast('message', val);
										ws_server_ipc.server.broadcast('message', val); //Test
										logger.info(JSON.stringify(val));
									}
									else {
										socketCleanUp(sock);
										sock.destroy();
									}
								}
								else {
									socketCleanUp(sock);
									sock.destroy();
								}
							}
							else {
								sock.destroy();
							}
						}
						else {
							logger.error('Closing socket due to garbage data from client.');
							socketCleanUp(sock);
							sock.destroy();
						}
					}
				  ).catch(function(error) {
					  logger.error("ESP32 based firealarm packet parsing error: " + error);
				  });
			}
		}
		else {
			logger.error('Closing client socket due to backend server not available.');
			socketCleanUp(sock);
			sock.destroy();
		}
	});
	
	// Add a 'close' event handler to this instance of socket
	sock.on('close', function(data) {
		socketCleanUp(sock);
		logger.info('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
	});
    
	sock.on('error',function(error){
		sock.destroy();
		logger.error('Error : ' + error);
	});
	
	sock.on('end',function(data){
		sock.destroy();
		logger.error('Socket ended from other end!');
	});
    
	// When client timeout.
	sock.on('timeout', function () {
		sock.destroy();
		logger.error('Client request time out.');
	});
});

server.on('close',function(){
	logger.error('Server closed !');
});

server.on('error',function(error){
	logger.error('Unexpected Error TCP Server : ' + error);
});

//----------------------------------------------------------------------------------------
//SIA protocol functions

async function parseSIAPacket(data) {
	let sia = {};
	let dataLen = data.length;
	sia.pktType = null;
	
	if (data) {
		finalData = data.substr(1, dataLen -2);
		sia.data = finalData;
		sia.totalLen = finalData.length;
		sia.lf = data[0];
		sia.cr = data[dataLen - 1];
		
		regex = /(.{4})(.{4})"(.+)"(\d{4})(R(.{0,6})){0,1}L(.{0,6})#([\w\d]+)\[(.*)/gm ;
		
		var parsedData = regex.exec(finalData);
		
		if (parsedData !== null) {
			sia.crc = parsedData[1];
			sia.frameLen = parseInt(parsedData[2].substr(1,3), 16);
			
			sia.pktType = parsedData[3];
			sia.seqNo = Number(parsedData[4]);
			sia.accPre = parsedData[7];
			sia.accNumb = parsedData[8];
			
			restParsedData = parsedData[9];
			if (sia.pktType == "SIA-DCS") {
				siaRegex = /\|(.*)\[(.*)\]\_(.*)/gm ;
				var tempData  = siaRegex.exec(parsedData[9]);
				sia.alarm = parseInt(tempData[1].substr(3,3), 16);
				sia.alarmTime = tempData[2].substr(2, 19);
				sia.recvTime = tempData[3].replace(",", " ");
			}
			else if (sia.pktType == "NULL") {
				nullRegex = /\]\_(.*)/gm ;
				var tempData  = nullRegex.exec(parsedData[9]);
				sia.alarm = null;
				sia.alarmTime = null;
				sia.recvTime = tempData[1].replace(",", " ");
			}
			else if (sia.pktType == "ACK") {
				sia.alarm = null;
				sia.alarmTime = null;
				sia.recvTime = null;
			}
		}
	}
	return sia;
}
