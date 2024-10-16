const admin = require("firebase-admin");

var serviceAccount = require("./softchip-firealarm-firebase-adminsdk-oh535-d16de2ac3b.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

module.exports.firebaseadmin = admin;