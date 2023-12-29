const { SlashCommandBuilder } = require('discord.js');
const { getUserStats } = require('../../util.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-stats')
        .setDescription('Get your stats'),

    async execute(interaction) {
        const userId = interaction.user.id;
        // get the stats for the user
        const { correctAnswers, timesFailed, percentageCorrect } = await getUserStats(userId);
        await interaction.reply(`Correct answers: ${correctAnswers}\nTimes failed: ${timesFailed}\nPercentage correct: ${percentageCorrect}%`);


    },
};
