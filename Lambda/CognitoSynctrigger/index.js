'use strict';
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
const async = require('async');
const userDataKeys = ['fbProfilePicture','firstName', 'lastName', 'phoneNumber', 'birthday', 'gender', 'zodiac', 'interests' ];
const registerReward = 99;
const nextDailyRewardValue = 40;
const inviteReward = 500;
exports.handler = function (event, context, callback) {
    // Check for the event type
    if (event.eventType === 'SyncTrigger') {
		if ('updateTime' in event.datasetRecords) {
			async.parallel({
				info: getUserInfo.bind(null, event),
				reward: getUserReward.bind(null, event.identityId),
				ticket: getUserTicket.bind(null, event.identityId)
			}, function (err, results) {
				if (err) return console.error(JSON.stringify(err, null, 2));
				editRecord(event, 'rewards', JSON.stringify(results.reward));
				editRecord(event, 'tickets', JSON.stringify(results.ticket));
				console.log(JSON.stringify(event));
				context.done(null, event);
			});
		}
    }
};
function editRecord(dataset, key, data) {
	if (data) {
		dataset.datasetRecords[key] = {
			newValue: data,
			op: 'replace',
		};
	}
}
function getNextDailyRewardTime() {
	//next day is after 4 o'clock in the morning.
	var today = new Date();
	//if(20 < 21)
    var tomorrow;

    console.log("Now : " + Date.now() +" hour : " + today.getUTCHours() + " : " + (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 21) + 86400000));
	if (today.getUTCHours() > 21) {
		//86400000 is unix timestamp per day.
		tomorrow = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 21) + 86400000;
	}
	else {
		tomorrow = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 21);
	}
	return tomorrow;
}
function addDataset(userData, datasetRecords) {
	userDataKeys.forEach(function (item) {
		if (item in datasetRecords) {
			if (item === "interests") {
				var interests = datasetRecords[item].newValue.split('#').filter(function (el) { return el.length !== 0 });
				userData[item] = dynamo.Set(interests, "S");
			}
			else {
				userData[item] = datasetRecords[item].newValue;
			}
		}
	});
}
function getUserTicket(id, callback) {
	var ticketParams = {
		TableName : process.env.TicketsTableName,
		ProjectionExpression: "createdOn, roundId, reserveNumber, amount, announced",
		KeyConditionExpression: "ownerId = :ownerId ",
		ExpressionAttributeValues: {
			":ownerId": id
		}
	};
	dynamo.query(ticketParams, function (err, data) {
		if (err) {
			console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
		} else {
			callback(null, data.Items);
		}
	});
}
function getUserReward(id, callback){
    var rewardParams = {
                        TableName : process.env.RewardsTableName,
                        ProjectionExpression:"createdOn, itemId, choice, amount, shippingStatus, emsId",
                        KeyConditionExpression: "ownerId = :ownerId ",
                        ExpressionAttributeValues: {
                            ":ownerId": id
                        }
                    };
                    dynamo.query(rewardParams, function(err, data) {
                        if (err) {
                            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
                        } else {
                            callback(null, data.Items);
                        }
                    });
}
function getUserInfo(modifiedEvent, callback) {
	dynamo.getItem(
		{
			"TableName": process.env.UsersTableName,
			"Key": { "id" : modifiedEvent.identityId }
		}
                    , function (err, data) {
			if (err) {
				console.log("getUserInfo : " + JSON.stringify(err));
			}
                        //length === 0 for not registered user.
			else if (Object.keys(data).length === 0) {
				addUser(callback, modifiedEvent);
			}
			else {
				updateUserInfo(callback, data.Item, modifiedEvent);
			}
		});
}
function addUser(callback,modifiedEvent){
    //"ticket": dynamo.Set(["fdsafdsafdsa","fdsafdasfdasf"], "S")
    //error!! stringset cannot be empty "ticket": dynamo.Set([], "S")
    //date use in UTC standard
    //"interest":dynamo.Set(["game","dev"], "S"),
    
    var user = {
        "id": modifiedEvent.identityId,
        "createdOn":Date.now(),
		"updateTime": Date.now(),
		"nextDailyRewardTime": getNextDailyRewardTime(),
        "satang": registerReward
    };
    
    if('facebookId' in modifiedEvent.datasetRecords){
        user.facebookId = modifiedEvent.datasetRecords.facebookId.newValue;
    }
    
    addDataset(user,modifiedEvent.datasetRecords);
    dynamo.putItem({
                        TableName: process.env.UsersTableName,
                        Item: user
                        }
                        ,function(err, data) {
							console.log("addUser : " + JSON.stringify(data, null, 2));
                            callback();
                    });
}
function updateUserInfo(callback, oldData, modifiedEvent) {
	var userParams = {
		TableName: process.env.UsersTableName,
		Key: { "id" : modifiedEvent.identityId }
	};

	var isUpdate = false;
	userParams.UpdateExpression = "set ";
	userParams.ExpressionAttributeValues = {};
	userDataKeys.forEach(function (key) {
		if (key in modifiedEvent.datasetRecords) {
			if (modifiedEvent.datasetRecords[key].op === 'replace') {
				isUpdate = true;
				if (key === 'interests') {
					userParams.UpdateExpression += "interests = :interests, ";
					var interests = modifiedEvent.datasetRecords[key].newValue.split('#').filter(function (el) { return el.length !== 0 });
					userParams.ExpressionAttributeValues[":interests"] = dynamo.Set(interests, "S");
				}
				else if (key === 'zodiac') {
					userParams.UpdateExpression += key + " = :" + key + ", ";
					userParams.ExpressionAttributeValues[":" + key] = parseInt(modifiedEvent.datasetRecords[key].newValue);
				}
				else {
					userParams.UpdateExpression += key + " = :" + key + ", ";
					userParams.ExpressionAttributeValues[":" + key] = modifiedEvent.datasetRecords[key].newValue;
				}
			}
		}
	});

	//Check and give daily reward, or set satang.
	if (Date.now() > oldData.nextDailyRewardTime) {
		isUpdate = true;
		userParams.UpdateExpression += "satang = satang + :reward, nextDailyRewardTime = :nextDailyRewardTime, ";
		userParams.ExpressionAttributeValues[":reward"] = nextDailyRewardValue;
		userParams.ExpressionAttributeValues[":nextDailyRewardTime"] = getNextDailyRewardTime();
		editRecord(modifiedEvent, "satang", oldData.satang + nextDailyRewardValue);
	} else {
		editRecord(modifiedEvent, "satang", oldData.satang);
	}

	//Check and give invite reward.
	if (!oldData.inviteBy && modifiedEvent.datasetRecords.inviteBy && modifiedEvent.datasetRecords.inviteBy.newValue && modifiedEvent.datasetRecords.inviteBy.newValue.length > 0) {
		getIdfromInviteName(isUpdate, userParams, modifiedEvent, callback);
	} else {
		if (oldData.inviteBy && modifiedEvent.datasetRecords.inviteBy) {
			if (modifiedEvent.datasetRecords.inviteBy.newValue && modifiedEvent.datasetRecords.inviteBy.newValue.length > 0) { 
				oldData.inviteBy = oldData.inviteBy;
			}
		}
		if (isUpdate) {
			updateUserDB(userParams, callback);
		} else {
			callback();
		}
	}
}
function getIdfromInviteName(isUpdate,params, modifiedEvent, callback) {
	dynamo.getItem({
			"TableName": process.env.InviteNamesTableName,
			"Key": { "inviteName" : modifiedEvent.datasetRecords.inviteBy.newValue }
		}, function (err, data) {
		if (err) {
			console.log("inviteName err : " + JSON.stringify(err, null, 2));
			callback(err);
		} else if (Object.keys(data).length === 0) {//length === 0 for not registered user.
			modifiedEvent.datasetRecords.inviteBy.op = 'remove';
			console.log("inviteName length0 :" + JSON.stringify(modifiedEvent, null, 2));
			if (isUpdate) {
				updateUserDB(params, callback);
			} else {
				callback();
			}
		} else {
			console.log("inviteName ok :" + JSON.stringify(data, null, 2));
			var inviteParams = {
				TableName: process.env.UsersTableName,
				Key: {
					"id" : data.Item.ownerId
				},
				UpdateExpression : "set satang = satang + :reward, ",
				ExpressionAttributeValues: {
					":reward": inviteReward
				}
			};
			params.UpdateExpression += "inviteBy = :inviteBy, ";
			params.ExpressionAttributeValues[":inviteBy"] = modifiedEvent.datasetRecords.inviteBy.newValue;
			async.parallel({
				invite: updateUserDB.bind(null, inviteParams),
				user: updateUserDB.bind(null, params)
			}, function (err, results) {
				callback(err);
			});
		}
	});
}
function updateUserDB(params, callback) {
	//delete , from UpdateExpression.
	params.UpdateExpression = params.UpdateExpression.substring(0, params.UpdateExpression.length - 2);
	dynamo.updateItem(params, function (err, data) {
		callback(err);
	});
}