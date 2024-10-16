module.exports.deviceID_socket_map = new Map();
module.exports.saveDeviceID_SocketMap = function(key, val){
											module.exports.deviceID_socket_map.set(key, val);
										};
module.exports.getDeviceID_SocketMap = function(key) {
											if (module.exports.deviceID_socket_map.has(key))
												return module.exports.deviceID_socket_map.get(key);
											else
												return null
									   };
module.exports.deleteDeviceID_SocketMap = function(key){
												if (module.exports.deviceID_socket_map.has(key)) {
													module.exports.deviceID_socket_map.delete(key);
													return true;
												}
												return false;
										  };
										  

module.exports.hasDeviceID_SocketMap = function(key) {
											return module.exports.deviceID_socket_map.has(key);
									   };	
