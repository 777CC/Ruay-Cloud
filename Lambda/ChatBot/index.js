//'use strict';

//console.log('Loading function');

//const doc = require('dynamodb-doc');

//const dynamo = new doc.DynamoDB();


/**
 * Provide an event that contains the following keys:
 *
 *   - operation: one of the operations in the switch statement below
 *   - tableName: required for operations that interact with DynamoDB
 *   - payload: a parameter to pass to the operation being performed
 */
//var VERIFY_TOKEN = "ruay_token";

//exports.handler = (event, context, callback) => {
//    console.log(JSON.stringify(event));
//    console.log(JSON.stringify(context));
//    // process GET request
//    if (event.params && event.params.querystring) {
//        var queryParams = event.params.querystring;

//        var rVerifyToken = queryParams['hub.verify_token']

//        if (rVerifyToken === VERIFY_TOKEN) {
//            var challenge = queryParams['hub.challenge']
//            callback(null, parseInt(challenge))
//        } else {
//            callback(null, 'Error, wrong validation token');
//        }
//    }
//};
'use strict';
//console.log('Loading function');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
const async = require("async");
const url = require('url');
const path = require("path");
//const URL = require('url-parse');
const request = require('request');
const https = require('https');
var PAGE_ACCESS_TOKEN;
var MESSENGER_VALIDATION_TOKEN;
var APPSECRET_PROOF;
var config = require('./config.js');
var Round;
exports.handler = (event, context, callback) => {
    MESSENGER_VALIDATION_TOKEN = event["stage-variables"]["MESSENGER_VALIDATION_TOKEN"] || "ruay_token";
    PAGE_ACCESS_TOKEN = event["stage-variables"]["PAGE_ACCESS_TOKEN"];
    APPSECRET_PROOF = event["stage-variables"]["appsecret_proof"];
    console.log('Received event:', JSON.stringify(event, null, 2));
    var method = event.context["http-method"];
    var response = "";
    var queryparams = event.params.querystring;
    if (method === "GET") {
        if (queryparams['hub.mode'] === 'subscribe'
            &&
            queryparams['hub.verify_token'] === MESSENGER_VALIDATION_TOKEN) {
            response = queryparams['hub.challenge'];
        }
        else {
            response = "Incorrect verify token"
        }
        callback(null, response);//return the challenge
    }
    else {
        if (method === "POST") {
            var messageEntries = event["body-json"].entry;
            //for (var entryIndex in messageEntries) {
            if (messageEntries.length > 0){
                //var messageEntry = messageEntries[entryIndex].messaging;
                var messageEntry = messageEntries[0].messaging;
                //for (var messageIndex in messageEntry) {
                if (messageEntry.length > 0){
                    //var message = messageEntry[messageIndex];
                    var message = messageEntry[0];
                    if (message.message !== undefined && message.message["is_echo"] !== true) {
                        //var botresponse = responses[Math.floor(Math.random() * responses.length)];
                        //respond(message.sender.id, botresponse.text, botresponse.imageUrl);
                        checkMessage(message.sender.id, message.message);
                    }
                }
            }
        }
    }
};

function checkMessage(senderId,message) {
    var number = parseInt(message.text);
    var command;
    if (message.quick_reply && message.quick_reply.payload) {
        var dataArray = message.quick_reply.payload.split("_");
        if (dataArray.length == 2) {
            command = dataArray[0];
            number = dataArray[1];
        }
    }
    //} else if (message.text == config.okay) {
    if (command && command == config.summit) {
        //read and buy
        async.parallel({
            user: getUserByFBSenderId.bind(null, senderId),
            round: getRounds.bind(null)
        }, function done(err, results) {
            if (err) {
                console.error(err);
                respond(senderId, config.error);
            }
            else {
                var reserveNumber = parseInt(number);
                if (Number.isInteger(reserveNumber)) {
                    //if (Number.isInteger(results.user.chatBotReserveNumber)) {
                    getTickets(results.user.id, results.round.ownerId, function (err, tickets) {
                        if (err) {
                            console.error("getTickets senderId : " + senderId + " , " + err);
                            respond(senderId, config.error);
                        } else {
                            var sumAmount = 0;
                            tickets.Items.forEach(function (item) {
                                sumAmount += item.amount;
                            });
                            //var payValue = results.round.price * event.amount;
                            var payValue = results.round.price;
                            var timeNow = Date.now();
                            if (timeNow < results.round.startTime || timeNow > results.round.endTime) {
                                console.error("Invalid date.");
                                respond(senderId, config.error);
                            } else if (results.user.satang < payValue) {
                                respond(senderId, config.buyNotEnoughSatang);
                                //} else if (sumAmount + event.amount > results.round.limit) {
                            } else if (sumAmount + 1 > results.round.amountLimit) {
                                respond(senderId, config.buyOverLimit + results.round.amountLimit + config.roundClassifier);
                            } else {
                                //buyTicket(results.user.id, payValue, results.round.ownerId, results.user.chatBotReserveNumber, 1, function (err, ticket) {
                                buyTicket(results.user.id, payValue, results.round.ownerId, reserveNumber, 1, function (err, ticket) {
                                    if (err) {
                                        console.log("buyTicket error senderId : " + senderId + " , " + JSON.stringify(err));
                                        respond(senderId, config.error);
                                    } else {
                                        console.log("buySuccess.");
                                        respond(senderId, config.buySuccess + (results.user.satang - payValue) + config.satang);
                                    }
                                });
                            }
                        }
                    });
                } else {
                    respond(senderId, config.sendNumberAgain);
                }
            }
            });
    } else if (command && command == config.random) {
            respondChoose(senderId, number);
    } else if (!isNaN(number)) {
            //add number to user
            //console.log("!isNaN(number) : " + number);
            respondChoose(senderId, number);
        //async.parallel({
        //    user: getUserByFBSenderId.bind(null, senderId),
        //    round: getRounds.bind(null)
        //}, function done(err, results) {
        //    if (err) {
        //        console.error(err);
        //        respond(senderId, config.error);
        //    }
        //    else {
        //        var reserveNumber = randomNumber(number);
        //        addUserNumber(results.user.id, reserveNumber, number, function (err, data) {
        //            if (err) {
        //                console.error(err);
        //                respond(senderId, config.error);
        //            } else {
        //                respond(senderId, reserveNumber + " " + results.round.title + config.confirm);
        //            }
        //        });
        //    }
        //});
    } else if (message == config.randomAgain) {
        //read and update userInfo
        console.log("message === CONFIG.randomAgain : " + message);
        respond(senderId, "Hello : " + config.randomAgain);
    } else {
        //console.log("else : " + message.charCodeAt(0) + " : " + config.okay.charCodeAt(0));
        respond(senderId, config.goodluck);
        //Skip
    }
}

function respondChoose(recipientId, number) {
    getRounds(function (err, round) {
        var reserveNumber = randomNumber(number);
        console.log(reserveNumber);
        var messageData = {};
        messageData.recipient = { id: recipientId };
        messageData.message = {
            text: reserveNumber + " " + round.title,
            quick_replies: [
                {
                    content_type: "text",
                    title: config.okay,
                    payload: config.summit + "_" + reserveNumber
                },
                {
                    content_type: "text",
                    title: config.randomAgain,
                    payload: config.random + "_" + number
                }
            ]
            //attachment: {
            //    type: "template",
            //    payload: {
            //        template_type: "button",
            //        text: "What do you want to do next?",
            //        buttons: [{
            //            "type": "postback",
            //            "title": number,
            //            "payload": "USER_DEFINED_PAYLOAD"
            //        }, {
            //            "type": "postback",
            //            "title": "Start Chatting",
            //            "payload": "USER_DEFINED_PAYLOAD"
            //        }]
            //    }
            //}
        }
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: PAGE_ACCESS_TOKEN,
                appsecret_proof: APPSECRET_PROOF
            },
            method: 'POST',
            json: messageData

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
            } else {
                console.error(response.error);
                console.log("Facebook Request failed    : " + JSON.stringify(response));
                console.log("Message Data that was sent : " + JSON.stringify(messageData));
            }
        });

    });
}
var respond = function respond(recipientId, textMessage, imageUrl) {
    var messageData = {};
    messageData.recipient = { id: recipientId };
    if (imageUrl && textMessage !== null) {
        //Use generic template to send a text and image
        messageData.message = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: textMessage,
                        image_url: imageUrl,
                        subtitle: textMessage
                    }]
                }
            }
        };
    }
    else {
        if (imageUrl) {
            //Send a picture

            messageData.message = {
                attachment: {
                    type: "image",
                    payload: {
                        url: imageUrl
                    }
                }
            };
        }
        else {
            //send a text message
            messageData.message = {
                text: textMessage
            };
        }
    }
    //console.log("messageData : " + JSON.stringify(messageData));
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: PAGE_ACCESS_TOKEN,
            appsecret_proof: APPSECRET_PROOF
        },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //var recipientId = body.recipient_id;
            //var messageId = body.message_id;

            //if (messageId) {
            //    console.log("Message %s delivered to recipient %s",
            //        messageId, recipientId);
            //} else {
            //    console.log("Message sent to recipient %s",
            //        recipientId);
            //}
        } else {
            console.error(response.error);
            console.log("Facebook Request failed    : " + JSON.stringify(response));
            console.log("Message Data that was sent : " + JSON.stringify(messageData));
        }
    });
}
function randomNumber(chooseNumber) {
    var number = chooseNumber.toString();
    var digit = 6;
    if (number.length < digit) {
        var rand = "";
        for (var i = 0; i < digit - number.length; i++){
            rand += Math.floor(Math.random() * 10);
        }
        return rand + number;
    } else if (number.length > digit) {
        return number.substring(number.length - digit, number.length);
    } else {
        return number;
    }
}
function getUserByFBSenderId(senderId, callback) {
    //https://graph.facebook.com/v2.6/<USER_ID>?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=<PAGE_ACCESS_TOKEN>
    request({
        uri: 'https://graph.facebook.com/v2.6/' + senderId,
        qs: {
            access_token: PAGE_ACCESS_TOKEN,
            appsecret_proof: APPSECRET_PROOF,
            fields: 'profile_pic'
        },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var bodyObj = JSON.parse(body);
            var picPath = url.parse(bodyObj.profile_pic).pathname;
            var fbProfilePicture = path.basename(picPath);
            //var profile_pic = URL.pathname.replace(/(^\/|\/$)/g, ''); // "someFile.txt"
            //console.log(fbProfilePicture);
            var params = {
                TableName: process.env.UsersTableName,
                IndexName: "fbProfilePicture-index",
                ProjectionExpression: "id, satang",
                KeyConditionExpression: "fbProfilePicture = :fb",
                ExpressionAttributeValues: {
                    ":fb": fbProfilePicture
                }
            };
            dynamo.query(params, function (err, data) {
                if (err) {
                    callback("Error getTickets : " + JSON.stringify(err, null, 2));
                } else {
                    if (data.Items.length == 1) {
                        callback(null, data.Items[0]);
                    } else if (data.Items.length == 0) {
                        callback("No ProfilePicture. id : " + senderId + " ,picture : " + fbProfilePicture);
                    } else {
                        callback("ProfilePicture have more then 1. id : " + senderId + " ,picture : " + fbProfilePicture);
                    }
                }
            });
            //getUserByProfilePicture(fbProfilePicture, function (err, data) {
            //    console.log("getUserByProfilePicture : " + JSON.stringify(data));
            //    if (data.Items.length == 1) {
            //        console.log(senderId, data.Items[0].satang + " : " + fbProfilePicture);
            //        //respond(senderId, data.Items[0].satang + " : " + fbProfilePicture);
            //        //Get GetTickets and round.

            //    } else if (data.Items.length == 0) {
            //        console.error("No ProfilePicture. id : " + senderId + " ,picture : " + fbProfilePicture);
            //        respond(senderId, config.error);
            //    } else {
            //        console.error("ProfilePicture have more then 1. id : " + senderId + " ,picture : " + fbProfilePicture);
            //        respond(senderId, config.error);
            //    }
            //});
        }
        else {
            callback("FB profile photo request error : ", JSON.stringify(response));
        }
    });
}
function getRounds(callback) {
    if (Round) {
        var timeNow = Date.now();
        if (Round.startTime < timeNow && Round.endTime > timeNow) {
            callback(null, Round);
            return;
        }
    }
    var params = {
        "ReturnConsumedCapacity": "TOTAL"
    };
    params["RequestItems"] = {};
    params.RequestItems[process.env.RoundsTableName] = {
        "Keys": [
            {"id": "RoundANow"},
            {"id": "RoundANext"}
        ],
        "ProjectionExpression": "ownerId,title, startTime, endTime, price, amountLimit"
    };
    console.log("params : " + JSON.stringify(params, null, 2));
    dynamo.batchGetItem(params, function (err, data) {
        if (err) {
            callback("Error getRounds : " + JSON.stringify(err, null, 2));
        } else {
            console.log(JSON.stringify(data, null, 2));
            if (data.Responses.Rounds.length > 0) {
                var timeNow = Date.now();
                for (var i = 0; i < data.Responses.Rounds.length; i++) {
                    if (data.Responses.Rounds[i].startTime < timeNow && data.Responses.Rounds[i].endTime > timeNow) {
                        Round = data.Responses.Rounds[i];
                        callback(null, data.Responses.Rounds[i]);
                        return;
                    }
                }
                callback("All round expire.");
            } else {
                callback("Can not get round.");
            }
        }
    });
}
function getTickets(userId, roundId, callback) {
    var params = {
        TableName: process.env.TicketsTableName,
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
            callback(null, results.ticket);
        }
    });
}
function updateInfo(userId, payValue, callback) {
    var params = {
        TableName: process.env.UsersTableName,
        Key: { "id": userId },
        UpdateExpression: "set satang = satang - :v",
        ExpressionAttributeValues: {
            ":v": payValue
        }
    };
    dynamo.updateItem(params, function (err, data) {
        if (err) {
            callback("Error updateInfo : " + JSON.stringify(err, null, 2));
        } else {
            callback(null, data);
        }
    });
}
//function addUserNumber(userId, chooseNumber, ReserveNumber, callback) {
//    var params = {
//        TableName: process.env.UsersTableName,
//        Key: { "id": userId },
//        UpdateExpression: "set chatBotReserveNumber = :cv, chatBotchooseNumber = :rn",
//        ExpressionAttributeValues: {
//            ":cv": chooseNumber,
//            ":rn": ReserveNumber,
//        }
//    };
//    dynamo.updateItem(params, function (err, data) {
//        if (err) {
//            callback("Error updateInfo : " + JSON.stringify(err, null, 2));
//        } else {
//            callback(null, data);
//        }
//    });
//}
function addTicket(userId, roundId, reserveNumber, amount, callback) {
    var ticket = {
        "ownerId": userId,
        "createdOn": Date.now(),
        "roundId": roundId,
        "reserveNumber": reserveNumber,
        "amount": amount
        //"announced": false
    };
    console.log(JSON.stringify(ticket, null, 2));
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