const sqlite3 = require('sqlite3').verbose();


// Connect to the database
const db = new sqlite3.Database('db/gameStorage.db');

// Create the CHANNEL table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS CHANNEL (
        channelId TEXT PRIMARY KEY,
        guildId TEXT NOT NULL,
        score INTEGER NOT NULL,
        highScore INTEGER NOT NULL,
        currentStage INTEGER NOT NULL,
        currentSubsection INTEGER NOT NULL,
        subsectionEntriesSoFar INTEGER NOT NULL,
        lastPlayerId INTEGER
    );
`);

// Create the SONG table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS SONG (
        songName TEXT PRIMARY KEY,
        channelId TEXT,
        FOREIGN KEY (channelId) REFERENCES CHANNEL(channelId)
    );
`);

// create a users table to record how many times a user has
// entered info or failed
db.run(`
    CREATE TABLE IF NOT EXISTS USER (
        userId TEXT PRIMARY KEY,
        correctAnswers INTEGER NOT NULL,
        timesFailed INTEGER NOT NULL
    );
`);

// Close the database connection
db.close();

