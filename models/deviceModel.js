const mysqlPromise = require('../config/db');
const dateFormat = require("dateformat");
//const apps = require('../app');
//let path = require("path");

//var PdfPrinter = require('pdfmake');
//var Roboto = require('../fonts/Roboto');
//var printer = new PdfPrinter(Roboto);
//var fs = require('fs');


const deviceModel = {

  getDevice: async function(id) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];

    try {
      res = await connection.execute('SELECT id FROM tbl_firealarm_allocate WHERE firealarmID = ?', [id]);
      connection.release();
    }
    catch (err) {
      console.error(err);
      connection.release();
      return false;
    }
    return res[0].length > 0 ? res[0] : false;
  },

  updateDeviceStatus: async function(id, status) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];
    var res1 = [{}];
    var alert = "Device Offline";
	var returnVal = {retVal: false, user: "", alert:"", deviceID: "", deviceName:"", groupAdmin:""};

    try {
      res = await connection.execute('UPDATE tbl_firealarm_status SET onlineStatus = ? WHERE firealarmID = ?', [status, id]);
      //connection.release();
      
      res = await connection.execute('SELECT firealarmName, userGroup FROM tbl_firealarm_allocate WHERE firealarmID = ?', [id]);
      
      var tempUserGroup = res[0][0].userGroup;
      var tempFirealarmName = res[0][0].firealarmName;
      res = await connection.execute('INSERT INTO tbl_firealarm_online_log (firealarmID, userGroup, status) values (?,?,?)', [id, tempUserGroup, status]);
      
      res1 = await connection.execute('SELECT username FROM tbl_useraccount WHERE permissions=2 AND userGroup = ?', [tempUserGroup]);
      connection.release();
      
      if (status == 1) {
		  alert = "Device Online";
	  }
	  const username = await findUserID(id);
	  const tempKey = username + "_devicetoken";
	  returnVal.retVal = true;
      returnVal.user = tempKey;
      returnVal.alert = alert;
      returnVal.deviceID = id;
      returnVal.deviceName = tempFirealarmName; //res[0][0].firealarmName;
      if (res1[0].length > 0) {
		  returnVal.groupAdmin = res1[0][0].username + "_devicetoken";
	  }
      return returnVal;
    }
    catch (err) {
      console.error(err);
      connection.release();
      returnVal.retVal = false;
      return returnVal;
    }
  },
  
  updateDeviceDataLog: async function(id, zoneData, alert) { //data) {
	const username = await findUserID(id);
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];
    var res1 = [{}];
	//var alert = "";
	var returnVal = {retVal: false, user: "", alert:"", deviceID: "", deviceName:"", groupAdmin:""};
    try {
      /*const tempData = Number(data);
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
      apps.redis.normal.set(redisKey,JSON.stringify(zonedataJson));*/
      res = await connection.execute('INSERT INTO tbl_firealarm_log (firealarmID, zone1Data, zone2Data, zone3Data, zone4Data, zone5Data, zone6Data, zone7Data, zone8Data) values (?,?,?,?,?,?,?,?,?)', [id, zoneData[0], zoneData[1], zoneData[2], zoneData[3], zoneData[4], zoneData[5], zoneData[6], zoneData[7]]);
      //connection.release();
      
      res = await connection.execute('SELECT firealarmName, userGroup FROM tbl_firealarm_allocate WHERE firealarmID = ?', [id]);
      
      res1 = await connection.execute('SELECT username FROM tbl_useraccount WHERE permissions=2 AND userGroup = ?', [res[0][0].userGroup]);
      connection.release();
      
      
      const tempKey = username + "_devicetoken";
      returnVal.retVal = true;
      returnVal.user = tempKey;
      returnVal.alert = alert;
      returnVal.deviceID = id;
      returnVal.deviceName = res[0][0].firealarmName;
      if (res1[0].length > 0) {
		  returnVal.groupAdmin = res1[0][0].username + "_devicetoken";
	  }
      
      return returnVal;

    }
    catch (err) {
      console.error(err);
      connection.release();
      returnVal.retVal = false;
      return returnVal;
    }
  },
  
  getDeviceLogs: async function(deviceID, username) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];

    try {
	  var userPermission = await findPermission(username);
      res = await connection.execute('SELECT id FROM tbl_firealarm_allocate WHERE username = ? AND firealarmID = ?', [username, deviceID]);
      if ((res[0].length > 0) || (userPermission === '2') || (userPermission === '1')) {
		res = await connection.execute('SELECT * FROM tbl_firealarm_log WHERE firealarmID = ? ORDER BY createdAt DESC LIMIT 1', [deviceID]);
		if (res[0].length <= 0) {
			var newDate = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			res = [[{firealarmID: deviceID, zone1Data: 0, zone2Data:0, zone3Data: 0, zone4Data:0,zone5Data: 0, zone6Data:0,zone7Data: 0, zone8Data:0,createdAt:newDate}]];
		}
	  }
      connection.release();
    }
    catch (err) {
      console.error(err);
      connection.release();
      return false;
    }
    return res[0].length > 0 ? res[0] : false;
  },

  getDeviceMultiLogs: async function(deviceID, username) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];

    try {
	  var userPermission = await findPermission(username);
      res = await connection.execute('SELECT id FROM tbl_firealarm_allocate WHERE username = ? AND firealarmID = ?', [username, deviceID]);
      if ((res[0].length > 0) || (userPermission === '2') || (userPermission === '1')) {
        res = await connection.execute('SELECT * FROM tbl_firealarm_log WHERE firealarmID = ? ORDER BY createdAt DESC LIMIT 5', [deviceID]);
      }
      connection.release();
    }
    catch (err) {
      console.error(err);
      connection.release();
      return false;
    }
    return res[0].length > 0 ? res[0] : false;
  },
  
  getMultiDevicesLogs: async function(deviceID, username) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];
    var firealarmIDs = deviceID.split(",");
    var finalResult = [];
    try {
      res = await connection.execute('SELECT permissions, userGroup FROM tbl_useraccount WHERE username = ?', [username]);
      if (res[0].length > 0) {
        if (res[0][0].permissions === '2') {
          for (let item of firealarmIDs) {
            res = await connection.execute('SELECT * FROM tbl_firealarm_log WHERE firealarmID = ? ORDER BY createdAt DESC LIMIT 1', [item]);
            if (res[0].length > 0) {
              finalResult.push(res[0][0]);
            }
            else {
				var now = new Date();
				var newDate = dateFormat(now, "isoUtcDateTime");
				finalResult.push({firealarmID: item, zone1Data: 0, zone2Data:0, zone3Data: 0, zone4Data:0,zone5Data: 0, zone6Data:0,zone7Data: 0, zone8Data:0,createdAt:newDate});
			}
          }
        }
      }
      connection.release();
    }
    catch (err) {
      console.error(err);
      connection.release();
      return false;
    }
    return finalResult.length > 0 ? finalResult : false;
  },
  getMultiDevicesLogs_v2: async function(group) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];
    var userGroups = group.split(",");
	let username_group={};
	let flag=1;
	for(group in userGroups){
		let data=userGroups[group]
		flag=1;
	 var username_list= await connection.execute('SELECT username FROM tbl_useraccount WHERE  userGroup = ?', [userGroups[group]]);
	 if(flag==1){
	  for (user in username_list[0]) {
		  var tempres = await connection.execute('SELECT firealarmID FROM tbl_firealarm_allocate WHERE username = ?', [username_list[0][user].username]);
		  if(flag==1){ 
			for (item1 in tempres[0]) {
				var logs = await connection.execute('SELECT firealarmID FROM tbl_firealarm_log WHERE firealarmID = ?  AND (zone1Data = 1 OR zone2Data = 1 OR zone3Data = 1 OR zone4Data = 1 OR zone5Data = 1 OR zone6Data = 1 OR zone7Data = 1 OR zone8Data = 1 ) ORDER BY createdAt DESC LIMIT 1', [tempres[0][item1].firealarmID]);
				if (logs[0].length > 0) {
					console.log(1)
					username_group[data]=1
					flag=0
				}
			}
		 }
		}
	  }

	}
	let obj = username_group
    let arr = [obj];
	console.log(arr)
	return arr.length > 0 ? arr : false;
    /*
    var finalResult = [];
    try {
      res = await connection.execute('SELECT permissions, userGroup FROM tbl_useraccount WHERE username = ?', [username]);
      if (res[0].length > 0) {
        if (res[0][0].permissions === '2') {
          for (let item of firealarmIDs) {
            res = await connection.execute('SELECT * FROM tbl_firealarm_log WHERE firealarmID = ? ORDER BY createdAt DESC LIMIT 1', [item]);
            if (res[0].length > 0) {
              finalResult.push(res[0][0]);
            }
            else {
				var now = new Date();
				var newDate = dateFormat(now, "isoUtcDateTime");
				finalResult.push({firealarmID: item, zone1Data: 0, zone2Data:0, zone3Data: 0, zone4Data:0,zone5Data: 0, zone6Data:0,zone7Data: 0, zone8Data:0,createdAt:newDate});
			}
          }
        }
      }
      connection.release();
    }
    catch (err) {
      console.error(err);
      connection.release();
      return false;
    }
    return finalResult.length > 0 ? finalResult : false;*/


  },

  getFirealarmList: async function(username) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];
    var finalResult = [];

    try {
      res = await connection.execute('SELECT permissions, userGroup,zones FROM tbl_useraccount WHERE username = ?', [username]);
      if (res[0].length > 0) {
        if (res[0][0].permissions == '2')  {
          res = await connection.execute('SELECT username FROM tbl_useraccount WHERE userGroup = ?', [res[0][0].userGroup]);
          for (item in res[0]) {
            //var tempres = await connection.execute('SELECT tbl_firealarm_allocate.firealarmID, tbl_firealarm_name.firealarmName FROM tbl_firealarm_allocate LEFT JOIN tbl_firealarm_name ON tbl_firealarm_allocate.firealarmID = tbl_firealarm_name.firealarmID WHERE tbl_firealarm_allocate.username = ?', [res[0][item].username]);
            var tempres = await connection.execute('SELECT firealarmID, firealarmName ,username,userGroup FROM tbl_firealarm_allocate WHERE username = ?', [res[0][item].username]);
			if (tempres[0].length > 0) {
              for (item1 in tempres[0]) {
              finalResult.push(tempres[0][item1]);
              }
            }
          }
        }else if(res[0][0].permissions == '4'){
			let userGroups = res[0][0].zones.split(',');
			let zone_username_list=[];
			for(group in userGroups){
              var tempdata= await connection.execute('SELECT username FROM tbl_useraccount WHERE permissions=2 and userGroup = ?', [userGroups[group]]);
			  for (group in tempdata[0]) {
				zone_username_list.push(tempdata[0][group]);
				}
			}
			for (item in zone_username_list) {
				var tempres = await connection.execute('SELECT firealarmID, firealarmName,username,userGroup FROM tbl_firealarm_allocate WHERE username = ?', [zone_username_list[item].username]);
				if (tempres[0].length > 0) {
				  for (item1 in tempres[0]) {
				  finalResult.push(tempres[0][item1]);
				  }
				}
			  }

		}else if(res[0][0].permissions == '5'){
			let zone_username_list=[];
			for(group in userGroups){
              var tempdata=res = await connection.execute('SELECT username FROM tbl_useraccount WHERE permissions=4');
			  for (group in tempdata[0]) {
				zone_username_list.push(tempdata[0][group]);
				}
			}
			for (item in zone_username_list) {
				var tempres = await connection.execute('SELECT firealarmID, firealarmName,username,userGroup FROM tbl_firealarm_allocate WHERE username = ?', [zone_username_list[item].username]);
				if (tempres[0].length > 0) {
				  for (item1 in tempres[0]) {
				  finalResult.push(tempres[0][item1]);
				  }
				}
			  }

		}else {
			//var tempres = await connection.execute('SELECT tbl_firealarm_allocate.firealarmID, tbl_firealarm_name.firealarmName FROM tbl_firealarm_allocate LEFT JOIN tbl_firealarm_name ON tbl_firealarm_allocate.firealarmID = tbl_firealarm_name.firealarmID WHERE tbl_firealarm_allocate.username = ?', [username]);
            var tempres = await connection.execute('SELECT firealarmID, firealarmName,username,userGroup FROM tbl_firealarm_allocate WHERE username = ?', [username]);
			if (tempres[0].length > 0) {
              for (item1 in tempres[0]) {
				finalResult.push(tempres[0][item1]);
              }
            }
		}
      }
      connection.release();
    }
    catch (err) {
      console.log(err);
      connection.release();
      return false;
    }
    return finalResult.length > 0 ? finalResult : false;
  },

  /*getFirealarmStatus: async function(deviceID, username) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];

    try {
      res = await connection.execute('SELECT onlineStatus, updatedAt FROM tbl_firealarm_status WHERE firealarmID = ?', [deviceID]);
      connection.release();
    }
    catch (err) {
      console.log(err);
      connection.release();
      return false;
    }
    return res[0].length > 0 ? res[0] : false;
  },*/

  getFirealarmZoneName: async function(deviceID, username) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];

    try {
	  var userPermission = await findPermission(username);
      res = await connection.execute('SELECT id FROM tbl_firealarm_allocate WHERE username = ? AND firealarmID = ?', [username, deviceID]);
      if ((res[0].length > 0) || (userPermission === '2') || (userPermission === '1')) {
        res = await connection.execute('SELECT * FROM tbl_zonename WHERE firealarmID = ?', [deviceID]);
      }
      connection.release();
    }
    catch (err) {
      console.log(err);
      connection.release();
      return false;
    }
    return res[0].length > 0 ? res[0] : false;
  },

  setFirealarmZoneName: async function(body) {
    var retVal = {val: null, errorMsg: "User Not Found or Device Not registered.", returnVal:false};
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];

    try {
	  var userPermission = await findPermission(body.username);
      res = await connection.execute('SELECT id FROM tbl_firealarm_allocate WHERE username = ? AND firealarmID = ?', [body.username, body.deviceID]);
      if ((res[0].length > 0) || (userPermission === '2') || (userPermission === '1')) {
        res = await connection.execute('SELECT * FROM tbl_zonename WHERE firealarmID = ?', [body.deviceID]);
        if (res[0].length > 0) {
          res = await connection.execute('UPDATE tbl_zonename SET zone1 = ?, zone2 = ?, zone3 = ?, zone4 = ?, zone5 = ?, zone6 = ?, zone7 = ?, zone8 = ? WHERE firealarmID = ?', [body.zone1, body.zone2, body.zone3, body.zone4, body.zone5, body.zone6, body.zone7, body.zone8, body.deviceID]);
        }
        else {
          res = await connection.execute('INSERT INTO tbl_zonename (firealarmID, zone1, zone2, zone3, zone4, zone5, zone6, zone7, zone8) values (?,?,?,?,?,?,?,?,?)', [body.deviceID, body.zone1, body.zone2, body.zone3, body.zone4, body.zone5, body.zone6, body.zone7, body.zone8]);
        }
        retVal.returnVal = true;
      }
      connection.release();
      return retVal;
    }
    catch (err) {
      console.log(err);
      connection.release();
      retVal.returnVal = false;
      return retVal;
    }
  },
  
  setFirealarmSiteName: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found or Device Not registered.", returnVal:false};
	  const connection = await mysqlPromise.DATABASE.getConnection();
	  var res = [{}];
	  try {
		  res = await connection.execute('UPDATE tbl_firealarm_allocate SET firealarmName = ? WHERE firealarmID = ?', [body.siteName, body.deviceID]);
		  connection.release();
		  retVal.returnVal = true;
		  return retVal;
	  }
	  catch (err) {
		  console.log(err);
		  connection.release();
		  retVal.returnVal = false;
		  return retVal;
      }
  },
  
  generateZoneReport: async function(body) {
	var retVal = {result: null, reportType: 1, errorMsg: "User Not Found or No site found or No Report available.", returnVal:false};
	const connection = await mysqlPromise.DATABASE.getConnection();
	var res = [{}];
	var deviceList = [];
	var finalResult = [];
	try {
		var userPermission = await findPermission(body.username);
		if ((userPermission === '2') || (userPermission === '1')) {
			var startTime = 0;
			var endTime = 0;
			var getReport = false;
			if (body.reportType == 0) {
				getReport = true;
				startTime = new Date((Date.now() - 24*60*60*1000) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				endTime = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			}
			else if (body.reportType == 1) {
				getReport = true;
				startTime = new Date((Date.now() - 7*24*60*60*1000) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				endTime = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			}
			else if (body.reportType == 2) {
				getReport = true;
				startTime = new Date((Date.now() - 30*24*60*60*1000) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				endTime = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			}
			else if (body.reportType == 3) {
				getReport = true;
				startTime = new Date(Number(body.startTimestamp) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				endTime = new Date(Number(body.endTimestamp) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			}
			
			if (getReport) {
				if (body.deviceID == "ALL") {
					retVal.reportType = 1;
					res = await connection.execute('SELECT userGroup FROM tbl_useraccount WHERE username = ?', [body.username]);
					if (res[0].length > 0) {
						res = await connection.execute('SELECT firealarmID FROM tbl_firealarm_allocate WHERE userGroup = ?', [res[0][0].userGroup]);
						for (item in res[0]) {
							deviceList.push(res[0][item]);
						}
					}
					
					if (deviceList.length > 0) {
						var i = 1;
						for (item in deviceList) {
							var tempres = await connection.execute('SELECT tbl_firealarm_log.firealarmID, tbl_firealarm_allocate.firealarmName, tbl_firealarm_log.zone1Data, \
														tbl_firealarm_log.zone2Data, tbl_firealarm_log.zone3Data, tbl_firealarm_log.zone4Data, tbl_firealarm_log.zone5Data, \
														tbl_firealarm_log.zone6Data, tbl_firealarm_log.zone7Data, tbl_firealarm_log.zone8Data, tbl_firealarm_log.createdAt FROM \
														tbl_firealarm_log JOIN tbl_firealarm_allocate ON tbl_firealarm_log.firealarmID = tbl_firealarm_allocate.firealarmID WHERE \
														tbl_firealarm_log.createdAt >= ? AND tbl_firealarm_log.createdAt <= ? AND tbl_firealarm_log.firealarmID = ?', 
														[startTime, endTime, deviceList[item].firealarmID]);
							if (tempres[0].length > 0) {
								var tempArray = [];
								for (resitem in tempres[0]) {
									tempArray.push({sno:i, firealarmID: tempres[0][resitem].firealarmID, firealarmName:tempres[0][resitem].firealarmName, zone1Data:tempres[0][resitem].zone1Data,
												  zone2Data:tempres[0][resitem].zone2Data, zone3Data:tempres[0][resitem].zone3Data, zone4Data:tempres[0][resitem].zone4Data, 
												  zone5Data:tempres[0][resitem].zone5Data, zone6Data:tempres[0][resitem].zone6Data, zone7Data:tempres[0][resitem].zone7Data, 
												  zone8Data:tempres[0][resitem].zone8Data, createdAt:tempres[0][resitem].createdAt.toISOString().slice(0, 19).replace('T', ' ')});
									i++;
								}
								i = 1;
								finalResult.push(tempArray);
							}
						}
					}
				}
				else {	//Zone report for individual devices
					retVal.reportType = 0;
					var tempres = await connection.execute('SELECT tbl_firealarm_log.firealarmID, tbl_firealarm_allocate.firealarmName, tbl_firealarm_log.zone1Data, \
														tbl_firealarm_log.zone2Data, tbl_firealarm_log.zone3Data, tbl_firealarm_log.zone4Data, tbl_firealarm_log.zone5Data, \
														tbl_firealarm_log.zone6Data, tbl_firealarm_log.zone7Data, tbl_firealarm_log.zone8Data, tbl_firealarm_log.createdAt FROM \
														tbl_firealarm_log JOIN tbl_firealarm_allocate ON tbl_firealarm_log.firealarmID = tbl_firealarm_allocate.firealarmID WHERE \
														tbl_firealarm_log.createdAt >= ? AND tbl_firealarm_log.createdAt <= ? AND tbl_firealarm_log.firealarmID = ?', 
														[startTime, endTime, body.deviceID]);
					if (tempres[0].length > 0) {
						var i = 1;
						for (item in tempres[0]) {
							finalResult.push({sno:i, firealarmID: tempres[0][item].firealarmID, firealarmName:tempres[0][item].firealarmName, zone1Data:tempres[0][item].zone1Data,
											  zone2Data:tempres[0][item].zone2Data, zone3Data:tempres[0][item].zone3Data, zone4Data:tempres[0][item].zone4Data, zone5Data:tempres[0][item].zone5Data,
											  zone6Data:tempres[0][item].zone6Data, zone7Data:tempres[0][item].zone7Data, zone8Data:tempres[0][item].zone8Data, 
											  createdAt:tempres[0][item].createdAt.toISOString().slice(0, 19).replace('T', ' ')});
							i++;
						}
					}
				}
				
				if (finalResult.length <= 0) {
					connection.release();
					retVal.errorMsg = "No Reports Available for this time duration";
					retVal.returnVal = false;
					return retVal;
				} 
				retVal.result = finalResult;
				connection.release();
				retVal.returnVal = true;
				return retVal;
			}
			else {  //Type or report not recognized
				connection.release();
				retVal.returnVal = false;
				return retVal;
			}
		}
		else {  //User Permission >= 3
			connection.release();
			retVal.returnVal = false;
			return retVal;
		}	
	}
	catch (err) {
		console.log(err);
		connection.release();
		retVal.returnVal = false;
		return retVal;
	}	
},
  
  generateDeviceStatusReport: async function(body) {
	  var retVal = {result: null, errorMsg: "User Not Found or No site found or No Report available.", returnVal:false};
	  const connection = await mysqlPromise.DATABASE.getConnection();
	  var res = [{}];
	  var deviceList = [];
	  var finalResult = [];
	  try {
		  var userPermission = await findPermission(body.username);
		   
		  if ((userPermission === '2') || (userPermission === '1')) {
			  var startTime = 0;
			  var endTime = 0;
			  var getReport = false;
			  if (body.reportType == 0) {
				  getReport = true;
				  startTime = new Date((Date.now() - 24*60*60*1000) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				  endTime = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			  }
			  else if (body.reportType == 1) {
				  getReport = true;
				  startTime = new Date((Date.now() - 7*24*60*60*1000) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				  endTime = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			  }
			  else if (body.reportType == 2) {
				  getReport = true;
				  startTime = new Date((Date.now() - 30*24*60*60*1000) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				  endTime = new Date(Date.now() + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			  }
			  else if (body.reportType == 3) {
				  getReport = true;
				  startTime = new Date(Number(body.startTimestamp) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
				  endTime = new Date(Number(body.endTimestamp) + 19800000).toISOString().slice(0, 19).replace('T', ' ');
			  }
			  
			  if (getReport) {
				  if (body.deviceID == "ALL") {
					  res = await connection.execute('SELECT userGroup FROM tbl_useraccount WHERE username = ?', [body.username]);
					  if (res[0].length > 0) {
						  res = await connection.execute('SELECT firealarmID FROM tbl_firealarm_allocate WHERE userGroup = ?', [res[0][0].userGroup]);
						  for (item in res[0]) {
							  deviceList.push(res[0][item]);
						  }
					  }
					  
					  if (deviceList.length > 0) {
						  var tempVar = 0;
						  var tempVarIndex = 0;
						  var i = 1;
						  var snoIndex = 1;
						  
						  for (item in deviceList) {
							  var tempres = await connection.execute('SELECT tbl_firealarm_online_log.id, tbl_firealarm_online_log.firealarmID, tbl_firealarm_allocate.firealarmName,\
															  tbl_firealarm_online_log.status, tbl_firealarm_online_log.updatedAt FROM \
														      tbl_firealarm_online_log JOIN tbl_firealarm_allocate ON \
														      tbl_firealarm_online_log.firealarmID = tbl_firealarm_allocate.firealarmID WHERE \
														      tbl_firealarm_online_log.updatedAt >= ? AND tbl_firealarm_online_log.updatedAt <= ? \
														      AND tbl_firealarm_online_log.firealarmID = ?', [startTime, endTime, deviceList[item].firealarmID]);						  
							  for (i = 0; i < tempres[0].length; i++) {
								  
								  if ((tempres[0][i].status == 0) && (tempVar == 0)) {
									  tempVarIndex = i;
									  tempVar = 1;
								  }
								  if ((tempres[0][i].status == 1) && (tempVar == 1)) {
									  finalResult.push({sno:snoIndex, firealarmID:tempres[0][i].firealarmID, firealarmName:tempres[0][i].firealarmName, 
														startTime:tempres[0][tempVarIndex].updatedAt.toISOString().slice(0, 19).replace('T', ' '),
														endTime:tempres[0][i].updatedAt.toISOString().slice(0, 19).replace('T', ' ')});
									  tempVar = 0;
									  snoIndex += 1;
								  }
							  }
							  
							  if (tempVar == 1) {
								  finalResult.push({sno:snoIndex, firealarmID:tempres[0][tempVarIndex].firealarmID, firealarmName:tempres[0][tempVarIndex].firealarmName, 
													startTime:tempres[0][tempVarIndex].updatedAt.toISOString().slice(0, 19).replace('T', ' '),
													endTime:""});
								  tempVar = 0;
							  }
						  }
					  }
				  }
				  else { //Device Status report for individual devices
					  var tempres = await connection.execute('SELECT tbl_firealarm_online_log.id, tbl_firealarm_online_log.firealarmID, tbl_firealarm_allocate.firealarmName,\
															  tbl_firealarm_online_log.status, tbl_firealarm_online_log.updatedAt FROM \
														      tbl_firealarm_online_log JOIN tbl_firealarm_allocate ON \
														      tbl_firealarm_online_log.firealarmID = tbl_firealarm_allocate.firealarmID WHERE \
														      tbl_firealarm_online_log.updatedAt >= ? AND tbl_firealarm_online_log.updatedAt <= ? \
														      AND tbl_firealarm_online_log.firealarmID = ?', [startTime, endTime, body.deviceID]);
					  if (tempres[0].length > 0) {
						  var tempVar = 0;
						  var tempVarIndex = 0;
						  var i = 1;
						  var snoIndex = 1;
						  for (i = 0; i < tempres[0].length; i++) {
							  if ((tempres[0][i].status == 0) && (tempVar == 0)) {
								  tempVarIndex = i;
								  tempVar = 1;
							  }
							  if ((tempres[0][i].status == 1) && (tempVar == 1)) {
								  finalResult.push({sno:snoIndex, firealarmID:tempres[0][i].firealarmID, firealarmName:tempres[0][i].firealarmName, 
													startTime:tempres[0][tempVarIndex].updatedAt.toISOString().slice(0, 19).replace('T', ' '),
													endTime:tempres[0][i].updatedAt.toISOString().slice(0, 19).replace('T', ' ')});
								  tempVar = 0;
								  snoIndex += 1;
							  }
						  }
						  if (tempVar == 1) {
							  finalResult.push({sno:snoIndex, firealarmID:tempres[0][tempVarIndex].firealarmID, firealarmName:tempres[0][tempVarIndex].firealarmName, 
												startTime:tempres[0][tempVarIndex].updatedAt.toISOString().slice(0, 19).replace('T', ' '),
												endTime:""});
							  tempVar = 0;
						  }
					  }
				  }
				  
				  if (finalResult.length <= 0) { //No Data Available from database thus no reports available
					  connection.release();
					  retVal.errorMsg = "No Reports Available for this time duration";
					  retVal.returnVal = false;
					  return retVal;
				  }
				  
				  retVal.result = finalResult;
				  connection.release();
				  retVal.returnVal = true;
				  return retVal;
			  }
			  else {  //Type or report not recognized
				  connection.release();
				  retVal.returnVal = false;
				  return retVal;
			  }
		  }
		  else {  //User Permission >= 3
			  connection.release();
			  retVal.returnVal = false;
			  return retVal;
		  }
		  
	  }
	  catch (err) {
		  console.log(err);
		  connection.release();
		  retVal.returnVal = false;
		  return retVal;
	  }
	  
  },
  
  //check if email enabled
  checkEmailEnabled: async function(deviceId) 
  {
	  var retVal = {returnVal:false, emailEnabled: false, errorMsg: "User Not Found.", emailList:null};
	  var res = [{}];
	  const deviceUser = await findUserID(deviceId);
	  const connection = await mysqlPromise.DATABASE.getConnection();
	  try 
	  {
		  res = await connection.execute('SELECT emailEnabled, alertEmailIds FROM tbl_useraccount WHERE username = ?', [deviceUser]);
		  connection.release();
		  if (res[0].length > 0) {
			  if (res[0][0].emailEnabled == 1) {
				  retVal.returnVal = true;
				  retVal.emailEnabled = true;
				  retVal.emailList = res[0][0].alertEmailIds;
				  return retVal;
			  }
		  }
		  retVal.returnVal = false;
		  return retVal;
	  }
	  catch(err)
	  {
		  console.error(err);
		  connection.release();
		  retVal.returnVal = false;
		  return retVal;
	  }
  },
  
  //Get Zone Name Allocated
  getZoneName: async function(deviceID) {
    const connection = await mysqlPromise.DATABASE.getConnection();
    var res = [{}];

    try {
	  res = await connection.execute('SELECT * FROM tbl_zonename WHERE firealarmID = ?', [deviceID]);
      connection.release();
    }
    catch (err) {
      console.log(err);
      connection.release();
      return false;
    }

    var zoneNameList = [];
    if (res[0].length > 0)
    {
		zoneNameList = [checkZoneName(res[0][0].zone1, 1),checkZoneName(res[0][0].zone2, 2), checkZoneName(res[0][0].zone3, 3), checkZoneName(res[0][0].zone4, 4), checkZoneName(res[0][0].zone5, 5), checkZoneName(res[0][0].zone6, 6), checkZoneName(res[0][0].zone7, 7), checkZoneName(res[0][0].zone8, 8)];
	}
	else
	{
		zoneNameList = [];
	}
    return zoneNameList;
  },
  
  getOrganizationName: async function(user){
	  const connection = await mysqlPromise.DATABASE.getConnection();
	  var res = [{}];
	  try {
		  res = await connection.execute('SELECT organizationName FROM tbl_useraccount WHERE username = ?', [user]);
          connection.release();
      }
      catch (err) {
		  console.log(err);
		  connection.release();
		  return "";
	  }
	  if (res[0].length > 0)
	  {
		  if ((res[0][0].organizationName.length) > 0)
		  {
			  return res[0][0].organizationName;
		  }
	  }
	  return "";
  },
  
  getFirealarmName: async function(deviceID) {
	  const connection = await mysqlPromise.DATABASE.getConnection();
	  var res = [{}];
	  try {
		  res = await connection.execute('SELECT firealarmName FROM tbl_firealarm_allocate WHERE firealarmID = ?', [deviceID]);
          connection.release();
      }
      catch (err) {
		  console.log(err);
		  connection.release();
		  return "";
	  }
	  if (res[0].length > 0)
	  {
		  if ((res[0][0].firealarmName.length) > 0)
		  {
			  return res[0][0].firealarmName;
		  }
	  }
	  return "";
  },
  
  getUsernameDeviceId: async function(deviceID) {
	  const deviceUser = await findUserID(deviceID);
	  return deviceUser;
  },
  
}

function checkZoneName(str, index) {
	if (isEmptyOrSpaces(str))
	{
		return 'ZONE ' + index.toString();
	}
	else
		return str;
}

function isEmptyOrSpaces(str){
    return str === null || str.match(/^ *$/) !== null;
}

async function findUserID(firealarmId) {
  const connection = await mysqlPromise.DATABASE.getConnection();
  var res = [{}];
  try {
    res = await connection.execute('SELECT username FROM tbl_firealarm_allocate WHERE firealarmID = ?', [firealarmId]);
    connection.release();

    if (res[0].length > 0) {
		return res[0][0].username;
    }
    return "";
  }
  catch (err) {
    console.error(err)
    connection.release();
    return "";
  }
}

async function findPermission(username) {
	const connection = await mysqlPromise.DATABASE.getConnection();
	var res = [{}];
	try {
		res = await connection.execute('SELECT permissions FROM tbl_useraccount WHERE username = ?', [username]);
		connection.release();

		if (res[0].length > 0) {
			return res[0][0].permissions;
		}
		return "";
	}
	catch (err) {
		console.error(err)
		connection.release();
		return "";
	}
}

function buildTableBody(data, sd, columns) {
    var body = [];

    body.push(sd);

    data.forEach(function(row) {
        var dataRow = [];

        columns.forEach(function(column) {
            dataRow.push(row[column].toString());
        })

        body.push(dataRow);
    });

    return body;
}

/*function table(data, columns) {
    return {
        table: {
            headerRows: 1,
            body: buildTableBody(data, columns)
        }
    };
}*/


module.exports = deviceModel;
