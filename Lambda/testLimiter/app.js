var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 'second', true);  // fire CB immediately
var async = require("async");
var i = 10;
testQueue();
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

