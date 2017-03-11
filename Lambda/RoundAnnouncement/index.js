var doc = require('dynamodb-doc');
var dynamo = new doc.DynamoDB();
var config = require('./config.js');
var RateLimiter = require('limiter').RateLimiter;
var async = require("async");
var tasks = require('./tasks.js');

var ResultLastEvaluatedKey;
var SumRewardCount = 0;
var SumWonTicketCount = 0;
var Winner = [];
exports.handler = function (event, context) {
	tasks.init(config);
	ResultLastEvaluatedKey = null;
	SumRewardCount = 0;
	SumWonTicketCount = 0;
	Winner = [];
	usersTableName = config.tables[0].tableName;
	ticketsTableName = config.tables[1].tableName;
	async.waterfall([
		function (callback) {
			//Get dynamodb info.
			async.parallel({
				usersDynamodb : tasks.getTask_tableDesc.bind(null, usersTableName),
				ticketsDynamodb : tasks.getTask_tableDesc.bind(null, ticketsTableName)
			},
		    //callback_outer - EACH
			function (err, result) {
				if (err) console.log("err : " + JSON.stringify(err, null, 2));
				console.log("DynamodbReadInfo : " + JSON.stringify(result, null, 2));
				callback(err, result)
			});
		},
		function (readtableInfo, callback) {
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
					if (err) {
						console.log("err : " + JSON.stringify(err, null, 2));
						callback(err);
					} else {
						console.log("DynamodbUpdate : " + JSON.stringify(result, null, 2));
						setTimeout(callback.bind(null, null, usersNewRead, usersNewWrite, ticketsNewRead, ticketsNewWrite), 7000);
					}
				//callback(null,result);
				});
			} else {
				callback(null, usersNewRead, usersNewWrite, ticketsNewRead, ticketsNewWrite);
			}
		},
		function (usersNewRead, usersNewWrite, ticketsNewRead, ticketsNewWrite, callback) {
			//Get dynamodb info.
			async.parallel({
				usersDynamodb : tasks.getTask_tableDesc.bind(null, usersTableName),
				ticketsDynamodb : tasks.getTask_tableDesc.bind(null, ticketsTableName)
			},
		    //callback_outer - EACH
			function (err, result) {
				if (result.usersDynamodb.readCapa == usersNewRead &&
					result.usersDynamodb.writeCapa == usersNewWrite &&
					result.ticketsDynamodb.readCapa == ticketsNewRead &&
					result.ticketsDynamodb.writeCapa == ticketsNewWrite) {
					console.log("DynamodbReadInfo :" + JSON.stringify(result, null, 2));
					callback(null, result);
				} else if (err) {
					console.log("err : " + JSON.stringify(err, null, 2));
					callback(err, result);
				} else {
					callback("Table not update yet.!!", result);
				}
			});
		},
		function (readtableInfo, callback) {
			var limiter = new RateLimiter(config.ticketscanPerSecond, 'second', true);
			scanTickets(config.ExclusiveStartKey, limiter, callback);
		},
	],
		function (err, result) {
		//console.log("result : " + JSON.stringify(result, null, 2));
		if (err) {
			console.log("Error : " + JSON.stringify(err, null, 2));
		}
		console.log("Result [ LastEvaluatedKey : " + ResultLastEvaluatedKey,
			"SumRewardCount : " + SumRewardCount, 
			"SumWonTicketCount : " + SumWonTicketCount, 
			JSON.stringify(Winner, null, 2));
		context.succeed(JSON.stringify(result, null, 2));
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
		//console.log("scanTickets : " + JSON.stringify(params, null, 2));
		dynamo.scan(params, function (err, data) {
			if (err) {
				console.error("Unable to scan item. Error JSON:", JSON.stringify(err, null, 2));
				callback("Unable to scan item.");
			} else {
				//console.log(JSON.stringify(data, null, 2));
				if (typeof data.LastEvaluatedKey != "undefined") {
					ResultLastEvaluatedKey = data.LastEvaluatedKey;
					if (data.Items.length > 0) {
						updateTickets(data.Items, callback, function (cb) {
							scanTickets(data.LastEvaluatedKey, limiter, cb);
						});
					} else {
						scanTickets(data.LastEvaluatedKey, limiter, callback);
					}
				} else {
					//Complete scan tickets when check items for update.
					ResultLastEvaluatedKey = null;
					if (data.Items.length > 0) {
						updateTickets(data.Items,callback, function (cb) {
							cb(null, 'finish');
						});
					} else {
						callback(null, 'finish');
					}
				}
			}
		});
	}
	else {
		//console.log("setTimeout");
		setTimeout(scanTickets.bind(null, ExclusiveStartKey, limiter, callback), 300);
	}
}

function updateTickets(tickets, callback, onComplete) {
	var limiter = new RateLimiter(config.ticketsUpdateLimit, 'second', true);
	var queue = async.queue(function (ticket, cb) {
		//console.log("scanTickets : "+ queue.concurrency + JSON.stringify(tickets, null, 2));
		CheckLimit(ticket, queue, limiter, callback , cb);
	}, config.ticketsUpdateLimit);
	if (tickets.length > 0) {
		//console.log('tickets.length > 0' + tickets.length);
		queue.drain = function () {
			//console.log('updateTickets : onComplete');
			onComplete(callback);
		};
		for (var i = 0; i < tickets.length; i++) {
			queue.push(tickets[i]);
		}
	}
	else {
		//console.log('updateTickets end : 0 item');
		queue.kill();
		onComplete(callback);
	}
}

function CheckLimit(ticket, queue, limiter, callback, cb) {
	if (limiter.tryRemoveTokens(1)) {
		var reward = getReward(ticket.reserveNumber);
		//var reward;
		//getReward(reward, ticket.reserveNumber);
		var isNumber = Number.isInteger(reward);
		if (isNumber) {
			if (typeof (ticket.amount) != "undefined") {
				reward *= ticket.amount;
			} else { 
				console.error("Ticket not valid : " + JSON.stringify(ticket, null, 2));
			}
		}
		else {
			Winner.push(ticket);//Add winner.
		}
		var params = {
			TableName: process.env.TicketsTableName,
			Key: {
				"ownerId" : ticket.ownerId,
				"createdOn" : ticket.createdOn
			},
			UpdateExpression: "set announced = :ann",
			//UpdateExpression: "REMOVE announced",
			ExpressionAttributeValues: {
				":ann": reward
			},
			ReturnValues: 'ALL_NEW'
		};
		//console.log('reward : ' + reward + ", isNumber : " + isNumber + ", reserveNumber : " + ticket.reserveNumber)
		if (reward === 0 || !isNumber) {
			//console.log(JSON.stringify(params, null, 2));
			dynamo.updateItem(params, function (err, data) {
				if (err) {
					console.log(JSON.stringify(err, null, 2));
					queue.kill();
					callback(err);
				}
				//console.log(JSON.stringify(data, null, 2));
				cb();
			});
		} else {
			var userParams = {
				TableName: process.env.UsersTableName,
				Key: { "id" : ticket.ownerId },
				UpdateExpression : "SET satang = satang + :v",
				ExpressionAttributeValues : {
					":v": reward
				}
			};
			async.parallel({
				ticketItem: UpdateDynamoDB.bind(null, params),
				userItem: UpdateDynamoDB.bind(null, userParams)
			}, function done(err, results) {
				if (err) {
					console.log(JSON.stringify(err, null, 2));
					queue.kill();
					callback(err);
				}
				cb();
			});
		}
			//console.log('tryRemoveTokens : 1');
	} else {
		console.log('setTimeout : kill');
		setTimeout(CheckLimit.bind(null, ticket, queue, limiter, callback, cb), 300);
	}
}

function UpdateDynamoDB(params,callback) { 
	dynamo.updateItem(params, callback);
}

function FormatNumberLength(num, length) {
	var r = "" + num;
	//console.log("r.length : " + r.length + " length : " + length);
	if (r.length < length) {
		while (r.length < length) {
			r = "0" + r;
		}
	} else if (r.length > length) {
		r = r.substring(r.length - length, r.length);
	}
	//console.log("r : " + r + " r.length : " + r.length + " length : " + length);
	return r;
}

function getReward(reserveNumber) {
	//console.log(reserveNumber);
	reward = 0;
	if(typeof (reserveNumber) != "undefined") {
		for (var i = 0, len = config.reward.length; i < len; i++) {
			var number = FormatNumberLength(reserveNumber, config.reward[i].number.length);
			//console.log(number + " : " + config.reward[i].number);
			if (number === config.reward[i].number) {
				reward = config.reward[i].value;
				//console.log("reward "+ number+ " : "+ config.reward[i].number);
				break;
			}
		}
	}
	return reward;
}