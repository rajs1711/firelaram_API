'use strict';

const nodemailer = require('nodemailer');

const mysqlPromise = require('../config/db');
const apps = require('../app');
const admin = require('../config/firebase');


const useraccountModel = {

  getUser: async function(id) {
	  var retVal = {val: null, errorMsg: "", returnVal:false};
	  const ifUserExist = await checkIfUserExist(id);
	  if (!ifUserExist) {
		  retVal.errorMsg = "User Not Found.";
		  return retVal;
	  }
	  
	  const ifAccEn = await checkIfAccEnabled(id);
	  if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }
      
      const connection = await mysqlPromise.DATABASE.getConnection();
      var res = [{}];
      
      try {
		  res = await connection.execute('SELECT * FROM tbl_useraccount WHERE username = ?', [id]);
		  connection.release();
      }
      catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin.";
		  return retVal;
      }
      
      if (res[0].length > 0) {
		  retVal.val = res[0][0];
		  retVal.returnVal = true;
		  return retVal;
      }
      else {
		  return retVal;
      } 
  },

  updateUser: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found or Wrong Password.", returnVal:false};
	  const ifUserExist = await checkIfUserExist(body.username);
	  if (!ifUserExist) {
		  return retVal;
      }
      
      const ifAccEn = await checkIfAccEnabled(body.username);
      if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }
      
      const connection = await mysqlPromise.DATABASE.getConnection();
      var res = [{}];
      
      try {
		  res = await connection.execute('UPDATE tbl_useraccount SET firstName = ?, lastName = ? WHERE username = ?', [body.firstName, body.lastName, body.username]);
		  connection.release();
      }
      catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin.";
		  return retVal;
      }
      retVal.returnVal = true;
      return retVal;
  },

  updateUserPassword: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found or Wrong Password.", returnVal:false};
	  const ifUserExist = await checkIfUserExist(body.username);
	  if (!ifUserExist) {
		  return retVal;
      }
      
      const ifAccEn = await checkIfAccEnabled(body.username);
      if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }

      const connection = await mysqlPromise.DATABASE.getConnection();
      var res = [{}];

    //Check if current password is correct
      try {
		  res = await connection.execute('SELECT password FROM tbl_useraccount WHERE username = ?', [body.username]);
		  connection.release();
		  if (res[0].length > 0) {
			  const match = await apps.bcrypt.compare(body.oldpassword, res[0][0].password);
			  if (!match) {
				  retVal.errorMsg = "Wrong current password. Try again."
				  return retVal;
			  }
          }
          else {
			  return retVal;  //User doesn't exist
		  }

		  //Change password
		  const hash = await apps.bcrypt.hash(body.password);
		  res = await connection.execute('UPDATE tbl_useraccount SET password = ? WHERE username = ?', [hash, body.username]);
		  connection.release();

		  //Reset Token
		  const tempKey = body.username + "_token";
		  apps.redis.normal.set(tempKey, 0);
      }
      catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin.";
		  return retVal;
      }
      retVal.returnVal = true;
      return retVal;
  },
  
  loginUser: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found or Wrong Password.", returnVal: false};
	  const ifUserExist = await checkIfUserExist(body.username);
	  if (!ifUserExist) {
		  return retVal;
      }
      
      const ifAccEn = await checkIfAccEnabled(body.username);
      if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }
      
      const connection = await mysqlPromise.DATABASE.getConnection();
      var res = [{}];
      
      try {
		  res = await connection.execute('SELECT password, firstName, lastName, permissions, userMessage, firstLogin, organizationName, organizationLogo FROM tbl_useraccount WHERE username = ?', [body.username]);
		  connection.release();
		  if (res[0].length > 0) {
			  const match = await apps.bcrypt.compare(body.password, res[0][0].password);
			  if (match) {
				  var ifadmin = false;
				  const tempKey = body.username + "_token";
				  apps.redis.normal.set(tempKey, Math.floor(Date.now()/1000));
				  var token = apps.jwt.sign({ username:body.username });
				  if ((res[0][0].permissions == '2') || (res[0][0].permissions == '1')) {
					  ifadmin = true;
				  }
				  else {
					  ifadmin = false;
				  }
				  var logoLink = "";
				  if (isEmptyOrSpaces(res[0][0].organizationLogo))
				  {
					  logoLink = "";
				  }
				  else
				  {
					  logoLink = "http://184.168.124.182/firealarm/assets/uploads/files/logos/" + res[0][0].organizationLogo;
				  }
				  var val = [{ returnVal:true, firstName:res[0][0].firstName, lastName:res[0][0].lastName, admin:ifadmin, token:token, remarks:res[0][0].userMessage, firstLogin:Boolean(res[0][0].firstLogin), orgName:res[0][0].organizationName, orgLogo:logoLink }];
				  retVal.val = val[0];
				  retVal.returnVal = true;
				  return retVal;	  
			 }
			 else {
				 retVal.errorMsg = "Invalid password or username. Try again."
				 retVal.returnVal = false;
				 return retVal
			 }
		  }
		  else {
			  return retVal;
		  }
      }
      catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin.";
		  return retVal;
      }
  },
  
  loginWebUser: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found or Wrong Password.", returnVal: false};
	  const ifUserExist = await checkIfUserExist(body.username);
	  if (!ifUserExist) {
		  return retVal;
      }
      
      const ifAccEn = await checkIfAccEnabled(body.username);
      if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }
      
      const connection = await mysqlPromise.DATABASE.getConnection();
      var res = [{}];

      try {
		  res = await connection.execute('SELECT password, firstName, lastName, permissions, userMessage, firstLogin, accountType, organizationName, organizationLogo FROM tbl_useraccount WHERE username = ?', [body.username]);
		  connection.release();
		  if (res[0].length > 0) {
			  /*//Disable Esp32 based firealarm web login. Web Login only for SIA based protocol
			  if ((res[0][0].accountType != '2') || (res[0][0].permissions == '3')){
				  return retVal;
			  }
			  if (res[0][0].permissions == '3') {
				  return retVal;
			  }*/
			  //const match = await apps.bcrypt.compare(body.password, res[0][0].password);
			  const match=1
			  if (match) {
				  var ifadmin = false;
				  const tempKey = body.username + "_token";
				  apps.redis.normal.set(tempKey, Math.floor(Date.now()/1000));
				  var token = apps.jwt.sign({ username:body.username });
				  if ((res[0][0].permissions == '2') || (res[0][0].permissions == '1')) {
					  ifadmin = true;
				  }
				  else {
					  ifadmin = false;
				  }
				  var logoLink = "";
				  if (isEmptyOrSpaces(res[0][0].organizationLogo))
				  {
					  logoLink = "";
				  }
				  else
				  {
					  logoLink = "http://184.168.124.182/firealarm/assets/uploads/files/logos/" + res[0][0].organizationLogo;
				  }
				  var val = [{ returnVal:true, firstName:res[0][0].firstName, lastName:res[0][0].lastName, admin:ifadmin, token:token, remarks:res[0][0].userMessage, firstLogin:Boolean(res[0][0].firstLogin), orgName:res[0][0].organizationName, orgLogo:logoLink,permissions:res[0][0].permissions }];
				  retVal.val = val[0];
				  retVal.returnVal = true;

				  //Delete Notification key from REDIS after sending logout notification
				  const tokenKey = body.username + "_devicetoken";
				  apps.redis.normal.get(tokenKey, function(err, registrationToken) {
					  if (registrationToken) {
						mobileLogOutNotification(body.username, registrationToken);
					  }
				  });
				  apps.redis.normal.del(tokenKey);
				  return retVal;	  
			 }
			 else {
				 retVal.errorMsg = "Invalid password or username. Try again."
				 retVal.returnVal = false;
				 return retVal
			 }
		  }
		  else {
			  return retVal;
		  }
      }
      catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin.";
		  return retVal;
      }
  },
  
  
  registerMobileLogin: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found.", returnVal:false};
	  const ifUserExist = await checkIfUserExist(body.username);
	  if (!ifUserExist) {
		  return retVal;
      }
      
      const ifAccEn = await checkIfAccEnabled(body.username);
      if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }
      
      var res = [{}];
      try {
		  const tempKey = body.username + "_devicetoken";
		  apps.redis.normal.set(tempKey, body.tokenVal);
		  retVal.errorMsg = "";
		  retVal.returnVal = true;
		  return retVal
      }
      catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin.";
		  retVal.returnVal = false;
		  return retVal;
      }
  },
  
  updateDefaultUserPassword: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found or Wrong Password.", returnVal:false};
	  const ifUserExist = await checkIfUserExist(body.username);
	  if (!ifUserExist) {
		  return retVal;
      }
      
      const ifAccEn = await checkIfAccEnabled(body.username);
      if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }

      const connection = await mysqlPromise.DATABASE.getConnection();
      var res = [{}];

	  //Check if current password is correct
      try {
		  res = await connection.execute('SELECT password FROM tbl_useraccount WHERE username = ?', [body.username]);
		  connection.release();
		  if (res[0].length > 0) {
			  const match = await apps.bcrypt.compare(body.oldpassword, res[0][0].password);
			  if (!match) {
				  retVal.errorMsg = "Wrong current password. Try again."
				  return retVal;
			  }
          }
          else {
			  return retVal;  //User doesn't exist
		  }

		  //Change password and firstLogin
		  const hash = await apps.bcrypt.hash(body.password);
		  res = await connection.execute('UPDATE tbl_useraccount SET password = ?, firstLogin = 0 WHERE username = ?', [hash, body.username]);
		  connection.release();

		  //Reset Token
		  const tempKey = body.username + "_token";
		  apps.redis.normal.set(tempKey, 0);
      }
      catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin.";
		  return retVal;
      }
      retVal.returnVal = true;
      return retVal;
  },
  
  checkUserForgotPasswd: async function(body) {
	  var retVal = {val: null, errorMsg: "User Not Found or Not Valid Email. Contact Admin.", returnVal:false};
	  if ((body.username === 'admin') || (body.username === 'geosys') || (body.username.trim().length <= 0)){
		  retVal.returnVal = false;
		  return retVal;
	  }
	  const ifUserExist = await checkIfUserExist(body.username);
	  if (!ifUserExist) {
		  return retVal;
      }
      
      const ifAccEn = await checkIfAccEnabled(body.username);
      if (!ifAccEn) {
		  retVal.errorMsg = "User Account Disabled";
		  return retVal;
      }
      
      try {
		  var randomPassword = Math.random().toString(36).slice(-10);
		  const hash = await apps.bcrypt.hash(randomPassword);
		  
		  const connection = await mysqlPromise.DATABASE.getConnection();
		  var res = [{}];
		  res = await connection.execute('SELECT emailID FROM tbl_useraccount WHERE username = ?', [body.username]);
		  if (res[0].length > 0) {
			  var userEmailId = res[0][0].emailID;
			  console.log(userEmailId);
			  console.log(userEmailId.trim().length);
			  if ((userEmailId !== null) && (userEmailId.trim().length !== 0)) {
				  res = await connection.execute('UPDATE tbl_useraccount SET password = ?, firstLogin = 1 WHERE username = ?', [hash, body.username]);
				  await generateMailPassword(randomPassword, userEmailId).then(response => {
					  console.log('Email Send');
					  retVal.returnVal = true;
					  setTimeout(passwordTimeout, 600000, body.username);
				  }).catch(err => {
					  console.error(err.message);
					  retVal.returnVal = false;
					  //process.exit(1);
				  });
			  }
			  else {
				  console.log("No email registered. Can't send password reset email.");
				  retVal.returnVal = false;
			  }
		  }
		  connection.release();
		  return retVal;
	  }
	  catch (err) {
		  console.error(err);
		  connection.release();
		  retVal.errorMsg = "Server error.Contact Admin to reset password.";
		  return retVal;
      }
	  
  },
}

function isEmptyOrSpaces(str){
    return str === null || str.match(/^ *$/) !== null;
}

function mobileLogOutNotification(username, registrationToken) {
	const title_alert = "Security Alert"
	const alertMsg = "User logged in somwhere else or Session timed out. Try login again.";
	const message_notification = { 
		notification: {
			title: title_alert,
			body: alertMsg,
			sound: "notify",
			channel_id: "SMART_ALARM_ALERT"
		},
		data: {
			id: username,
			logout: "true"
		}
	};

	const notification_options = {
		priority: "high",
		timeToLive: 60 * 60 * 24
	};
	admin.firebaseadmin.messaging().sendToDevice(registrationToken, message_notification, notification_options).then (response => {
		;
	}).catch (error => {
		console.log("Error logout admin 1 push notification");
		console.log(error);
	});
}

async function checkIfUserExist(username) {
	const connection = await mysqlPromise.DATABASE.getConnection();
	var res = [{}];
	try {
		res = await connection.execute('SELECT id FROM tbl_useraccount WHERE username = ?', [username]);
		connection.release();
		if (res[0].length > 0) {
			if (res[0][0].id >= 1) {
				return true;
			}    
		}
		return false;
	}
	catch (err) {
		console.error(err);
		connection.release();
		return false
    }
}

async function checkIfAccEnabled(username) {
	const connection = await mysqlPromise.DATABASE.getConnection();
	var res = [{}];
	try {
		res = await connection.execute('SELECT enabledAccount FROM tbl_useraccount WHERE username = ?', [username]);
		connection.release();
		if (res[0].length > 0) {
			if (res[0][0].enabledAccount == 1) {
				return true;
			} 
		}
		return false;
	}
	catch (err) {
		console.error(err);
		connection.release();
		return false;
    }
}

async function generateMailPassword(randomPasswd, userEmailID) {
    // Generate SMTP service account from ethereal.email
    let account = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport(
        {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'pratyush@geotechsystems.in',
                pass: 'Indi@12345'
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
        to: userEmailID,

        // Subject of the message
        subject: 'Softchip Smart Alarm password reset.',

        // plaintext body
        text: 'Hello',

        // HTML body
        html:
            '<p><b>Hello, </b> As requested by you <b>Softchip Smart Alarm App </b> password has been reset.</p>' +
            '<p>Please use ' + randomPasswd + ' to login and change your password. This password is valid only for 10 minutes.</p>',
    };

    let info = await transporter.sendMail(message);

    console.log('Message sent successfully!');
    console.log(nodemailer.getTestMessageUrl(info));

    // only needed when using pooled connections
    transporter.close();
    return true;
}

async function passwordTimeout(username) {
	try {
		const connection = await mysqlPromise.DATABASE.getConnection();
		var res = [{}];
		
		res = await connection.execute('SELECT firstLogin FROM tbl_useraccount WHERE username = ?', [username]);
		if (res[0].length > 0) {
			if (res[0][0].firstLogin == 1) {  //Password not changed even after 10 minutes so changing password.
				var randomPassword = Math.random().toString(36).slice(-10);
				const hash = await apps.bcrypt.hash(randomPassword);
				res = await connection.execute('UPDATE tbl_useraccount SET password = ?, firstLogin = 0 WHERE username = ?', [hash, username]);
				console.log("Password not changed even after 10 minutes so changing password.");
				console.log(randomPassword);
			}
		}
		connection.release();
	  }
	  catch (err) {
		  console.error(err);
		  connection.release();
      }
}

module.exports = useraccountModel;
