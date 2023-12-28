const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		/**
		 * Content - the content of the message
		 * Author - the user who sent the message (a User object)
		 * ChannelId - the id of the channel in which the message was sent
		 * GuildId - the id of the guild in which the message was sent
		 */
		const { content, author, channelId, guildId } = message;
		
		
	},
};