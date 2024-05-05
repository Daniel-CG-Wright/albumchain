/**
 * This file stores the functions for the game logic for the bot.
 * Stage - the album number (1 for debut, 2 for fearless, etc). Note it is not 0 indexed.
 * Substage - idenitifies which input must be given - 0 for stage, 1 for album name, 2 for a song name
 */

const Database = require('better-sqlite3');
const data = require('./data.json');
const numbers = require('./numbers.json');
const { clearSongs, areStringsSimilarEnough } = require('../util.js');

// normally keep on, but for testing purposes can be turned off
const disallowSamePlayerTwiceInARow = true;
// use the string similarity library to allow minor mistakes
const similarityThreshold = 0.80; // 0.8 is natural, 1 is exact

const numberOfAlbums = data.length;

/**
 * This function checks if the given answer is valid for the given channel. It also
 * updates the database with the new information if the answer is valid.
 * Also registers the channel.
 * @param {string} answer - the answer to check (stripped of punctuation and lowercase)
 * @param {User} user - the user who gave the answer
 * @param {string} channelId - the id of the channel in which the answer was given
 * @returns {object} - an object with the following properties:
 * - wasValid - whether the answer was valid
 * - message - the message to send to the user
 */
async function checkAnswer(answer, user, channelId) {
    /**
     * We do so many things in this function because they are all
     * needed whenever an answer is given, so it makes sense to do them all
     * in one place.
     */
    const db = new Database('db/gameStorage.db');
    
    try {
        
        const row = db.prepare(`SELECT currentStage, currentSubsection, subsectionEntriesSoFar, lastPlayerId FROM CHANNEL WHERE channelId = ?`).get(channelId);
        let resultObject;
        let enteredSongName = answer;
        if (row.lastPlayerId == user.id && disallowSamePlayerTwiceInARow) {
            resultObject = {
                wasValid: false,
                message: `You can't go twice in a row!`
            };
        }
        else {
            const checkObject = await checkAnswerStageAndSubsection(answer, row.currentStage, row.currentSubsection, row.subsectionEntriesSoFar, channelId, db);
            resultObject = checkObject.resultObject;
            enteredSongName = checkObject.enteredSongName;
        }
        let doReverse = false;
        if (resultObject.wasValid) {
            doReverse = await updateGame(channelId, row.currentStage, row.currentSubsection, row.subsectionEntriesSoFar, enteredSongName, user.id, db);
        } else {
            await resetGame(channelId, db);
        }

        if (doReverse) {
            resultObject.message = `🎉 CONGRATULATIONS 🎉!!! You reached the end of the round! Now we reverse the direction, keep going! (11, TTPD, fortnight etc)\n${resultObject.message}`;
            data.reverse();
            numbers.reverse();
        }

        return resultObject;
    } finally {
        db.close();
    }
}

/**
 * This function checks the given answer against the current stage and subsection.
 * When the stage reaches 11, 21 etc we reverse the direction (so 10 midnights (midnight song), 9 9 evermore evermore (evermore song) (evermore song), etc)
 * @param {string} answer - the answer to check (stripped of punctuation and lowercase)
 * @param {number} currentStage - the current stage
 * @param {string} currentSubsection - the current subsection
 * @param {number} subsectionEntriesSoFar - the number of entries so far for the current subsection
 * @param {string} channelId - the id of the channel in which the answer was given
 * @param {object} db - the database object
 * @returns {object} - an object with the following properties:
 * - resultObject - an object with the following properties:
 *  - wasValid - whether the answer was valid
 * - message - the message to send to the user
 * 
 * - enteredSongName - the song name entered by the user
 * 
 * when stage is 11, we want logical stage of 1
 * when stage is 21 we want logical stage of 1 but not reversed
 */
async function checkAnswerStageAndSubsection(answer, currentStage, currentSubsection, subsectionEntriesSoFar, channelId, db) {
    const resultObject = {
        wasValid: false,
        message: ""
    };
    let enteredSongName = answer;
    let logicalStage = currentStage % numberOfAlbums;
    // if the logical stage is 0 then set it to 10
    logicalStage = logicalStage === 0 ? numberOfAlbums : logicalStage;
    // when combined with reversed albums, this should work

    const { currentAlbumName, allowedAlbumNames } = await getAlbumName(logicalStage);
    switch (currentSubsection)
    {
        case 0:
            // check against the allowed names for the current stage number
            const numberData = numbers[logicalStage - 1];
            // dont use string similarity for numbers
            if (numberData.allowedNames.includes(answer)) {
                resultObject.message = ``;
                resultObject.wasValid = true;
            } else {
                resultObject.wasValid = false;
                resultObject.message = `Pay attention! Pay attention! You should've said ${numberData.number}!`;
                // if the curretn stage is 1 then dont do anthing
                if (currentStage == 1)
                {
                    resultObject.message = "skip";
                }
            }
            break;
        case 1:
            // check against the allowed album names, using string similarity
            if (allowedAlbumNames.some(allowedAlbumName => areStringsSimilarEnough(answer, allowedAlbumName, similarityThreshold))) {
                resultObject.wasValid = true;
                resultObject.message = ``;
            } else {
                resultObject.wasValid = false;
                resultObject.message = `Pay attention! Pay attention! You should've said ${currentAlbumName}!`;
            }
            break;

        default:
            const returnedSongName = await validateSongName(answer, logicalStage);
            // the returnend song name is the song name given by the user if a valid one was given, or blank if no song could be found
            // this must then be checked to make sure it isnt a duplicate
            if (returnedSongName === "") {
                resultObject.wasValid = false;
                resultObject.message = `Pay attention! Pay attention! You should've given a song from ${currentAlbumName}!`;
            } else {
                // if the song name is the same as the album name, and currentSubsectionentriesSoFar = 0, then invalid
                if (returnedSongName === currentAlbumName && subsectionEntriesSoFar === 0) {
                    resultObject.wasValid = false;
                    resultObject.message = `NO! The title track is not allowed right after the album names!`;
                }
                else {
                    // ensure the song name is not a duplicate
                    const isDuplicate = await checkDuplicateSong(returnedSongName, channelId, db)
                    if (isDuplicate) {
                        resultObject.wasValid = false;
                        resultObject.message = `No duplicate songs! ${returnedSongName} has already been said!`;
                    } else {
                        resultObject.wasValid = true;
                        resultObject.message = ``;
                        enteredSongName = returnedSongName;
                    }
                }
            }
            break;

    }

    return {
        resultObject,
        enteredSongName
    };
    
}

/**
 * This function gets the album name for the given stage using data.json
 * @param {number} stage - the stage to get the album name for
 * @returns {object} - an object with the following properties:
 * - currentAlbumName - the album name for the given stage
 * - allowedAlbumNames - the allowed album names for the given stage
 */
async function getAlbumName(stage) {
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
        const allowedNames = song.allowedNames;
        // use string similarity to check if the song name is similar enough to the allowed name
        if (allowedNames.some(allowedName => areStringsSimilarEnough(songName, allowedName, similarityThreshold))) {
            returnedSongName = song.name;
        }
    });
    return returnedSongName;
}

/**
 * This function checks if the given song name is a duplicate
 * @param {string} songName - the song name to check
 * @param {string} channelId - the id of the channel to check for duplicates in
 * @param {object} db - the database object
 * @returns {boolean} - whether the song name is a duplicate
 */
async function checkDuplicateSong(songName, channelId, db) {
    const row = db.prepare(`SELECT songName FROM SONG WHERE songName = ? AND channelId = ?`).get(songName, channelId);
    return row !== undefined;
}

/**
 * This function resets the game for the given channel
 * @param {string} channelId - the id of the channel to reset
 * @param {object} db - the database object
 */
async function resetGame(channelId, db) {

    db.prepare(`UPDATE CHANNEL SET score = 0, currentStage = 1, currentSubsection = 0, subsectionEntriesSoFar = 0, lastPlayerId = NULL WHERE channelId = ?`).run(channelId);
    clearSongs(channelId, db);
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
 * @returns {boolean} - whether the game should be reversed
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
    let newSubsectionEntriesSoFar;
    let newCurrentSubsection = currentSubsection;
    let newCurrentStage = currentStage;
    let logicalStage = currentStage % numberOfAlbums;
    // if the logical stage is 0 then set it to 10
    logicalStage = logicalStage === 0 ? numberOfAlbums : logicalStage;
    if (subsectionEntriesSoFar + 1 === logicalStage) {
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
    // get whether highscore is lower than score + 1
    const highScoreLowerThanScorePlusOne = db.prepare(`SELECT highScore < score + 1 AS highScoreLowerThanScorePlusOne FROM CHANNEL WHERE channelId = ?`).get(channelId).highScoreLowerThanScorePlusOne;
    const updateStmt = db.prepare(`UPDATE CHANNEL SET score = score + 1, highScore = CASE WHEN score + 1 > highScore THEN score + 1 ELSE highScore END, currentStage = ?, currentSubsection = ?, subsectionEntriesSoFar = ?, lastPlayerId = ? WHERE channelId = ?`);
    updateStmt.run(newCurrentStage, newCurrentSubsection, newSubsectionEntriesSoFar, lastPlayerId, channelId);

    
    if (highScoreLowerThanScorePlusOne) {
        // update highest album and number of reverses (which is an integer)
        const numberOfReverses = (currentStage - 1) / numberOfAlbums;
        const highestAlbum = data[logicalStage - 1].name;
        db.prepare(`UPDATE CHANNEL SET highestAlbum = ?, roundsCompleted = ? WHERE channelId = ?`).run(highestAlbum, numberOfReverses, channelId);
    }
    // if the current stage is 11, 21, etc, then reverse the game - this is done by checking if the original stage was 10, 20, etc
    return (newCurrentStage % numberOfAlbums) === 1 && currentStage % numberOfAlbums === 0;
}

/**
 * This function adds the given song to the database
 * @param {string} channelId - the id of the channel to add the song to
 * @param {string} songName - the song name to add
 * @param {object} db - the database object
 */
async function addSong(channelId, songName, db) {
    db.prepare(`INSERT INTO SONG (songName, channelId) VALUES (?, ?)`).run(songName, channelId);
}

module.exports = {
    checkAnswer
};