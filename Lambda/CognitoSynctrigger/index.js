'use strict';
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
const async = require('async');
const userDataKeys = ["tel","gender","firstName", "lastName", "interests","birthday"];

exports.handler = function (event, context, callback) {
    // Check for the event type
    if (event.eventType === 'SyncTrigger') {
        if('updateTime' in event.datasetRecords){
			if (event.datasetRecords.updateTime.newValue !== event.datasetRecords.updateTime.oldValue) {
                async.parallel({
					info: getUserInfo.bind(null, event),
					reward: getUserReward.bind(null, event.identityId),
					ticket: getUserTicket.bind(null, event.identityId)
				}, function(err, results) { //This function gets called after the two tasks have called their "task callbacks"
					if (err) return console.log(err);
					editRecord(event, 'rewards', JSON.stringify(results.reward));
					editRecord(event, 'tickets', JSON.stringify(results.ticket));
					console.log(JSON.stringify(event));
                    context.done(null, event);
                });
            }
            else{
                context.done(null, modifiedEvent);
            }
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
function nextDailyRewardTime() {
	var today = new Date();
	
	//if(20 < 21)
	var tomorrow;
	if (today.getUTCHours() > 21) {
		//if(20 < 21){
		tomorrow = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 21);
	}
	else {
		tomorrow = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 21) + 86400000;
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
function getUserTicket(id, callback){
    var ticketParams = {
                        TableName : process.env.TicketsTableName,
                        ProjectionExpression:"createdOn, roundId, reserveNumber, amount, announced",
                        KeyConditionExpression: "ownerId = :ownerId ",
                        ExpressionAttributeValues: {
                            ":ownerId": id
                        }
                    };
                    dynamo.query(ticketParams, function(err, data) {
                        if (err) {
                            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
                        } else {
                            callback();
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
function getUserInfo(modifiedEvent, callback){
        dynamo.getItem(
                    {
                        "TableName": process.env.UsersTableName,
                        "Key": { "id" :modifiedEvent.identityId}
                    }
                    ,function(err, data) {
                        if(err){
                            console.log("Error : " +  JSON.stringify(err));
                        }
                        //length === 0 for not registered user.
                        else if(Object.keys(data).length === 0){
                            console.log("addUser");
                            addUser(callback,modifiedEvent);
                        }
                        else{
                            updateUserInfo(callback,data,modifiedEvent);
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
        "updateTime":Date.now(),
        "satang": 0
    };
    
    if('facebookId' in modifiedEvent.datasetRecords){
        user.facebookId = modifiedEvent.datasetRecords.facebookId.newValue;
    }
    
    addDataset(user,modifiedEvent.datasetRecords);
    console.log( JSON.stringify(user));
    dynamo.putItem({
                        TableName: process.env.UsersTableName,
                        Item: user
                        }
                        ,function(err, data) {
                             console.log("data : " +  JSON.stringify(data));
                            callback();
                    });
}
function updateUserInfo(callback,oldData,modifiedEvent){
    var userParams = {
        TableName:process.env.UsersTableName,
        Key: { "id" :modifiedEvent.identityId}
    };
    if ("satang" in modifiedEvent.datasetRecords) {
        if(modifiedEvent.datasetRecords.satang !== null && oldData.satang !== null)
        {
            modifiedEvent.datasetRecords.satang.newValue = oldData.Item.satang;
            modifiedEvent.datasetRecords.satang.op = 'replace';
        }
    }
    else{
            editRecord(modifiedEvent,"satang",oldData.Item.satang);
        }
    
    
    var isUpdate = false;
    var UpdateExpression = "set ";
    userParams.ExpressionAttributeValues = {};
    userDataKeys.forEach(function(key) {
        if (key in modifiedEvent.datasetRecords) {
            if(modifiedEvent.datasetRecords[key].op === 'replace'){
                isUpdate = true;
                
                if(key === 'interests'){
                    UpdateExpression += "interests = :interests, ";
                    var interests = modifiedEvent.datasetRecords[key].newValue.split('#').filter(function(el) {return el.length !== 0});
                    userParams.ExpressionAttributeValues[":interests"] = dynamo.Set(interests, "S");
                }
                else{
                    UpdateExpression += key + " = :" + key + ", ";
                    userParams.ExpressionAttributeValues[":" +key] = modifiedEvent.datasetRecords[key].newValue;
                }
            }
        }
    });
    
    if(isUpdate){
        userParams.UpdateExpression = UpdateExpression.substring(0, UpdateExpression.length - 2);
        console.log( JSON.stringify(userParams));
        dynamo.updateItem(userParams, function(err, data) {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                callback();
            }
        });
    }else{
        callback();
    }
}