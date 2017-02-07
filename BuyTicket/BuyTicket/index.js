'use strict';
var async = require("async");
var doc = require('dynamodb-doc');
var dynamo = new doc.DynamoDB();
exports.handler = function (event, context, callback) {
	if ('updateTime' in event.datasetRecords) {
		if (event.datasetRecords.updateTime.newValue !== event.datasetRecords.updateTime.oldValue) {
			async.parallel([
                    //get user's info from dynamodb
				function (cb) {
					getUserInfo(cb, modifiedEvent);
				}
			], function (err) { //This function gets called after the two tasks have called their "task callbacks"
				if (err) return console.log(err);
				console.log(JSON.stringify(modifiedEvent));
				context.done(null, modifiedEvent);
			});
		}
		else {
			context.done(null, modifiedEvent);
		}
	}
};

function getUserInfo(callback, modifiedEvent) {
	dynamo.getItem(
		{
			"TableName": process.env.UsersTableName,
			"Key": { "id" : context.identity.accountId }
		}
                    , function (err, data) {
			if (err) {
				callback("Error : " + JSON.stringify(err));
			}
			else if (Object.keys(data).length === 0) {
				callback("Error : no user info");
			}
			else {
				callback();
			}
		});
}
