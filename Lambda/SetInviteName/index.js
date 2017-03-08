'use strict';
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
//{
//	"oldInviteName" : "",
//	"newInviteName" : ""
//}

exports.handler = function (event, context, callback) {
	var ownerId = context.identity.cognitoIdentityId;
	//var ownerId = event.id;
	if (event.newInviteName && event.newInviteName.length >= 0) {
		addInviteName(event.oldInviteName,event.newInviteName, ownerId, callback);
		//if (event.oldInviteName && event.oldInviteName.length >= 0) {
		//	deleteInviteName(event.oldInviteName, event.newInviteName, ownerId, callback);
		//} else {
		//	scanInviteName(event.newInviteName, ownerId, callback);
		//}
	} else {
		callback("inviteName not valid.");
	}
};

//function scanInviteName(inviteName, ownerId, callback) {
//	console.log("scanInviteName");
//	var params = {
//		TableName: process.env.InviteNamesTableName,
//		ProjectionExpression: "ownerId, inviteName",
//		FilterExpression: "ownerId = :oid",
//		ExpressionAttributeValues: {
//			":oid": ownerId
//		}
//	};
//	dynamo.scan(params, function (err, data) {
//		if (err) {
//			console.error("Unable to scan item. Error JSON:", JSON.stringify(err, null, 2));
//			callback("Unable to scan item.");
//		} else {
//			if (data.Count > 0) {
//				deleteInviteName(data.Items[0].inviteName, inviteName, ownerId, callback);
//			} else {
//				addInviteName(inviteName, ownerId, callback);
//			}
//		}
//	});
//}

function deleteInviteName(deleteName, inviteName, ownerId, callback) {
	var params = {
		TableName: process.env.InviteNamesTableName,
		Key: {
			"inviteName": deleteName
		},
		ConditionExpression: "ownerId = :id",
		ExpressionAttributeValues: {
			":id": ownerId
		}
	};
	console.log("deleteInviteName", JSON.stringify(params, null, 2));
	dynamo.deleteItem(params, function (err, data) {
		if (err) {
			console.error("Unable to delete item. Error JSON:", ownerId, deleteName, inviteName, JSON.stringify(err, null, 2));
		}
		callback(null, inviteName);
	});
}

function addInviteName(deleteName,inviteName, ownerId, callback) {
	console.log("addInviteName");
	var params = {
		TableName: process.env.InviteNamesTableName,
		Item: {
			"inviteName": inviteName,
			"ownerId": ownerId
		},
		ConditionExpression: "attribute_not_exists(inviteName)"
	};
	dynamo.putItem(params, function (err, data) {
		if (err) {
			console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
			callback("Unable to add item.");
		} else {
			if (deleteName && deleteName.length >= 0) {
				deleteInviteName(deleteName, inviteName, ownerId, callback);
			} else {
				callback(null, inviteName);
			}
		}
	});
}