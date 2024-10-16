const nodemailer = require('nodemailer');
const redis = require("redis");
const redisclient = redis.createClient();
const emailKeyName = "totEmailCount";
const maxEmails = 500;

const senderEmail = 'softchip.ts@gmail.com';
const senderPasswd = 'lmgv ohdl jugi roqd';
	
async function generateMail(receiverEmailIds, emailSubject, emailBody) {
	let totalEmailsSent = 0;
	
	redisclient.get(emailKeyName, function(err, data) {
		if(err) {
			console.log("totEmailCount key doesn't exist or failed to read it's value stored in Redis.");
		}
		else {
			totalEmailsSent = parseInt(data,10);
		}
		
		if (totalEmailsSent < maxEmails)
		{
			let transporter = nodemailer.createTransport(
				{
					host: 'smtp.gmail.com',
					port: 465,
					secure: true,
					auth: {
						user: senderEmail,
						pass: senderPasswd
					},
					logger: false,
					debug: false // include SMTP traffic in the logs
				},
				{
					// sender info
					from: 'Admin <pratyush@geotechsystems.in>',
					headers: {
						'X-Laziness-level': 1000 // just an example header, no need to use this
					}
				}
			);
			let mailOptions = {
				to: receiverEmailIds,
				subject: emailSubject,
				text: 'Hello',
				html: emailBody,
			};
			
			transporter.sendMail(mailOptions, function(error, info){
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
	}
}

module.exports = generateMail;
