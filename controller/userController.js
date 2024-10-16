const useraccountModel = require('../models/userModel')

async function getSingleUser (request, reply) {
    const singleUserData = await useraccountModel.getUser(request.query.username);
    if (singleUserData.returnVal) {
        return reply.send(singleUserData.val);
    }
    else {
        return reply.status(500).send({ error: singleUserData.errorMsg});
    }
}

async function updateSingleUser (request, reply) {
    const result = await useraccountModel.updateUser(request.body);
    if (result.returnVal) {
        return reply.send({returnVal: true});
    }
    else {
        return reply.status(500).send({ error:result.errorMsg});
    }
}

async function updateSingleUserPassword (request, reply) {
    const result = await useraccountModel.updateUserPassword(request.body);
    if (result.returnVal) {
        return reply.send({returnVal: true});
    }
    else {
        return reply.status(500).send({ error:result.errorMsg});
    }
}
async function userLogin (request, reply) {
    const result = await useraccountModel.loginUser(request.body);
    if (result.returnVal) {
        return reply.send(result.val);
    }
    else {
        return reply.status(500).send({ error:result.errorMsg});
    }
}
async function userWebLogin (request, reply) {
    const result = await useraccountModel.loginWebUser(request.body);
    if (result.returnVal) {
        return reply.send(result.val);
    }
    else {
        return reply.status(500).send({ error:result.errorMsg});
    }
}
async function registerDevice (request, reply) {
	const result = await useraccountModel.registerMobileLogin(request.body);
    if (result.returnVal) {
        return reply.send({returnVal: true});
    }
    else {
        return reply.status(500).send({ error:result.errorMsg});
    }
}

async function updateSingleUserDefaultPassword (request, reply) {
    const result = await useraccountModel.updateDefaultUserPassword(request.body);
    if (result.returnVal) {
        return reply.send({returnVal: true});
    }
    else {
        return reply.status(500).send({ error:result.errorMsg});
    }
}

async function checkUserForgotPasswd (request, reply) {
    const result = await useraccountModel.checkUserForgotPasswd(request.body);
    if (result.returnVal) {
        return reply.send({returnVal: true});
    }
    else {
        return reply.status(500).send({ error:result.errorMsg});
    }
}


module.exports = {
    getSingleUser,
    updateSingleUser,
    updateSingleUserPassword,
    userLogin,
    userWebLogin,
    registerDevice,
    updateSingleUserDefaultPassword,
    checkUserForgotPasswd
};
