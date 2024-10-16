const axios = require('axios')
var fetch = require('node-fetch');
var cron = require('node-cron');
var net = require('net');
const http = require("http");
//const Logger = require('./logger1')
//const logger = new Logger('info')

const HTTP_PORT = 3009;
const TCP_PORT  = 4000;
const TCP_HOST = '184.168.124.182';
const TCP_TIMEOUT = 10000;
var tcp_retrying = false;
var tcp_connected = false;
var owner_mobile_numb = "";
let firealarmIDMap_destinationPhoneNumb = new Map();   // firealarmID map -- phone number

//+++++++++++++++++++++++++TCP CLIENT++++++++++++++++++++++++++++++++++++++++++++++++++++++++
var tcp_socket = new net.Socket();		//TCP client socket


function makeConnection () {
    tcp_socket.connect(TCP_PORT, TCP_HOST);
    tcp_socket.setKeepAlive(true);
}

function connectEventHandler() {
	tcp_socket.write('i');
    console.log('TCP client connected. No retry needed.');
    tcp_retrying = false;
    tcp_connected = true;
}
function dataEventHandler(data) {
    console.log('Data received: ');
    console.log(data);
    var recvData = String(data);
    console.log(recvData);
    var pktRecv = recvData.split(";");
    console.log(pktRecv);
    if (firealarmIDMap_destinationPhoneNumb.has(pktRecv[1]))
    {
		var dest_mobile_numb = firealarmIDMap_destinationPhoneNumb.get(pktRecv[1]);
		console.log(pktRecv[0]);
		console.log(pktRecv[1]);
		sendSMS_Back(dest_mobile_numb, recvData);
	}
    /*parseSIAPacket(recvData, 2).then(
	    async (parsedPkt) => {
			if (parsedPkt.pktType != null) {
				if (parsedPkt.pktType == "SIA-DCS")
				{
					var deviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
					if (firealarmIDMap_destinationPhoneNumb.has(deviceID))
					{
						var dest_mobile_numb = firealarmIDMap_destinationPhoneNumb.get(deviceID);
						sendSMS_Back(dest_mobile_numb, recvData);
					}
				}
			}
		}).catch(function(error) {
		  console.log("SIA packet parsing error: " + error);
		});*/
}
function endEventHandler() {
	console.log('TCP client end from server side.');
	tcp_connected = false;
}
function timeoutEventHandler() {
    console.log('TCP client timeout.');
    tcp_connected = false;
}
function drainEventHandler() {
    console.log('TCP client drain.');
    tcp_connected = false;
}
function errorEventHandler(err) {
	tcp_connected = false;
    console.log('TCP client error.');
    console.log(err);
    tcp_socket.end();
    tcp_socket.destroy();
}
function closeEventHandler () {
	tcp_connected = false;
    if (!tcp_retrying) {
        tcp_retrying = true;
        console.log('Trying Client Reconnection to server ...');
    }
    setTimeout(makeConnection, TCP_TIMEOUT);
}

// Create TCP socket and bind callbacks for server connection and communication.
tcp_socket.on('connect', connectEventHandler);
tcp_socket.on('data',    dataEventHandler);
tcp_socket.on('end',     endEventHandler);
tcp_socket.on('timeout', timeoutEventHandler);
tcp_socket.on('drain',   drainEventHandler);
tcp_socket.on('error',   errorEventHandler);
tcp_socket.on('close',   closeEventHandler);

// Connect
console.log('Connecting to ' + TCP_HOST + ':' + TCP_PORT + '...');
makeConnection();

//++++++++++++++++++++++++++++++++++++++++++++++++ SEND SMS BACK TO DEVICE +++++++++++++++++++++++++++++++++++++++++++++
function sendSMS_Back(to_mobile_numb, sms_content) {
	let apiKey = "feZKttKV6_T7A2wetzU2fEl7QtR-9VBRyjUmQ5UpRPIHzNidei4ZJUsqUztBiEDX";
	fetch('https://api.httpsms.com/v1/messages/send', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			"content": sms_content,
			"from": owner_mobile_numb,
			"to": to_mobile_numb
		})
	})
	.then(res => res.json())
	.then((data) => console.log(data));
}


//++++++++++++++++++++++++++++++++++++++++++++++++ HTTP SMS SERVER +++++++++++++++++++++++++++++++++++++++++++++++++++++
const http_server = http.createServer(async (req, res) => {
    // /api/todos : GET
    if (req.url === "/api/get" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end();
    }

    // /api/todos/ : POST
    else if (req.url === "/smsresp" && req.method === "POST") {
        let todo_data = await getReqData(req);
        const obj = JSON.parse(todo_data);
        console.log("----------------------------------");
        console.log(todo_data);
		if (obj.hasOwnProperty('source') && obj.hasOwnProperty('type'))
		{
			if (obj.type == "message.phone.received")		//SMS received
			{
				if (obj.hasOwnProperty('data'))
				{
					console.log(obj.data.owner);
					console.log(obj.data.contact);
					console.log(obj.data.timestamp);
					console.log(obj.data.content);
					
					owner_mobile_numb = obj.data.owner;
					var recvData = obj.data.content;
					parseSIAPacket(recvData, 1).then(
					async (parsedPkt) => {
						if (parsedPkt[0] == "NULL")
						{
							var nullPacket = `\n${parsedPkt[6]}${parsedPkt[5]}"NULL"${parsedPkt[1]}${parsedPkt[2]}#0${parsedPkt[3]}[]_${parsedPkt[4]}\r`;
							var deviceID = parsedPkt[2] + "-0" + parsedPkt[3];
							firealarmIDMap_destinationPhoneNumb.set(deviceID, obj.data.contact);
							console.log(nullPacket);
							tcp_socket.write(nullPacket);
							console.log(deviceID);
						}
						else if (parsedPkt[0] == "SIA-DCS")
						{
							var siaZonePacket = `\n${parsedPkt[7]}${parsedPkt[6]}"SIA-DCS"${parsedPkt[1]}${parsedPkt[2]}#0${parsedPkt[3]}[#0${parsedPkt[3]}|NFA${parsedPkt[4]}][H_${parsedPkt[5]}]_${parsedPkt[5]}\r`;
							var deviceID = parsedPkt[2] + "-0" + parsedPkt[3];
							firealarmIDMap_destinationPhoneNumb.set(deviceID, obj.data.contact);
							console.log(siaZonePacket);
							tcp_socket.write(siaZonePacket);
							console.log(deviceID);
						}
						/*if (parsedPkt.pktType != null) {
							if (parsedPkt.pktType == "NULL") {
								var deviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
								firealarmIDMap_destinationPhoneNumb.set(deviceID, obj.data.contact);
								tcp_socket.write(recvData);
								console.log(deviceID);
							}
							else if (parsedPkt.pktType == "SIA-DCS") {
								var deviceID = parsedPkt.accPre + "-" + parsedPkt.accNumb;
								firealarmIDMap_destinationPhoneNumb.set(deviceID, obj.data.contact);
								tcp_socket.write(recvData);
								console.log(deviceID);
							}
						}*/
					}).catch(function(error) {
					  console.log("SIA packet parsing error: " + error);
					});
					console.log(firealarmIDMap_destinationPhoneNumb);
				}
			}
			else if (obj.type == "message.phone.sent")	       //SMS sent
			{
				console.log("SMS send to receipient");
			}
			else if (obj.type == "message.phone.delivered")	//SMS delivered
			{
				console.log("SMS delivered successfully to receipient.");
			}
			else if (obj.type == "message.send.failed")		//SMS send failed
			{
				console.log("SMS send failed");
			}
			else if (obj.type == "message.send.expired")	//SMS send expired
			{
				console.log("SMS send failed. Expired");
			}
		}
        res.writeHead(200, { "Content-Type": "application/json" });
        //res.end(JSON.stringify(todo));
		res.end();
	}

    // No route present
    else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Route not found" }));
    }
});

http_server.listen(HTTP_PORT, () => {
    console.log(`HTTP server started on port: ${HTTP_PORT}`);
});

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Get HTTP Post Data
function getReqData(req) {
    return new Promise((resolve, reject) => {
        try {
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", () => {
                resolve(body);
            });
        } 
        catch (error) {
            reject(error);
        }
    });
}

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Parse SIA Packet
async function parseSIAPacket(data, type) {
	if (type == 1)
	{
		var my_na = data.split(";");
		return my_na;
	}
	else if (type == 2)
	{
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
}


//+++++++++++++++++++++++++++++++++++ CRON SCHEDULER +++++++++++++++++++++++++++++++++++++++++++++++++
cron.schedule('* * * * *', () => {
	if (tcp_connected)
	{
		tcp_socket.write('i');
	}
});

