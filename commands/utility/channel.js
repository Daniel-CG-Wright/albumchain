const { SlashCommandBuilder } = require('discord.js');
const { registerChannelForGuild } = require('../../util.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set the channel for the bot to listen in (clears previous data)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to configure the bot to listen in')
                .setRequired(true)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        // Save the channel ID or any other necessary configuration
        // logic here to configure the bot to listen in the specified channel
        registerChannelForGuild(interaction.guildId, channel.id);
        await interaction.reply(`Bot will now listen in ${channel}. All previous data has been cleared.`);
    },
};
