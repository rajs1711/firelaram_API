const allUsersAcountProperties = {
    username: { type: 'string' },
    firstName: {type: 'string'},
    lastName: {type: 'string', nullable: true},
    createdAt: { type: 'string' },
    updatedAt: {type: 'string'},
    lastloginDate: {type: 'string'},
    groupName: {type: 'string'},
    enabledAccount: {type: 'number'},
    userMessage: {type: 'string', nullable: true}
};

const logProperties = {
    //id: {type:'number'},
    firealarmID: { type: 'string' },
    zone1Data: {type: 'number'},
    zone2Data: {type: 'number'},
    zone3Data: {type: 'number'},
    zone4Data: {type: 'number'},
    zone5Data: {type: 'number'},
    zone6Data: {type: 'number'},
    zone7Data: {type: 'number'},
    zone8Data: {type: 'number'},
    createdAt: { type: 'string' },
};

const getDeviceProperties = {
    firealarmID: { type: 'string'},
    firealarmName: { type: 'string'},
    username: {type:'string'}
};

const zoneNameProperties = {
    firealarmID: { type: 'string' },
    zone1: {type: 'string'},
    zone2: {type: 'string'},
    zone3: {type: 'string'},
    zone4: {type: 'string'},
    zone5: {type: 'string'},
    zone6: {type: 'string'},
    zone7: {type: 'string'},
    zone8: {type: 'string'}
};

const motorlogProperties = {
    firealarmID: { type: 'string' },
    motorstate: {type: 'number'},
    updateAt: { type: 'string' },
};

const paramsJsonSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' }
    },
    required: ['id']
};

const deviceLogQueryStringJsonSchema = {
    type: 'object',
    properties: {
        username: { type: 'string' },
        deviceID: { type: 'string' }
    },
    required: ['username', 'deviceID']
};

const getFirealarmQueryStringJsonSchema = {
    type: 'object',
    properties: {
        username: { type: 'string' },
    },
    required: ['username']
};

const deviceStatusJsonSchema = {
    type: 'object',
    properties: {
        deviceID: { type: 'string' },
		timestamp: {type: 'string'}
    },
    required: ['deviceID', 'timestamp']
};

const sendDevicePinStatusJsonSchema = {
    type: 'object',
    properties: {
        username: { type: 'string'},
        deviceID: { type: 'string' },
        outputPINSTATUS: {
			type: 'object',
			properties: {
				outPIN: {type: 'number'},
				outPINVAL: {type: 'number'}
			},
			required: ['outPIN', 'outPINVAL']
		},
		timestamp: {type: 'string'}
    },
    required: ['username', 'deviceID', 'outputPINSTATUS', 'timestamp']
};

const sendWifiCredsJsonSchema = {
	type: 'object',
	properties: {
        username: { type: 'string'},
		deviceID: {type: 'string'},
		wifiSSID: {type: 'string'},
		wifiPASSWD: {type: 'string'},
		timestamp: {type: 'string'},
	},
	required: ['username', 'deviceID', 'wifiSSID', 'wifiPASSWD', 'timestamp']
};

const sendServerCredsJsonSchema = {
	type: 'object',
	properties: {
        username: { type: 'string'},
		deviceID: {type: 'string'},
		serverADDR: {type: 'string'},
		serverPORT: {type: 'number'},
		timestamp: {type: 'string'},
	},
	required: ['username', 'deviceID', 'serverADDR', 'serverPORT', 'timestamp']
};

const sendSoftRestJsonSchema = {
	type: 'object',
	properties: {
        username: { type: 'string'},
		deviceID: {type: 'string'},
		softRESET: {type: 'string'},
		timestamp: {type: 'string'},
	},
	required: ['username', 'deviceID', 'softRESET', 'timestamp']
};

const zoneNameJsonSchema = {
	type: 'object',
	properties: {
        username: { type: 'string'},
		deviceID: {type: 'string'},
		zone1: {type: 'string'},
        zone2: {type: 'string'},
        zone3: {type: 'string'},
        zone4: {type: 'string'},
        zone5: {type: 'string'},
        zone6: {type: 'string'},
        zone7: {type: 'string'},
        zone8: {type: 'string'}
	},
	required: ['username', 'deviceID']
};

const siteNameJsonSchema = {
	type: 'object',
	properties: {
        username: { type: 'string'},
		deviceID: {type: 'string'},
		siteName: {type: 'string'}
	},
	required: ['username', 'deviceID', 'siteName']
};

const zoneReportJsonSchema = {
	type: 'object',
	properties: {
        username: { type: 'string'},
		deviceID: {type: 'string'},
		reportType: {type: 'number'},
		startTimestamp: {type: 'string'},
		endTimestamp: {type: 'string'}
	},
	required: ['username', 'deviceID', 'reportType', 'startTimestamp', 'endTimestamp']
};

const deviceStatusReportJsonSchema = {
	type: 'object',
	properties: {
        username: { type: 'string'},
		deviceID: {type: 'string'},
		reportType: {type: 'number'},
		startTimestamp: {type: 'string'},
		endTimestamp: {type: 'string'}
	},
	required: ['username', 'deviceID', 'reportType', 'startTimestamp', 'endTimestamp']
};

const upgradeFirmwareJsonSchema = {
    type: 'object',
    properties: {
        username: { type: 'string'},
        update: { type: 'boolean' },
		timestamp: {type: 'string'}
    },
    required: ['username', 'update', 'timestamp']
};

const deviceStatusSchema = {
	body: deviceStatusJsonSchema,
	response: {
		200: {
			type: 'object',
			properties: {
				returnVal: {type: 'boolean'},
				status: {type: 'boolean'}
			}
		}
	}
};

const upgradeFirmwareSchema = {
	body: upgradeFirmwareJsonSchema,
	response: {
		200: {
			type: 'object',
			properties: {
				returnVal: {type: 'boolean'}
			}
		}
	}
};

const getdeviceStatusSchema = {
	querystring: deviceLogQueryStringJsonSchema,
	response: {
        200: {
            type: 'object',
			properties: {
				onlineStatus: { type: 'number'},
                updatedAt: { type: 'string'}
			}
		}
	}
};

const devicePinStatusSchema = {
    body: sendDevicePinStatusJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {returnVal: {type:'boolean'}}
        }
    }
};

const wifiCredsSchema = {
    body: sendWifiCredsJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {returnVal: {type:'boolean'}}
        }
    }
};

const serverCredsSchema = {
    body: sendServerCredsJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {returnVal: {type:'boolean'}}
        }
    }
};

const softResetSchema = {
    body: sendSoftRestJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {returnVal: {type:'boolean'}}
        }
    }
};

const getLogSchema = {
    querystring: deviceLogQueryStringJsonSchema,
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: logProperties
			}
		}
	}
};

const getDevicesSchema = {
    querystring: getFirealarmQueryStringJsonSchema,
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: getDeviceProperties
			}
		}
	}
};

const getZoneNameSchema = {
    querystring: deviceLogQueryStringJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: zoneNameProperties
		}
	}
};

const setZoneNameSchema = {
    body: zoneNameJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {returnVal: {type:'boolean'}}
		}
	}
};

const setSiteNameSchema = {
    body: siteNameJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {returnVal: {type:'boolean'}}
		}
	}
};

const zoneReportSchema = {
    body: zoneReportJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {
							returnVal: {type:'boolean'}, 
							reportlink: {type:'string'}
						}
		}
	}
};

const devicestatusReportSchema = {
    body: deviceStatusReportJsonSchema,
    response: {
        200: {
            type: 'object',
            properties: {
							returnVal: {type:'boolean'}, 
							reportlink: {type:'string'}
						}
		}
	}
};


module.exports = {
    deviceStatusSchema,
    devicePinStatusSchema,
    wifiCredsSchema,
    serverCredsSchema,
    softResetSchema,
    getLogSchema,
    getDevicesSchema,
    getdeviceStatusSchema,
    getZoneNameSchema,
    setZoneNameSchema,
    setSiteNameSchema,
    upgradeFirmwareSchema,
    zoneReportSchema,
    devicestatusReportSchema
};
