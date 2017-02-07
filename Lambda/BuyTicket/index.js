'use strict';
const async = require("async");
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
exports.handler = function (event, context, callback){
	var user;
	console.log("Start");
	//async.parallel([
 //                   //get user's info from dynamodb
	//		function (cb) {
	//		getUserInfo(cb, context, user);
	//	},
	//	function (cb) {
	//		cb();
	//	}
	//	], function (err) { //This function gets called after the two tasks have called their "task callbacks"
	//		if (err) return console.log(err);
	//		context.done(null, JSON.stringify(user));
	//});

	async.parallel([function (callback) {
			getUserInfo(callback, context, user);
		}, function (callback) {
			console.log("B");
			callback();
		}], function done(err, results) {
		if (err) {
			console.log(err);
		}
		context.done(null, "done");
	});
};

function getUserInfo(callback, context, user) {
	dynamo.getItem(
		{
			"TableName": process.env.UsersTableName,
			"Key": { "id" : context.identity.accountId }
		}
                    , function (err, data) {
			if (err) {
				console.log(JSON.stringify(err));
				callback("Error : " + JSON.stringify(err));
			}
			else if (Object.keys(data).length === 0) {
				console.log(JSON.stringify(err));
				callback("Error : no user info");
			}
			else {
				user = data;
				//callback();
				console.log(JSON.stringify(data));
				callback("Error : no user info");
			}
		});
}
