const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides stats for this server.'),
	async execute(interaction) {
		// interaction.guild is the object representing the Guild in which the command was run
		// TODO get the high score for the server and the last player to say something
		await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
	},
};