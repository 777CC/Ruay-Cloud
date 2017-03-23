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
const request = require('request');
const https = require('https');
var PAGE_ACCESS_TOKEN;
var MESSENGER_VALIDATION_TOKEN;
var APPSECRET_PROOF;
//var CONFIG = require("./config.json");
var config = require('./config.js');
var userOrder = [];


var RoundA1;
var RoundA2;
var responses = Array(
    {
        text: "Hi, I'm lambda-messenger-bot.  I give random responses",
        imageUrl: null
    },
    {
        text: "I was created by Dries Horions ( http://github.com/dhorions ).",
        imageUrl: "http://quodlibet.be/images/dries.png"
    },
    {
        text: "You can find my code on Medium ( http://mediumurl.",
        imageUrl: null
    },
    {
        text: "Do you like coffee?",
        imageUrl: "http://chainchoonoi.com/RoundA20170401.jpg"
    },
    {
        text: "I just want to tell you how I'm feeling",
        imageUrl: null
    },
    {
        text: "Gotta make you understand",
        imageUrl: null
    },
    {
        text: "Never gonna give you up, never gonna let you down",
        imageUrl: "http://chainchoonoi.com/RoundA20170401.jpg"
    }
);

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
                        checkMessage(message.sender.id, message.message.text);
                    }
                }
            }
        }
    }
};

function checkMessage(senderId,message) {
    var number = parseInt(message);
    console.log("json : " + config.okay + "\n" +  message + "\n" + JSON.stringify(config));
    if (!isNaN(number)) {
        //add number to user
        console.log("!isNaN(number) : " + number);
    } else if (message == config.okay) {
        //read and buy
        //var user = userOrder.find(
        //    function (data) {
        //        return data.id === senderId;
        //    }
        //);
        //if (user) {
        //    respond(senderId, CONFIG.replyOrderaAgain);
        //}
        console.log("message === CONFIG.okey : " + message);
        getData(process.env.UsersTableName, "facebookId", senderId, function (err, data) {
            respond(senderId, "Hello : " + JSON.stringify(data));
        });
    } else if (message == config.randomAgain) {
        //read and update userInfo
        console.log("message === CONFIG.randomAgain : " + message);
        respond(senderId, "Hello : " + config.randomAgain);
    } else {
        console.log("else : " + message.charCodeAt(0) + " : " + config.okay.charCodeAt(0));
        respond(senderId, "Hello : " + config.okay);
        //Skip
    }
}

var respond = function respond(recipientId, textMessage, imageUrl) {
    var messageData = {};
    messageData.recipient = { id: recipientId };

    if (imageUrl !== null && textMessage !== null) {
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
        if (imageUrl !== null) {
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
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Message %s delivered to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Message sent to recipient %s",
                    recipientId);
            }
        } else {
            console.error(response.error);
            console.log("Facebook Request failed    : " + JSON.stringify(response));
            console.log("Message Data that was sent : " + JSON.stringify(messageData));
        }
    });
}

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