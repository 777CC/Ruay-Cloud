var doc = require('dynamodb-doc');
var dynamo = new doc.DynamoDB();
var config = require('./config.js');
var RateLimiter = require('limiter').RateLimiter;
var async = require("async");
var tasks = require('./tasks.js');
exports.handler = function (event, context) {
	tasks.init(config);
	
	var result_failed = [];
	var result_updated = [];
	var result_passed = [];
	
	roundId = event.roundId;
	WinTicketCount = 0;
	WinSatangCount = 0;

	usersTableName = config.tables[0].tableName;
	ticketsTableName = config.tables[1].tableName;
	console.log(usersTableName);
	console.log(ticketsTableName);
	async.waterfall([
		function (callback) {
			//Get dynamodb info.
			async.parallel({
				usersDynamodb : tasks.getTask_tableDesc.bind(null, usersTableName),
				ticketsDynamodb : tasks.getTask_tableDesc.bind(null, ticketsTableName)
			},
		    //callback_outer - EACH
			function (err, result) {
				console.log("err : " + JSON.stringify(err, null, 2));
				console.log("DynamodbReadInfo : " + JSON.stringify(result, null, 2));
				callback(null,result)
			});
		},
		function (readtableInfo,callback) {
			//Round scan.
			//users = readtableInfo.usersDynamodb;
			//tickets = readtableInfo.ticketsDynamodb;
			usersRead = readtableInfo.usersDynamodb.readCapa;
			usersNewRead = usersRead + config.tables[0].increase_reads_with;
			usersWrite = readtableInfo.usersDynamodb.writeCapa;
			usersNewWrite = usersWrite + config.tables[0].increase_writes_with;
			ticketsRead = readtableInfo.ticketsDynamodb.readCapa;
			ticketsNewRead = ticketsRead + config.tables[1].increase_reads_with;
			ticketsWrite = readtableInfo.ticketsDynamodb.writeCapa;
			ticketsNewWrite = ticketsWrite + config.tables[1].increase_writes_with;
			if (usersRead != usersNewRead &&
				usersWrite != usersNewWrite &&
				ticketsRead != ticketsNewRead && 
				ticketsWrite != ticketsNewWrite) {
				async.parallel({
					usersUpdate : tasks.setTask_updateTable.bind(null, usersTableName, usersRead, 1, usersNewRead, usersWrite, 1, usersNewWrite),
					ticketsUpdate : tasks.setTask_updateTable.bind(null, ticketsTableName, ticketsRead, 1, ticketsNewRead, ticketsWrite, 1, ticketsNewWrite),
				},
		    //callback_outer - EACH
			function (err, result) {
					console.log("err : " + JSON.stringify(err, null, 2));
					console.log("DynamodbUpdate : " + JSON.stringify(result, null, 2));
					setTimeout(callback.bind(null, null, usersNewRead, usersNewWrite, ticketsNewRead, ticketsNewWrite), 7000);
				//callback(null,result);
				});
			} else {
				callback(null, usersNewRead, usersNewWrite, ticketsNewRead, ticketsNewWrite);
			}
		},
		function (usersNewRead, usersNewWrite, ticketsNewRead, ticketsNewWrite, callback) {
			//Get dynamodb info.
			async.parallel({
				usersDynamodb : tasks.getTask_tableDesc.bind(null,usersTableName),
				ticketsDynamodb : tasks.getTask_tableDesc.bind(null, ticketsTableName)
			},
		    //callback_outer - EACH
			function (err, result) {
				console.log("err : " + JSON.stringify(err, null, 2));
				console.log("DynamodbReadInfo :" + JSON.stringify(result, null, 2));

				if (result.usersDynamodb.readCapa == usersNewRead&&
					result.usersDynamodb.writeCapa == usersNewWrite &&
					result.ticketsDynamodb.readCapa == ticketsNewRead &&
					result.ticketsDynamodb.writeCapa == ticketsNewWrite) {
					callback(null, result);
				} else if(err) {
					callback(err,result);
				} else {
					callback("Table not update yet.!!",result);
				}
			});
		},
		function (readtableInfo, callback) {
			var limiter = new RateLimiter(1, 'second', true);
			scanTickets(config.ExclusiveStartKey, limiter, callback);
		},
	],
		function (err,result) {
		console.log("result : " + JSON.stringify(result, null, 2));
		context.succeed();
	});
};

function scanTickets(ExclusiveStartKey, limiter, callback) {
	var params = {
		TableName: process.env.TicketsTableName,
		ProjectionExpression: "ownerId, createdOn,reserveNumber, roundId, amount",
		FilterExpression: "roundId = :roundId and attribute_not_exists(announced)",
		//FilterExpression: "roundId = :roundId",
		ExpressionAttributeValues: {
			":roundId": config.roundId
		},
		Limit: config.ticketscanLimit,
		ReturnConsumedCapacity: "TOTAL"
	};
	//For set ExclusiveStartKey in config file.
	//if (ExclusiveStartKey && ExclusiveStartKey.length > 0) {
	if (ExclusiveStartKey != undefined) {
		params.ExclusiveStartKey = ExclusiveStartKey;
	}
	if (limiter.tryRemoveTokens(1)) {
		console.log("scanTickets : " + JSON.stringify(params, null, 2));
		dynamo.scan(params, function (err, data) {
			if (err) {
				console.error("Unable to scan item. Error JSON:", JSON.stringify(err, null, 2));
				callback("Unable to scan item.");
			} else {
				if (typeof data.LastEvaluatedKey != "undefined") {
					updateTickets(data.Items, callback, function (cb) {
						scanTickets(data.LastEvaluatedKey, limiter, cb);
					});
					
					//ticket = data.Items[0];
					//var reward = getReward(ticket.reserveNumber);
					//var updateParams = {
					//	TableName: process.env.TicketsTableName,
					//	Key: {
					//		"ownerId" : ticket.ownerId,
					//		"createdOn" : ticket.createdOn
					//	},
					//	UpdateExpression: "set announced = :ann",
					//	ExpressionAttributeValues: {
					//		":ann": reward
					//	},
					//	ReturnValues: 'ALL_NEW'
					//};
					//console.log("updateParams : " + JSON.stringify(updateParams, null, 2));
					//dynamo.updateItem(updateParams, function (err, data) {
					//	if (err) {
					//		//queue.kill();
					//		console.log("err : " + JSON.stringify(err, null, 2));
					//		//callback(err);
					//	}
					//	console.log("data : " + JSON.stringify(data, null, 2));
					//	//cb();
					//	callback();
					//});
				} else {
					updateTickets(data.Items, function () {
						callback(null, 'finish');
					}, function (err) {
						callback(err);
					});
				}
			}
		});
	}
	else {
		console.log("setTimeout");
		setTimeout(scanTickets.bind(null, ExclusiveStartKey, limiter, callback), 300);
	}
}

function updateTickets(tickets, callback, onComplete) {
	var limiter = new RateLimiter(config.ticketsUpdateLimit, 'second', true);
	var queue = async.queue(function (ticket, cb) {
		console.log('queue : drain');
		//CheckLimit(ticket, queue, limiter, callback, cb);
		var reward = getReward(ticket.reserveNumber);
		var params = {
			TableName: process.env.TicketsTableName,
			Key: {
				"ownerId" : ticket.ownerId,
				"createdOn" : ticket.createdOn
			},
			UpdateExpression: "set announced = :ann",
			ExpressionAttributeValues: {
				":ann": reward
			},
			ReturnValues: 'ALL_NEW'
		};
		dynamo.updateItem(params, function (err, data) {
			if (err) {
				queue.kill();
				callback(err);
			}
			console.log(JSON.stringify(data, null, 2));
			cb();
		});
		console.log('tryRemoveTokens : 1');
	}, config.ticketsUpdateLimit);
	if (tickets.length > 0) {
		console.log('tickets.length > 0');
		queue.drain = function () {
			console.log('onComplete : drain');
			onComplete(callback);
		};
		for (var i = 0; i < tickets.length; i++) {
			queue.push(tickets[i]);
		}
	}
	else {
		console.log('onComplete : kill');
		queue.kill();
		onComplete(callback);
	}
}

function CheckLimit(ticket, queue, limiter, onError, callback) {
	var reward = getReward(ticket.reserveNumber);
	var params = {
		TableName: process.env.UsersTableName,
		Key: {
			"ownerId" : ticket.ownerId,
			"createdOn" : ticket.createdOn
		},
		UpdateExpression: "set announced = :ann",
		ExpressionAttributeValues: {
			":ann": reward
		},
		ReturnValues:'ALL_NEW'
	};
	if (limiter.tryRemoveTokens(1)) {
		//dynamo.updateItem(params, function (err, data) {
		//	if (err) {
		//		queue.kill();
		//		onError(err);
		//	}
		//	console.log(JSON.stringify(data, null, 2));
		//	callback();
		//});
		console.log('tryRemoveTokens : 1');
	} else {
		console.log('setTimeout : kill');
		setTimeout(CheckLimit.bind(null, ticket, queue, limiter, callback, onError), 300);
	}
}

function getReward(reserveNumber) { 
	return 'test';
}

function getTickets(userId, roundId, callback) {
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