var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 'second', true);  // fire CB immediately
var async = require("async");
var config = require('./config.js');
var i = 10;

testReward();
function testReward()
{
    //console.log(getReward(999999));
    //console.log(getReward("978933"));
    console.log(getReward("987777"));
    //console.log(getReward(000000));
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
    console.log("r : " + r +" r.length : " + r.length + " length : " + length);
    return r;
}

function getReward(reserveNumber) {
    //console.log(reserveNumber);
    reward = 0;
    if (typeof (reserveNumber) != "undefined") {
        for (var i = 0, len = config.reward.length; i < len; i++) {
            var number = FormatNumberLength(reserveNumber, config.reward[i].number.length);
            console.log("reward " + number + " : " + config.reward[i].number);
            if (number === config.reward[i].number) {
                reward = config.reward[i].value;
                //console.log("reward " + number + " : " + config.reward[i].number);
                break;
            }
        }
    }
    return reward;
}
//testQueue();
function testQueue() {
    //N = # of simultaneous tasks
    var q = async.queue(function (task, callback) {
        console.log(task);
        q.kill();
        setTimeout(callback, 1000);
        //somehttprequestfunction(task.url, function () {
        //    callback();
        //});
    }, 3);


    q.drain = function () {
        console.log('all items have been processed');
    }

    for (var i = 0; i < 2000; i++) {
        q.push("task : " + i);
    }
}
//testAsync();
function testAsync() {
    var obj = [{ name: "test1" }, { name: "test2" }, { name: "test3" }];
    var dynamodbResult = {};
    var dynamodbError = {};
    async.each(obj, function (item, callback_outer) {
        console.log(item.name);
        dynamodbResult[item.name] = item.name;
        //setTimeout(callback_outer.bind(null, item.name), 3000);
        callback_outer(item.name);
    },
    //callback_outer - EACH
    function (err, data) {
        console.log("err : " + JSON.stringify(err, null, 2));
        console.log("err : " + JSON.stringify(data, null, 2));
        console.log("data : " + JSON.stringify(dynamodbResult, null, 2));
    });
}
//test();
function test() {
    
    if (limiter.tryRemoveTokens(1)) {
        //limiter.removeTokens(1);
        i--;
        if (i > 0) {
            test();
            console.log("run : " + i);
        }
        else {
            console.log("Finish");
        }
    }
    else {
        setTimeout(test, 10);
        console.log("wait");
    }
}

