const Database = require('better-sqlite3');
const stringSimilarity = require('string-similarity');

/**
 * This clears the songs for the given channel
 * @param {string} channelId - the id of the channel to clear the songs for
 * @param {object} db - the database object
 */
async function clearSongs(channelId, db) {
    db.prepare(`DELETE FROM SONG WHERE channelId = ?`).run(channelId);
}

/**
 * This function registers the channel for a given server and channel ID,
 * and deletes any previous channel registered for the server
 * @param {string} guildId - the id of the guild to register the channel for
 * @param {string} newChannelId - the id of the channel to register
 */
async function registerChannelForGuild(guildId, newChannelId) {
    const db = new Database('db/gameStorage.db');

    // Check if the channel is already registered
    let row = db.prepare(`SELECT channelId, highScore FROM CHANNEL WHERE guildId = ?`).get(guildId);
    let highScore = 0;
    if (row) {
        // save the high score for the channel
        highScore = row.highScore;
        const oldChannelId = row.channelId;
        // Clear any songs for the channel
        await clearSongs(oldChannelId, db);
        // Clear any previous channel registered for the server
        db.prepare(`DELETE FROM CHANNEL WHERE guildId = ?`).run(guildId);
    }
    db.prepare(`INSERT INTO CHANNEL (channelId, guildId, score, highScore, currentStage, currentSubsection, subsectionEntriesSoFar, lastPlayerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(newChannelId, guildId, 0, highScore, 1, 0, 0, null);

    db.close();

}

function doesMessageComeFromRegisteredChannel(channelId, guildId)
{
    const db = new Database('db/gameStorage.db');

    let row = db.prepare(`SELECT channelId FROM CHANNEL WHERE channelId = ? AND guildId = ?`).get(channelId, guildId);

    db.close();

    return row !== undefined;

}

/**
 * This function checks if 2 strings are similar enough to be considered the same
 * @param {string} string - the string to check
 * @param {string} stringToCheckAgainst - the string to check against
 * @param {number} similarityThreshold - the similarity threshold to use
 * @returns {boolean} - true if the strings are similar enough, false otherwise
*/
function areStringsSimilarEnough(string, stringToCheckAgainst, similarityThreshold) {
    const similarity = stringSimilarity.compareTwoStrings(string, stringToCheckAgainst);
    return similarity >= similarityThreshold;
}

/**
 * This function gets the server stats (high score, listening channel, last player to message)
 * @param {string} guildId - the id of the guild to get the stats for
 * @returns {object} - the stats object
 * (channelId, highScore, lastPlayerId)
 */
async function getServerStats(guildId) {
    const db = new Database('db/gameStorage.db');

    let row = db.prepare(`SELECT channelId, highScore FROM CHANNEL WHERE guildId = ?`).get(guildId);

    db.close();

    // if there is no row, return an empty object
    if (!row) {
        return {
            channelId: null,
            highScore: null
        };
    }

    return row;
}

/**
 * This function adds a correct answer for a user
 * @param {string} userId - the id of the user to add the correct answer for
 */
async function addUserCorrectAnswer(userId) {
    const db = new Database('db/gameStorage.db');

    let row = db.prepare(`SELECT correctAnswers FROM USER WHERE userId = ?`).get(userId);
    if (row) {
        db.prepare(`UPDATE USER SET correctAnswers = ? WHERE userId = ?`).run(row.correctAnswers + 1, userId);
    } else {
        db.prepare(`INSERT INTO USER (userId, correctAnswers, timesFailed) VALUES (?, ?, ?)`).run(userId, 1, 0);
    }

    db.close();
}

/**
 * This function adds an incorrect answer for a user
 * @param {string} userId - the id of the user to add the incorrect answer for
 */
async function addUserIncorrectAnswer(userId) {
    const db = new Database('db/gameStorage.db');

    let row = db.prepare(`SELECT timesFailed FROM USER WHERE userId = ?`).get(userId);
    if (row) {
        db.prepare(`UPDATE USER SET timesFailed = ? WHERE userId = ?`).run(row.timesFailed + 1, userId);
    } else {
        db.prepare(`INSERT INTO USER (userId, correctAnswers, timesFailed) VALUES (?, ?, ?)`).run(userId, 0, 1);
    }

    db.close();

}

/**
 * This function gets the stats for a user
 * @param {string} userId - the id of the user to get the stats for
 * @returns {object} - the stats object
 * (correctAnswers, timesFailed, percentageCorrect)
 */
async function getUserStats(userId) {
    const db = new Database('db/gameStorage.db');

    let row = db.prepare(`SELECT correctAnswers, timesFailed FROM USER WHERE userId = ?`).get(userId);

    // calculate the percentage correct
    let percentageCorrect = 0;
    if (row) {
        percentageCorrect = (row.correctAnswers / (row.correctAnswers + row.timesFailed)) * 100;
    }
    if (!percentageCorrect || isNaN(percentageCorrect)) {
        percentageCorrect = 100;
    }
    // round to string of 1 decimal place
    percentageCorrect = Math.round(percentageCorrect * 10) / 10;
    db.close();
    return {
        correctAnswers: row ? row.correctAnswers : 0,
        timesFailed: row ? row.timesFailed : 0,
        percentageCorrect: percentageCorrect
    };
}

module.exports = {
    clearSongs,
    registerChannelForGuild,
    doesMessageComeFromRegisteredChannel,
    areStringsSimilarEnough,
    getServerStats,
    addUserCorrectAnswer,
    addUserIncorrectAnswer,
    getUserStats
};