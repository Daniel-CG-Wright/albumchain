const { SlashCommandBuilder } = require('discord.js');
const { getServerStats } = require('../../util.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides stats for this server.'),
	async execute(interaction) {
		// get the highscore and the listening channel, and the last player to message.
		const { channelId, highScore } = await getServerStats(interaction.guildId);
		if (!channelId) {
			await interaction.reply("No channel has been set for this server yet.");
			return;
		}
		const channel = interaction.guild.channels.cache.get(channelId);
		await interaction.reply(`High score: ${highScore}\nListening channel: ${channel}`);

	},
};