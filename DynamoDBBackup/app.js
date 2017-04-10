var DynamoBackup = require('dynamo-backup-to-s3');
var backup = new DynamoBackup({
    excludedTables: ['Tickets'],
    readPercentage: .5,
    bucket: 'ruaybackup',
    stopOnFailure: true,
    base64Binary: true,
    awsAccessKey: 'AKIAJHJWL5P7BZMLNLZA',
    awsSecretKey: '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',
    awsRegion: 'ap-northeast-1'
});
backup.on('error', function (data) {
    console.log('Error backing up ' + data.table);
    console.log(data.err);
});
backup.on('start-backup', function (tableName, startTime) {
    console.log('Starting to copy table ' + tableName);
});
backup.on('end-backup', function (tableName, backupDuration) {
    console.log('Done copying table ' + tableName);
});
backup.backupAllTables(function () {
    console.log('Finished backing up DynamoDB');
});
//# sourceMappingURL=app.js.map