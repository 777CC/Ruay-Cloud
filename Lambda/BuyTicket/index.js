'use strict';
const async = require("async");
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
//{
//	"roundId" : "",
//	"choice" : "",
//	"amount" : "",
//}
exports.handler = function (event, context, callback){
	async.parallel({
		info: getUserInfo.bind(null, context.identity.cognitoIdentityId),
		round: getUserInfo.bind(null, event.roundId),
		tickets: getTicket.bind(null, context.identity.cognitoIdentityId, event.roundId),
		}, function done(err, results) {
		if (err) {
			console.log(err);
		}
		callback(null, JSON.stringify(results.info));
	});
};
function getUserInfo(id, callback) {
	dynamo.getItem(
		{
			"TableName": process.env.UsersTableName,
			"Key": { "id" :  id}
		}
                    , function (err, data) {
			if (err) {
				callback("Error : " + JSON.stringify(err));
			}
			else if (Object.keys(data).length === 0) {
				callback("Error : no user info");
			}
			else {
				console.log(JSON.stringify(data));
				callback(null,data);
			}
		});
}
function getRound(roundId, callback) {
	dynamo.getItem(
		{
			"TableName": process.env.RoundsTableName,
			"Key": { "id" : roundId }
		}
        , function (err, data) {
			if (err) {
				callback("Error : " + JSON.stringify(err));
			}
			else {
				console.log(JSON.stringify(data));
				callback(null, data);
			}
		});
}
function getTicket(userId, roundId, callback) {
	dynamo.getItem(
		{
			"TableName": process.env.TicketsTableName,
			"Key": {
				"ownerId" : userId,
				"roundId" : roundId,
			}
		}
        , function (err, data) {
			if (err) {
				callback("Error : " + JSON.stringify(err));
			}
			else {
				console.log(JSON.stringify(data));
				callback(null, data);
			}
		});
}
function addTicket(user, round, callback) {

}