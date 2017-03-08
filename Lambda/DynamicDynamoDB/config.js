module.exports = {
	region: 'ap-northeast-1',
	timeframeMin : 5, // evaluation timeframe (minute)
	tables :
 [
		{
			tableName : 'Users', // table name
			reads_upper_threshold : 90, // read incrase threshold (%)
			reads_lower_threshold : 30, // read decrase threshold (%)
			increase_reads_with : 90, // read incrase amount (%)
			decrease_reads_with : 30, // read decrase amount (%)
			base_reads : 5,          // minimum read Capacity
			writes_upper_threshold : 90, // write incrase amount (%)
			writes_lower_threshold : 40, // write decrase amount (%)
			increase_writes_with : 90, // write incrase amount (%)
			decrease_writes_with : 30, // write incrase amount (%)
			base_writes : 5          // minimum write Capacity
		},
		{
			tableName : 'Rounds', // table name
			reads_upper_threshold : 90, // read incrase threshold (%)
			reads_lower_threshold : 30, // read decrase threshold (%)
			increase_reads_with : 90, // read incrase amount (%)
			decrease_reads_with : 30, // read decrase amount (%)
			base_reads : 1,          // minimum read Capacity
			writes_upper_threshold : 90, // write incrase amount (%)
			writes_lower_threshold : 40, // write decrase amount (%)
			increase_writes_with : 90, // write incrase amount (%)
			decrease_writes_with : 30, // write incrase amount (%)
			base_writes : 1          // minimum write Capacity
		},
		{
			tableName : 'Tickets', // table name
			reads_upper_threshold : 90, // read incrase threshold (%)
			reads_lower_threshold : 30, // read decrase threshold (%)
			increase_reads_with : 90, // read incrase amount (%)
			decrease_reads_with : 30, // read decrase amount (%)
			base_reads : 1,          // minimum read Capacity
			writes_upper_threshold : 90, // write incrase amount (%)
			writes_lower_threshold : 40, // write decrase amount (%)
			increase_writes_with : 90, // write incrase amount (%)
			decrease_writes_with : 30, // write incrase amount (%)
			base_writes : 1          // minimum write Capacity
		},
		{
			tableName : 'Items', // table name
			reads_upper_threshold : 90, // read incrase threshold (%)
			reads_lower_threshold : 30, // read decrase threshold (%)
			increase_reads_with : 90, // read incrase amount (%)
			decrease_reads_with : 30, // read decrase amount (%)
			base_reads : 6,          // minimum read Capacity
			writes_upper_threshold : 90, // write incrase amount (%)
			writes_lower_threshold : 40, // write decrase amount (%)
			increase_writes_with : 90, // write incrase amount (%)
			decrease_writes_with : 30, // write incrase amount (%)
			base_writes : 3          // minimum write Capacity
		},
		{
			tableName : 'Rewards', // table name
			reads_upper_threshold : 90, // read incrase threshold (%)
			reads_lower_threshold : 30, // read decrase threshold (%)
			increase_reads_with : 90, // read incrase amount (%)
			decrease_reads_with : 30, // read decrase amount (%)
			base_reads : 1,          // minimum read Capacity
			writes_upper_threshold : 90, // write incrase amount (%)
			writes_lower_threshold : 40, // write decrase amount (%)
			increase_writes_with : 90, // write incrase amount (%)
			decrease_writes_with : 30, // write incrase amount (%)
			base_writes : 1          // minimum write Capacity
		},
		{
			tableName : 'InviteNames', // table name
			reads_upper_threshold : 90, // read incrase threshold (%)
			reads_lower_threshold : 30, // read decrase threshold (%)
			increase_reads_with : 90, // read incrase amount (%)
			decrease_reads_with : 30, // read decrase amount (%)
			base_reads : 1,          // minimum read Capacity
			writes_upper_threshold : 90, // write incrase amount (%)
			writes_lower_threshold : 40, // write decrase amount (%)
			increase_writes_with : 90, // write incrase amount (%)
			decrease_writes_with : 30, // write incrase amount (%)
			base_writes : 1          // minimum write Capacity
		}
	]
};