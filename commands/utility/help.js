const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with the bot'),
    async execute(interaction) {
        await interaction.reply(`
        Setup: use /setchannel <channel> to set the channel to play in. Make sure the bot has permissions to send messages in the channel.
            Play album chain as you would in circle. Rules are:
            1. No mothering - don't explain the rules of album chain.
            2. No talking in album chain - any messages sent are considered answers.
            3. Don't give weird album answers like "taylor's version" or "deluxe",
               I have tried to include as many song variants but not album variants,
               so try to be straightforward.
            4. Answers are strictly checked, they should match the song name exactly
               (but case and punctuation don't matter).
        `);
    },
};
