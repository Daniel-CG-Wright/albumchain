/**
 * This file stores the functions for the game logic for the bot.
 * Stage - the album number (1 for debut, 2 for fearless, etc). Note it is not 0 indexed.
 * Substage - idenitifies which input must be given - 0 for stage, 1 for album name, 2 for a song name
 */

const sqlite3 = require('sqlite3').verbose();
const data = require('./data.json');

/**
 * This function checks if the given answer is valid for the given channel. It also
 * updates the database with the new information if the answer is valid.
 * @param {string} answer - the answer to check (stripped of punctuation and lowercase)
 * @param {User} user - the user who gave the answer
 * @param {string} channelId - the id of the channel in which the answer was given
 * @returns {object} - an object with the following properties:
 * - wasValid - whether the answer was valid
 * - message - the message to send to the user
 */
async function checkAnswer(answer, user, channelId) {
    // Connect to the database
    const db = new sqlite3.Database('db/gameStorage.db');

    /* get the current stage, subsection, subsectionEntriesSoFar, and lastPlayerId from the database */
    let currentStage, currentSubsection, subsectionEntriesSoFar, lastPlayerId;
    db.get(`
        SELECT currentStage, currentSubsection, subsectionEntriesSoFar, lastPlayerId
        FROM CHANNEL
        WHERE channelId = ?
    `, [channelId], (err, row) => {
        if (err) {
            console.error(err.message);
        } else {
            currentStage = row.currentStage;
            currentSubsection = row.currentSubsection;
            subsectionEntriesSoFar = row.subsectionEntriesSoFar;
            lastPlayerId = row.lastPlayerId;
        }
    });

    // check if the same user is trying to answer twice in a row
    if (lastPlayerId === user.id) {
        return {
            wasValid: false,
            message: "You can't answer twice in a row!"
        };
    }

    // check if the subsection criteria has been met
    const resultObject = await checkAnswerStageAndSubsection(answer, currentStage, currentSubsection, db);

    // if the answer was valid, update the game, otherwise else reset the game
    if (resultObject.wasValid) {
        await updateGame(channelId, currentStage, currentSubsection, subsectionEntriesSoFar, answer, user.id, db);
    } else {
        await resetGame(channelId, db);
    }

    // Close the database connection
    db.close();
    return resultObject;
}

/**
 * This function checks the given answer against the current stage and subsection
 * @param {string} answer - the answer to check (stripped of punctuation and lowercase)
 * @param {number} currentStage - the current stage
 * @param {string} currentSubsection - the current subsection
 * @param {object} db - the database object
 * @returns {object} - an object with the following properties:
 * - wasValid - whether the answer was valid
 * - message - the message to send to the user
 */
async function checkAnswerStageAndSubsection(answer, currentStage, currentSubsection, db) {
    const resultObject = {
        wasValid: false,
        message: ""
    };
    
    const { currentAlbumName, allowedAlbumNames } = await getAlbumName(currentStage);
    switch (currentSubsection)
    {
        case 0:
            // check against the current stage
            resultObject.isValid = answer === currentStage;
            if (resultObject.isValid) {
                resultObject.message = ``;
            } else {
                resultObject.message = `Pay attention! Pay attention! You should've said ${currentStage}!`;
            }
            break;
        case 1:
            // check against the allowed album names
            if (allowedAlbumNames.includes(answer)) {
                resultObject.isValid = true;
                resultObject.message = ``;
            } else {
                resultObject.isValid = false;
                resultObject.message = `Pay attention! Pay attention! You should've said ${currentAlbumName}!`;
            }
            break;

        default:
            const returnedSongName = await validateSongName(answer, currentStage);
            // the returnend song name is the song name given by the user if a valid one was given, or blank if no song could be found
            // this must then be checked to make sure it isnt a duplicate
            if (returnedSongName === "") {
                resultObject.isValid = false;
                resultObject.message = `Pay attention! Pay attention! You should've given a song from ${currentAlbumName}!`;
            } else {
                // ensure the song name is not a duplicate
                const isDuplicate = await checkDuplicateSong(returnedSongName, db);
                if (isDuplicate) {
                    resultObject.isValid = false;
                    resultObject.message = `No duplicate songs! ${returnedSongName} has already been said!`;
                } else {
                    resultObject.isValid = true;
                    resultObject.message = ``;
                }
            }
            break;

    }

    return resultObject;
}

/**
 * This function gets the album name for the given stage using data.json
 * @param {number} stage - the stage to get the album name for
 * @returns {object} - an object with the following properties:
 * - currentAlbumName - the album name for the given stage
 * - allowedAlbumNames - the allowed album names for the given stage
 */
async function getAlbumName(stage) {
    console.log(data);
    console.log(stage);
    const currentAlbumName = data[stage - 1].name;
    const allowedAlbumNames = data[stage - 1].allowedNames;
    return {
        currentAlbumName,
        allowedAlbumNames
    };
}

/**
 * This function validates the given song name against the given stage
 * @param {string} songName - the song name to validate
 * @param {number} stage - the stage to validate the song name against
 * @returns {string} - the song name if it is valid, or blank if it is not
 */
async function validateSongName(songName, stage) {
    const songs = data[stage - 1].songs;
    // needs to check if the song name provided is in the allowedNames array for any of the songs
    // if it is, return the song.name property or blank if it is not
    let returnedSongName = "";
    songs.forEach(song => {
        if (song.allowedNames.includes(songName)) {
            returnedSongName = song.name;
        }
    });
    return returnedSongName;
}

/**
 * This function checks if the given song name is a duplicate
 * @param {string} songName - the song name to check
 * @param {object} db - the database object
 * @returns {boolean} - whether the song name is a duplicate
 */
async function checkDuplicateSong(songName, db) {
    let isDuplicate = false;
    db.get(`
        SELECT songName
        FROM SONG
        WHERE songName = ? AND channelId = ?
    `, [songName, channelId], (err, row) => {
        if (err) {
            console.error(err.message);
        } else {
            if (row.songName === songName) {
                isDuplicate = true;
            }
        }
    });
    return isDuplicate;
}

/**
 * This function resets the game for the given channel
 * @param {string} channelId - the id of the channel to reset
 * @param {object} db - the database object
 */
async function resetGame(channelId, db) {

    // reset the game
    db.run(`
        UPDATE CHANNEL
        SET score = 0,
            currentStage = 1,
            currentSubsection = 0,
            subsectionEntriesSoFar = 0,
            lastPlayerId = NULL
        WHERE channelId = ?
    `, [channelId], (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    // delete all songs for the given channel
    await clearSongs(channelId, db);
}

/**
 * This clears the songs for the given channel
 * @param {string} channelId - the id of the channel to clear the songs for
 * @param {object} db - the database object
 */
async function clearSongs(channelId, db) {
    db.run(`
        DELETE FROM SONG
        WHERE channelId = ?
    `, [channelId], (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

/**
 * This function updates the game for the given channel
 * @param {string} channelId - the id of the channel to update
 * @param currentStage - the current stage
 * @param currentSubsection - the current subsection
 * @param subsectionEntriesSoFar - the number of entries so far for the current subsection
 * @param enteredSongName - the song name entered by the user
 * @param lastPlayerId - the id of the last player to enter a song
 * @param {object} db - the database object
 */
async function updateGame(
    channelId,
    currentStage,
    currentSubsection,
    subsectionEntriesSoFar,
    enteredSongName,
    lastPlayerId,
    db) {
    // if the subsectionEntriesSoFar + 1 = the current stage, then set it to 0
    // and if current subsection + 1 = 3, then set it to 0 and increment the current stage and clear the songs,
    // otherwise increment the current subsection
    let newSubsectionEntriesSoFar, newCurrentSubsection, newCurrentStage;
    if (subsectionEntriesSoFar + 1 === currentStage) {
        // reset the subsection entries so far and increment the subsection
        newSubsectionEntriesSoFar = 0;
        if (currentSubsection + 1 === 3) {
            newCurrentSubsection = 0;
            newCurrentStage = currentStage + 1;
            await clearSongs(channelId, db);
        } else {
            newCurrentSubsection = currentSubsection + 1;
        }
    } else {
        newSubsectionEntriesSoFar = subsectionEntriesSoFar + 1;
        newCurrentSubsection = currentSubsection;
        // if the current subsection is 2 (songs), then add the song to the database
        if (currentSubsection === 2) {
            await addSong(channelId, enteredSongName, db);
        }
    }

    // update the game, incrementing the score and updating highScore if necessary
    db.run(`
        UPDATE CHANNEL
        SET score = score + 1,
            highScore = CASE WHEN score + 1 > highScore THEN score + 1 ELSE highScore END,
            currentStage = ?,
            currentSubsection = ?,
            subsectionEntriesSoFar = ?,
            lastPlayerId = ?
        WHERE channelId = ?
    `, [newCurrentStage, newCurrentSubsection, newSubsectionEntriesSoFar, lastPlayerId, channelId], (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

/**
 * This function adds the given song to the database
 * @param {string} channelId - the id of the channel to add the song to
 * @param {string} songName - the song name to add
 * @param {object} db - the database object
 */
async function addSong(channelId, songName, db) {
    db.run(`
        INSERT INTO SONG (songName, channelId)
        VALUES (?, ?)
    `, [songName, channelId], (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

module.exports = {
    checkAnswer
};