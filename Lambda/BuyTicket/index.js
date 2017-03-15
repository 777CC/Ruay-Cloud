'use strict';
const async = require("async");
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
//{
//	"roundId" : "",
//	"reserveNumber" : "",
//	"amount" : "",
//}
exports.handler = function (event, context, callback){
	if (event.amount >= 1) {
		var userId = context.identity.cognitoIdentityId;
		async.parallel({
			info: getData.bind(null, process.env.UsersTableName, "id", userId),
			round: getData.bind(null, process.env.RoundsTableName, "id", event.roundId),
			tickets: getTickets.bind(null, userId, event.roundId)
		}, function done(err, results) {
			if (err) {
				console.error(err);
				callback(err);
			}
			else {
				var sumAmount = 0;
				results.tickets.Items.forEach(function (item) {
					sumAmount += item.amount;
				});
				var payValue = results.round.Item.price * event.amount;
				var timeNow = Date.now();
				if (timeNow < results.round.Item.startTime || timeNow > results.round.Item.endTime) {
					callback("Invalid date.");
				} else if (results.info.satang < payValue) {
					callback("Not enough satang.");
				} else if (sumAmount + event.amount > results.round.Item.limit) {
					callback("Over ticket's limit.");
				} else {
					buyTicket(userId, payValue, event.roundId, event.reserveNumber, event.amount, callback);
				}
			}
		});
	}
	else {
		callback("amount lower then 1.");
	}
};
function getData(tableName, keyName, id, callback) {
	var params = {}
	params.TableName = tableName;
	params["Key"] = {};
	params.Key[keyName] = id;
	dynamo.getItem(params, function (err, data) {
		if (err) {
			callback("Error getData : " + keyName + " : " + JSON.stringify(err, null, 2));
		}
		else {
			callback(null, data);
		}
	});
}
function getTickets(userId,roundId, callback) {
	var params = {
		TableName : process.env.TicketsTableName,
		ProjectionExpression: "createdOn, roundId, reserveNumber, amount, announced",
		KeyConditionExpression: "ownerId = :ownerId",
		FilterExpression: "roundId = :roundId",
		ExpressionAttributeValues: {
			":ownerId": userId,
			":roundId": roundId
		}
	};
	dynamo.query(params, function (err, data) {
		if (err) {
			callback("Error getTickets : " + JSON.stringify(err, null, 2));
		} else {
			callback(null, data);
		}
	});
}
function buyTicket(userId, payValue, roundId, reserveNumber, amount, callback) {
	async.parallel({
		info: updateInfo.bind(null, userId, payValue),
		ticket: addTicket.bind(null, userId, roundId, reserveNumber, amount)
	}, function done(err, results) {
		if (err) {
			callback("Error buy ticket : " + JSON.stringify(err, null, 2));
		}
		else {
			console.log(JSON.stringify(results.ticket));
			callback(null, results.ticket);
		}
	});
}
function updateInfo(userId, payValue, callback) {
	var params = {
		TableName: process.env.UsersTableName,
		Key: { "id" : userId }
	};
	params.UpdateExpression = "SET satang = satang - :v";
	params.ExpressionAttributeValues = {
		":v": payValue
	}
	dynamo.updateItem(params, function (err, data) {
		if (err) {
			callback("Error buy ticket : " + JSON.stringify(err, null, 2));
		} else {
			callback(null, data);
		}
	});
}
function addTicket(userId, roundId, reserveNumber, amount, callback) {
	var ticket = {
		"ownerId": userId,
		"createdOn": Date.now(),
		"roundId": roundId,
		"reserveNumber": reserveNumber,
		"amount": amount
		//"announced": false
	};
	dynamo.putItem({
		TableName: process.env.TicketsTableName,
		Item: ticket
	}, function (err, data) {
		if (err) {
			callback("Can not add ticket. : " + JSON.stringify(err, null, 2));
		}
		else {
			delete ticket.ownerId;
			callback(null, ticket);
		}
	});
}