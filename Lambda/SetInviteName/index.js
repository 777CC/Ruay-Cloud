'use strict';
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function (event, context, callback) {
    var ownerId = context.identity.cognitoIdentityId;
    var inviteName = event.newInviteName;
    if (inviteName && inviteName.length >= 0) {
        findSameInviteName(inviteName, function (err, data) {
            if (err) {
                callback("inviteName not valid.");
            } else {
                updateInfo(ownerId, inviteName, function (err, result) {
                    if (err) {
                        callback("fail");
                    } else {
                        callback();
                    }
                })
            }
        });
	} else {
		callback("inviteName not valid.");
	}
};

function findSameInviteName(inviteName, callback) {
    var params = {
        TableName: process.env.UsersTableName,
        IndexName: "inviteName-index",
        ProjectionExpression: "id",
        KeyConditionExpression: "inviteName = :ivn",
        ExpressionAttributeValues: {
            ":ivn": inviteName
        }
    };
    dynamo.query(params, function (err, data) {
        if (err) {
            console.error("error findSameInviteName : " + JSON.stringify(err, null, 2));
            callback("Error");
        } else {
            if (data.Items.length > 0) {
                callback("found same name");
            } else {
                callback();
            }
        }
    });
}

function updateInfo(userId, inviteName, callback) {
    var params = {
        TableName: process.env.UsersTableName,
        Key: { "id": userId }
    };
    params.UpdateExpression = "set inviteName = :v";
    params.ExpressionAttributeValues = {
        ":v": inviteName
    }
    dynamo.updateItem(params, function (err, data) {
        if (err) {
            callback("Error updateInfo : " + JSON.stringify(err, null, 2));
        } else {
            callback(null, data);
        }
    });
}

//function addInviteName(deleteName,inviteName, ownerId, callback) {
//	console.log("addInviteName");
//	var params = {
//		TableName: process.env.InviteNamesTableName,
//		Item: {
//			"inviteName": inviteName,
//			"ownerId": ownerId
//		},
//		ConditionExpression: "attribute_not_exists(inviteName)"
//	};
//	dynamo.putItem(params, function (err, data) {
//		if (err) {
//			console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
//			callback("Unable to add item.");
//		} else {
//			if (deleteName && deleteName.length >= 0) {
//				deleteInviteName(deleteName, inviteName, ownerId, callback);
//			} else {
//				callback(null, inviteName);
//			}
//		}
//	});
//}


//function deleteInviteName(deleteName, inviteName, ownerId, callback) {
//    var params = {
//        TableName: process.env.InviteNamesTableName,
//        Key: {
//            "inviteName": deleteName
//        },
//        ConditionExpression: "ownerId = :id",
//        ExpressionAttributeValues: {
//            ":id": ownerId
//        }
//    };
//    console.log("deleteInviteName", JSON.stringify(params, null, 2));
//    dynamo.deleteItem(params, function (err, data) {
//        if (err) {
//            console.error("Unable to delete item. Error JSON:", ownerId, deleteName, inviteName, JSON.stringify(err, null, 2));
//        }
//        callback(null, inviteName);
//    });
//}
