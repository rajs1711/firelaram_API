module.exports.user_email_map = new Map();
module.exports.saveUser_EmailMap = function(key, val){
											module.exports.user_email_map.set(key, val);
										};
module.exports.getUser_EmailMap = function(key) {
											if (module.exports.user_email_map.has(key))
												return module.exports.user_email_map.get(key);
											else
												return null
									   };
module.exports.deleteUser_EmailMap = function(key){
												if (module.exports.user_email_map.has(key)) {
													module.exports.user_email_map.delete(key);
													return true;
												}
												return false;
										  };
										  

module.exports.hasUser_EmailMap = function(key) {
											return module.exports.user_email_map.has(key);
									   };	
