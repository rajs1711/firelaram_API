const allUsersAcountProperties = {
    username: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string', nullable: true },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    lastloginDate: { type: 'string' },
    groupName: { type: 'string' },
    enabledAccount: { type: 'number' },
    userMessage: { type: 'string', nullable: true }
};

const singleUserAccountProperties = {
    //id: {type:'number'},
    username: { type: 'string' },
    //password: {type:'string'},
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    lastloginDate: { type: 'string' },
    //firealarm: {type:'string'},
    //enabledAccount:{type:'number'},
    //userAccessLevel:{type:'number'},
    //userGroup:{type:'number'},
    userMessage: { type: 'string' }
};

const paramsJsonSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' }
    },
    required: ['id']
};

const queryStringJsonSchema = {
    type: 'object',
    properties: {
        username: { type: 'string' }
    },
    required: ['username']
};

const bodyUserUpdateJsonSchema = {
    type: 'object',
    properties: {
        username: { type: 'string'},
        firstName: { type: 'string'},
        lastName: { type: 'string'}
    },
    required: ['username', 'firstName', 'lastName']
};

const bodyPasswordUpdateJsonSchema = {
    type: 'object',
    properties: {
        username: { type: 'string' },
        oldpassword: { type: 'string'},
        password: { type: 'string' }
    },
    required: ['username', 'oldpassword', 'password']
};

const bodyLoginJsonschema = {
	type: 'object',
	properties: {
        username: { type: 'string' },
		password: { type: 'string' },
	},
	required: ['username', 'password']
};

const bodyRegisterJsonschema = {
	type: 'object',
	properties: {
        username: { type: 'string' },
		tokenVal: { type: 'string' },
	},
	required: ['username', 'tokenVal']
};

const bodyForgotPasswdUsernameJsonschema = {
	type: 'object',
	properties: {
        username: { type: 'string' },
	},
	required: ['username']
};

const getSingleUserSchema = {
    querystring: queryStringJsonSchema,
    response: {
        200: {
			type: 'object',
			properties: singleUserAccountProperties
        }
    }
};

const updateSingleUserSchema = {
    body: bodyUserUpdateJsonSchema,
    response: {
        200: {
			type: 'object',
			properties: {
                returnVal: { type: 'boolean' }
            }
        }
    }
};

const updateSingleUserPasswordSchema = {
    body: bodyPasswordUpdateJsonSchema,
    response: {
        200: {
			type: 'object',
			properties: {
                returnVal: { type:'boolean' }
            }
		}
    }
};

const userLoginSchema = {
    body: bodyLoginJsonschema,
    response: {
        200: {
			type: 'object',
			properties: {
                returnVal: { type:'boolean' },
                firstName: {type:'string' },
                lastName: { type:'string' },
                admin: { type:'boolean'},
                token: { type:'string' },
                remarks: { type:'string'},
                firstLogin: { type:'boolean' },
                orgName: { type:'string' },
                orgLogo: { type:'string' },
                permissions: { type:'string' }
            }
		}
    }
};

const registerSchema = {
    body: bodyRegisterJsonschema,
    response: {
        200: {
			type: 'object',
			properties: {
                returnVal: { type:'boolean' }
            }
		}
    }
};

const forgotPasswdUsernameSchema = {
    body: bodyForgotPasswdUsernameJsonschema,
    response: {
        200: {
			type: 'object',
			properties: {
                returnVal: { type:'boolean' }
            }
		}
    }
};


module.exports = {
    getSingleUserSchema,
    updateSingleUserSchema,
    updateSingleUserPasswordSchema,
    userLoginSchema,
    registerSchema,
    forgotPasswdUsernameSchema
  };
