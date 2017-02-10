'use strict';
const async = require("async");
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
//{
//	"itemId" : "",
//	"option" : "",
//	"amount" : "",
//}
exports.handler = function (event, context, callback) {
	if (event.amount >= 1) {
		var userId = context.identity.cognitoIdentityId;
		async.parallel({
			info: getData.bind(null, process.env.UsersTableName, "id", userId),
			item: getData.bind(null, process.env.ItemsTableName, "id", event.itemId),
			rewards: getRewards.bind(null, userId, event.itemId)
		}, function done(err, results) {
			if (err) {
				console.error(err);
				callback(err);
			}
			else {
				var sumAmount = 0;
				results.rewards.Items.forEach(function (reward) {
					sumAmount += reward.amount;
				});
				var payValue = results.item.Item.price * event.amount;
				if (results.info.satang < payValue) {
					callback("Not enough satang.");
				}
				else if (sumAmount + event.amount > results.item.Item.limit) {
					callback("Over reward's limit.");
				}
				else {
					buyReward(userId, payValue, event.itemId, event.option, event.amount, callback);
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
function getRewards(userId, itemId, callback) {
	var params = {
		TableName : process.env.RewardsTableName,
		ProjectionExpression: "createdOn, itemId, option, amount, shippingStatus, emsId",
		KeyConditionExpression: "ownerId = :ownerId",
		FilterExpression: "itemId = :itemId",
		ExpressionAttributeValues: {
			":ownerId": userId,
			":itemId": itemId
		}
	};
	dynamo.query(params, function (err, data) {
		if (err) {
			callback("Error getRewards : " + JSON.stringify(err, null, 2));
		} else {
			callback(null, data);
		}
	});
}
function buyReward(userId, payValue, itemId, option, amount, callback) {
	async.parallel({
		info: updateInfo.bind(null, userId, payValue),
		reward: addReward.bind(null, userId, itemId, option, amount)
	}, function done(err, results) {
		if (err) {
			callback("Error buyReward : " + JSON.stringify(err, null, 2));
		}
		else {
			callback(null, JSON.stringify(results.reward));
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
			callback("Error updateInfo : " + JSON.stringify(err, null, 2));
		} else {
			callback(null, data);
		}
	});
}
function addReward(userId, itemId, option, amount, callback) {
	var reward = {
		"ownerId": userId,
		"createdOn": Date.now(),
		"itemId": itemId,
		"option": option,
		"amount": amount,
		"shippingStatus": 1
	};
	dynamo.putItem({
		TableName: process.env.TicketsTableName,
		Item: reward
	}, function (err, data) {
		if (err) {
			callback("Error addReward : " + JSON.stringify(err, null, 2));
		}
		else {
			callback(null, reward);
		}
	});
}