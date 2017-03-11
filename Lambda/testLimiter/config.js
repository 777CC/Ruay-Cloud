module.exports = {
	roundId:'A20170101',
	reward: [{ 'number': '999999', 'value': 'รางวัลที่ 1' }, { 'number': '999998', 'value': 'ใกล้เคียงที่ 1' }, { 'number': '999', 'value': '200' }, { 'number': '7', 'value': '7' }],
	region: 'ap-northeast-1',
	//ExclusiveStartKey:,//In case of Fail then run this again, Use ExclusiveStartKey from perviously execute.
	timeframeMin : 5, // evaluation timeframe (minute)
	ticketscanLimit: 30,//50 row per Read capacity units.
	ticketscanPerSecond: 2,//50 row per Read capacity units.
	ticketsUpdateLimit: 2,
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