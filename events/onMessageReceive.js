const { Events } = require('discord.js');
const { checkAnswer } = require('../game/gameLogic.js');
const { 
	doesMessageComeFromRegisteredChannel,
	addUserCorrectAnswer,
	addUserIncorrectAnswer,
} = require('../util.js');


module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// if the message is a command or from a bot, ignore it
		if (message.author.bot || message.content.startsWith('!') || message.content.startsWith("/")) return;
		/**
		 * Content - the content of the message
		 * Author - the user who sent the message (a User object)
		 * ChannelId - the id of the channel in which the message was sent
		 * GuildId - the id of the guild in which the message was sent
		 */
		const { content, author, channelId, guildId } = message;
		// if the message was not sent in a registered channel, ignore it
		if (!doesMessageComeFromRegisteredChannel(channelId, guildId)) return;
		// strip punctuation and make lowercase
		const strippedContent = content.replace(/[^\w\s]|_/g, "").toLowerCase();
		const resultObject = await checkAnswer(strippedContent, author, channelId);
		const wasValid = resultObject.wasValid;
		const responseMessage = resultObject.message;
		// this is a cheaty way but it's quick
		if (responseMessage == "skip")
		{
			return;
		}
		
		if (wasValid) {
			await addUserCorrectAnswer(author.id);
			await message.react('✅');
		} else {
			await addUserIncorrectAnswer(author.id);
			await message.react('❌');
		}

		if (responseMessage) {
			await message.channel.send(`<@${author.id}> ${responseMessage}`);
		}

	},
};

/**
 * We need the game to store for each channel the following info about the album chain game:
 * - The character that needs to be entered
 * - The number of times the character has been entered so far
 * - The amount of times the character must be entered in total before
 * the next string is needed
 * - Who entered the character last (for stats etc)
 * - The score (+1 for each correct answer)
 */
