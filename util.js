const Database = require('better-sqlite3');

/**
 * This function registers the given channel in the database
 * @param {string} channelId - the id of the channel to register
 */
function registerChannel(channelId) {
    const db = new Database('db/gameStorage.db');

    // Check if the channel is already registered
    let row = db.prepare(`SELECT channelId FROM CHANNEL WHERE channelId = ?`).get(channelId);

    if (!row) {
        db.prepare(`INSERT INTO CHANNEL (channelId, score, highScore, currentStage, currentSubsection, subsectionEntriesSoFar, lastPlayerId) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(channelId, 0, 0, 1, 0, 0, null);
    }

    db.close();

}

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
 * @param {string} channelId - the id of the channel to register
 */
async function registerChannelForGuild(guildId, channelId) {
    const db = new Database('db/gameStorage.db');

    // Check if the channel is already registered
    let row = db.prepare(`SELECT channelId FROM CHANNEL WHERE channelId = ?`).get(channelId);

    if (!row) {
        // Clear any songs for the channel
        await clearSongs(channelId, db);
        // Clear any previous channel registered for the server
        db.prepare(`DELETE FROM CHANNEL WHERE guildId = ?`).run(guildId);
    }
    db.prepare(`INSERT INTO CHANNEL (channelId, guildId, score, highScore, currentStage, currentSubsection, subsectionEntriesSoFar, lastPlayerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(channelId, guildId, 0, 0, 1, 0, 0, null);

    db.close();

}

function doesMessageComeFromRegisteredChannel(channelId, guildId)
{
    const db = new Database('db/gameStorage.db');

    let row = db.prepare(`SELECT channelId FROM CHANNEL WHERE channelId = ? AND guildId = ?`).get(channelId, guildId);

    db.close();

    return row !== undefined;

}

module.exports = {
    clearSongs,
    registerChannelForGuild,
    doesMessageComeFromRegisteredChannel
};