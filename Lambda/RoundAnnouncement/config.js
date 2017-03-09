module.exports = {
	roundId:'A20170101',
	reward: [{'000000':'รางวัลที่ 1'},{'000001':'ใกล้เคียงที่1'}, {'222':800}, { '22': 5 }],
	region: 'ap-northeast-1',
	//ExclusiveStartKey:,//In case of Fail then run this again, Use ExclusiveStartKey from perviously execute.
	timeframeMin : 5, // evaluation timeframe (minute)
	ticketscanLimit: 30,//50 row per Read capacity units.
	ticketsUpdateLimit: 1,
	userUpdateLimit: 1,
	tables :
 [
		{
			tableName : 'Users', // table name
			increase_reads_with : 0, // read incrase amount (unit)
			increase_writes_with : 0, // write incrase amount (unit)
		},
		{
			tableName : 'Tickets', // table name
			increase_reads_with : 0, // read incrase amount (unit)
			increase_writes_with : 0, // write incrase amount (unit)
		}
	]
};