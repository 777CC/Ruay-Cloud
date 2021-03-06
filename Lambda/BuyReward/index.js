'use strict';
const async = require("async");
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
//{
//	"itemId" : "",
//	"choice" : "",
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
				var timeNow = Date.now();
				if (timeNow < results.item.Item.startTime || timeNow > results.item.Item.endTime) {
					callback("Invalid date.");
				} else if (results.info.satang < payValue) {
					callback("Not enough satang.");
				} else if (sumAmount + event.amount > results.item.Item.limit) {
					callback("Over reward's limit.");
				} else {
					buyReward(userId, payValue, event.itemId, event.choice, event.amount, callback);
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
		ProjectionExpression: "createdOn, itemId, choice, amount, shippingStatus, emsId",
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
function buyReward(userId, payValue, itemId, choice, amount, callback) {
	async.parallel({
		info: updateInfo.bind(null, userId, payValue),
		reward: addReward.bind(null, userId, itemId, choice, amount)
	}, function done(err, results) {
		if (err) {
			callback("Error buyReward : " + JSON.stringify(err, null, 2));
		}
		else {
			callback(null, results.reward);
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
function addReward(userId, itemId, choice, amount, callback) {
	var reward = {
		"ownerId": userId,
		"createdOn": Date.now(),
		"itemId": itemId,
		"choice": choice,
		"amount": amount,
		"shippingStatus": 1
	};
	dynamo.putItem({
		TableName: process.env.RewardsTableName,
		Item: reward
	}, function (err, data) {
		if (err) {
			callback("Error addReward : " + JSON.stringify(err, null, 2));
		}
		else {
			delete reward.ownerId;
			callback(null, reward);
		}
	});
}