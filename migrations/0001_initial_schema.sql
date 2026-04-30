-- migrations/0001_initial_schema.sql

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    nickname TEXT,
    role TEXT DEFAULT 'student',
    points INTEGER DEFAULT 0,
    questionsUploaded INTEGER DEFAULT 0,
    kpsUploaded INTEGER DEFAULT 0,
    questionsAnswered INTEGER DEFAULT 0,
    tokensUsed INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    imageUrl TEXT,
    supplementaryImageUrl TEXT,
    explanationImageUrl TEXT,
    field TEXT, -- JSON array
    source TEXT,
    sourceDetail TEXT,
    difficulty TEXT, -- JSON array
    type TEXT,
    content TEXT,
    answer TEXT,
    explanation TEXT,
    createdBy TEXT,
    creatorStudentId TEXT,
    creatorNickname TEXT,
    createdAt TEXT,
    knowledgePoints TEXT -- JSON array
);

-- Knowledge Points Table
CREATE TABLE IF NOT EXISTS knowledge_points (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    questionId TEXT,
    field TEXT,
    title TEXT NOT NULL,
    content TEXT,
    level INTEGER DEFAULT 1,
    mastered INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

-- User Tags Table
CREATE TABLE IF NOT EXISTS user_tags (
    userId TEXT NOT NULL,
    questionId TEXT NOT NULL,
    tags TEXT, -- JSON array
    PRIMARY KEY (userId, questionId)
);

-- Blobs Table for Files
CREATE TABLE IF NOT EXISTS blobs (
    id TEXT PRIMARY KEY,
    name TEXT,
    contentType TEXT,
    data BLOB,
    createdAt TEXT NOT NULL
);

-- Allowed Students Table
CREATE TABLE IF NOT EXISTS allowed_students (
    studentId TEXT PRIMARY KEY,
    nickname TEXT,
    addedBy TEXT,
    addedAt TEXT
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    value TEXT -- JSON blob
);

-- Seed initial settings
INSERT OR IGNORE INTO settings (id, value) VALUES ('keys', '{"deepseek": "", "ocr": ""}');
INSERT OR IGNORE INTO settings (id, value) VALUES ('birthday', '{"slogan": "祝生物竞赛学子生日快乐！", "isEnabled": false}');
INSERT OR IGNORE INTO settings (id, value) VALUES ('qidan', '{"isEnabled": false}');
INSERT OR IGNORE INTO settings (id, value) VALUES ('art', '{"isEnabled": false}');
