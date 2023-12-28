const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('db/gameStorage.db');

// Create the SERVER table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS SERVER (
        serverId INTEGER PRIMARY KEY,
        name TEXT NOT NULL
    );
`);

// Create the CHANNEL table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS CHANNEL (
        channelId INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
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
        channelId INTEGER,
        FOREIGN KEY (channelId) REFERENCES CHANNEL(channelId)
    );
`);
        

// Close the database connection
db.close();

