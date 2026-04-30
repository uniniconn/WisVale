import express from "express";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite Database setup
const DB_FILE = path.join(process.cwd(), 'local.db');
const db = new Database(DB_FILE);

// Initialize DB schema
const schema = `
CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(255) PRIMARY KEY,
    studentId VARCHAR(255),
    nickname VARCHAR(255),
    email VARCHAR(255),
    displayName VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student',
    points INT DEFAULT 0,
    questionsUploaded INT DEFAULT 0,
    kpsUploaded INT DEFAULT 0,
    questionsAnswered INT DEFAULT 0,
    tokensUsed INT DEFAULT 0,
    createdAt TEXT
);

CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(255) PRIMARY KEY,
    imageUrl TEXT,
    supplementaryImageUrl TEXT,
    explanationImageUrl TEXT,
    field TEXT,
    source VARCHAR(255),
    sourceDetail VARCHAR(255),
    difficulty TEXT,
    type VARCHAR(100),
    content TEXT,
    answer TEXT,
    explanation TEXT,
    createdBy VARCHAR(255),
    creatorStudentId VARCHAR(255),
    creatorNickname VARCHAR(255),
    createdAt TEXT,
    knowledgePoints TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_points (
    id VARCHAR(255) PRIMARY KEY,
    studentId VARCHAR(255),
    questionId VARCHAR(255),
    field VARCHAR(255),
    title VARCHAR(255),
    content TEXT,
    level INT DEFAULT 1,
    mastered TINYINT(1) DEFAULT 0,
    createdAt TEXT
);

CREATE TABLE IF NOT EXISTS user_tags (
    userId VARCHAR(255),
    questionId VARCHAR(255),
    tags TEXT,
    PRIMARY KEY (userId, questionId)
);

CREATE TABLE IF NOT EXISTS blobs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    contentType VARCHAR(100),
    data BLOB,
    createdAt TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT
);

INSERT OR IGNORE INTO settings (id, value) VALUES ('keys', '{"deepseek": "sk-33c622738cce477c89644e4166af1244", "ocr": "K81905751788957"}');
INSERT OR IGNORE INTO settings (id, value) VALUES ('birthday', '{"slogan": "祝生物竞赛学子生日快乐！", "isEnabled": false}');
INSERT OR IGNORE INTO settings (id, value) VALUES ('qidan', '{"isEnabled": false}');
INSERT OR IGNORE INTO settings (id, value) VALUES ('art', '{"isEnabled": false}');
`;

db.exec(schema);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the proxy (needed for express-rate-limit behind a proxy)
  app.set('trust proxy', 1);

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });

  app.use("/api/", apiLimiter);
  // Multer handles its own parsing for file uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const getApiKey = (provider: 'deepseek' | 'ocr') => {
    try {
      const settings = db.prepare('SELECT value FROM settings WHERE id = ?').get('keys') as any;
      if (settings) {
        const keys = JSON.parse(settings.value);
        if (keys[provider]) return keys[provider];
      }
    } catch (e) {}
    return provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OCR_SPACE_API_KEY;
  };

  // Local DB API Routes
  const tableMapping: Record<string, string> = {
    'users': 'users',
    'questions': 'questions',
    'knowledgePoints': 'knowledge_points',
    'settings': 'settings',
    'user_tags': 'user_tags'
  };

  const getRequesterRole = (req: any) => {
    const uid = req.headers['x-user-uid'];
    if (!uid) return 'guest';
    const user = db.prepare('SELECT role FROM users WHERE uid = ? OR studentId = ?').get(uid, uid) as any;
    return user ? user.role : 'guest';
  };

  const adminOnly = (req: any, res: any, next: any) => {
    if (getRequesterRole(req) !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };

  const parseItem = (item: any, collection?: string) => {
    if (!item) return item;
    const jsonFields = ['field', 'difficulty', 'tags', 'knowledgePoints', 'value'];
    const result = { ...item };
    for (const field of jsonFields) {
      if (result[field] && typeof result[field] === 'string') {
        if (result[field].trim().startsWith('[') || result[field].trim().startsWith('{')) {
          try {
            result[field] = JSON.parse(result[field]);
          } catch (e) {}
        }
      }
    }

    // Special flattening for settings
    if (collection === 'settings' && result.value && typeof result.value === 'object') {
      return { id: result.id, ...result.value };
    }

    // SQLite bool handling
    if (result.mastered !== undefined) {
      result.mastered = !!result.mastered;
    }

    return result;
  };

  // Specific PUT for users to handle updates
  app.put("/api/db/users/:id", async (req, res) => {
    const { id } = req.params;
    const requesterRole = getRequesterRole(req);
    const requesterUid = req.headers['x-user-uid'];

    // Only allow self-update or admin update
    if (requesterRole !== 'admin' && requesterUid !== id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const table = 'users';
    let updates = { ...req.body, updatedAt: new Date().toISOString() };
    
    // Prevent non-admins from changing roles
    if (requesterRole !== 'admin') {
      delete updates.role;
    }

    const jsonFields = ['field', 'difficulty', 'tags', 'knowledgePoints', 'value'];
    for (const field of jsonFields) {
      if (updates[field] && typeof updates[field] !== 'string') {
        updates[field] = JSON.stringify(updates[field]);
      }
    }

    const keys = Object.keys(updates);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE uid = ? OR studentId = ?`;
    
    try {
      db.prepare(sql).run(...Object.values(updates), id, id);
      const updatedItem = db.prepare(`SELECT * FROM ${table} WHERE uid = ? OR studentId = ?`).get(id, id);
      res.json(parseItem(updatedItem));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/db/:collection", async (req, res) => {
    const { collection } = req.params;
    const table = tableMapping[collection] || collection;
    const { limit, offset, order, ...filters } = req.query;
    
    let sql = `SELECT * FROM ${table}`;
    const binds: any[] = [];
    const queryParams = Object.entries(filters);
    
    if (queryParams.length > 0) {
      const clauses = queryParams.map(([key, val]) => {
        binds.push(val);
        return `${key} = ?`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    
    if (order) {
      sql += ` ORDER BY ${order}`;
    } else if (table === 'questions' || table === 'knowledge_points') {
      sql += " ORDER BY createdAt DESC";
    }

    if (limit) {
      sql += ` LIMIT ?`;
      binds.push(parseInt(limit as string));
    }
    if (offset) {
      sql += ` OFFSET ?`;
      binds.push(parseInt(offset as string));
    }

    try {
      const results = db.prepare(sql).all(...binds);
      res.json(results.map(item => parseItem(item, collection)));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/db/:collection/:id", async (req, res) => {
    const { collection, id } = req.params;
    const table = tableMapping[collection] || collection;
    try {
      let item;
      if (table === 'users') {
        item = db.prepare(`SELECT * FROM users WHERE uid = ? OR studentId = ?`).get(id, id);
      } else {
        item = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      }
      
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json(parseItem(item, collection));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/db/:collection", async (req, res, next) => {
    const { collection } = req.params;
    if (collection === 'settings' || collection === 'allowed_students') {
      return adminOnly(req, res, next);
    }
    next();
  }, async (req, res) => {
    const { collection } = req.params;
    const table = tableMapping[collection] || collection;
    const item = req.body;
    
    const id = item.id || item.uid || Math.random().toString(36).substr(2, 9);
    const createdAt = item.createdAt || new Date().toISOString();
    const data = { ...item, id, uid: item.uid || id, createdAt };

    // JSON Stringify special fields
    const jsonFields = ['field', 'difficulty', 'tags', 'knowledgePoints', 'value'];
    for (const field of jsonFields) {
      if (data[field] && typeof data[field] !== 'string') {
        data[field] = JSON.stringify(data[field]);
      }
    }

    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    try {
      db.prepare(sql).run(...Object.values(data));
      res.json(parseItem(data, collection));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put("/api/db/:collection/:id", async (req, res, next) => {
    const { collection } = req.params;
    if (collection === 'settings' || collection === 'allowed_students') {
      return adminOnly(req, res, next);
    }
    next();
  }, async (req, res) => {
    const { id, collection } = req.params;
    const table = tableMapping[collection] || collection;
    const requesterRole = getRequesterRole(req);
    const requesterUid = req.headers['x-user-uid'];

    // Ownership check for non-admins
    if (requesterRole !== 'admin') {
      const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as any;
      if (existing) {
        const ownerField = table === 'questions' ? 'createdBy' : (table === 'knowledge_points' ? 'studentId' : (table === 'user_tags' ? 'userId' : null));
        if (ownerField && existing[ownerField] !== requesterUid) {
          return res.status(403).json({ error: "Unauthorized: Not owner" });
        }
      }
    }

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    
    const jsonFields = ['field', 'difficulty', 'tags', 'knowledgePoints', 'value'];
    for (const field of jsonFields) {
      if (updates[field] && typeof updates[field] !== 'string') {
        updates[field] = JSON.stringify(updates[field]);
      }
    }

    const keys = Object.keys(updates);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    
    try {
      if (table === 'users') {
        db.prepare(`UPDATE users SET ${setClause} WHERE uid = ? OR studentId = ?`).run(...Object.values(updates), id, id);
      } else {
        db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...Object.values(updates), id);
      }
      
      const updatedItem = table === 'users' 
        ? db.prepare(`SELECT * FROM users WHERE uid = ? OR studentId = ?`).get(id, id)
        : db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
        
      res.json(parseItem(updatedItem, collection));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/db/:collection/:id", async (req, res, next) => {
    const { collection } = req.params;
    if (collection === 'users' || collection === 'settings' || collection === 'allowed_students') {
       return adminOnly(req, res, next);
    }
    next();
  }, async (req, res) => {
    const { collection, id } = req.params;
    const table = tableMapping[collection] || collection;
    const requesterRole = getRequesterRole(req);
    const requesterUid = req.headers['x-user-uid'];

    // Ownership check for non-admins (for questions and knowledge points)
    if (requesterRole !== 'admin') {
      const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as any;
      if (existing) {
        const ownerField = table === 'questions' ? 'createdBy' : (table === 'knowledge_points' ? 'studentId' : (table === 'user_tags' ? 'userId' : null));
        if (ownerField && existing[ownerField] !== requesterUid) {
          return res.status(403).json({ error: "Unauthorized: Not owner" });
        }
      }
    }

    try {
      if (table === 'users') {
        db.prepare(`DELETE FROM users WHERE uid = ? OR studentId = ?`).run(id, id);
      } else {
        db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Local Storage Routes (D1/SQLite BLOBs)
  app.post("/api/storage/upload", upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const id = Math.random().toString(36).substr(2, 9);
    const fileName = req.file.originalname;
    const contentType = req.file.mimetype;
    const data = req.file.buffer;
    const createdAt = new Date().toISOString();
    
    try {
      db.prepare('INSERT INTO blobs (id, name, contentType, data, createdAt) VALUES (?, ?, ?, ?, ?)')
        .run(id, fileName, contentType, data, createdAt);
      res.json({ url: `/api/storage/raw/${id}` });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/storage/raw/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const blob = db.prepare('SELECT * FROM blobs WHERE id = ?').get(id) as any;
      if (!blob) return res.status(404).send("File not found");
      
      res.set('Content-Type', blob.contentType);
      res.send(blob.data);
    } catch (error) {
      res.status(500).send("Internal server error");
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email } = req.body;
    try {
      let user = db.prepare('SELECT * FROM users WHERE email = ? OR studentId = ?').get(email, email) as any;
      if (!user) {
        // Count users to see if this is the first one
        const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
        const role = userCount === 0 ? 'admin' : 'student';

        user = {
          uid: Math.random().toString(36).substr(2, 9),
          email,
          studentId: email,
          displayName: email.split('@')[0],
          createdAt: new Date().toISOString(),
          points: 0,
          tokensUsed: 0,
          role: role
        };
        const keys = Object.keys(user);
        const placeholders = keys.map(() => '?').join(', ');
        db.prepare(`INSERT INTO users (${keys.join(', ')}) VALUES (${placeholders})`).run(...Object.values(user));
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Promote special student ID to admin on update (moved up)

  async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status >= 500) {
          lastError = new Error(`HTTP ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        return response;
      } catch (err) {
        lastError = err;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw lastError;
  }

  // OCR Parsing Route
  app.post("/api/ocr/parse", async (req, res) => {
    const { base64Image } = req.body;
    const apiKey = getApiKey('ocr');
    if (!base64Image || !apiKey) return res.status(400).json({ error: "Missing image or API key" });

    try {
      const formData = new URLSearchParams();
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      formData.append("base64Image", `data:image/jpeg;base64,${base64Data}`);
      formData.append("apikey", apiKey);
      formData.append("language", "chs");
      formData.append("OCREngine", "2");

      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });

      if (!response.ok) return res.status(response.status).json({ error: "OCR API error" });
      const result = (await response.json()) as any;
      if (result.IsErroredOnProcessing) return res.status(400).json({ error: "OCR Error", details: result.ErrorMessage });
      res.json({ text: result.ParsedResults?.[0]?.ParsedText || "" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error during OCR" });
    }
  });

  // AI Processing Route
  app.post("/api/ai/process-question", async (req, res) => {
    const { ocrText, explanationText } = req.body;
    const deepseekKey = getApiKey('deepseek');
    if (!ocrText || !deepseekKey) return res.status(400).json({ error: "Missing data" });

    try {
      const response = await fetchWithRetry("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `你是一个资深的生物整理专家。任务：清理OCR噪音、修复名词错误、格式化题面与选项、提取知识点。JSON: { "cleanedContent": "...", "cleanedExplanation": "...", "knowledgePoints": [{ "title": "...", "content": "..." }] }`
            },
            {
              role: "user",
              content: `题目OCR：\n${ocrText}\n\n解析OCR：\n${explanationText || '无'}`
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) return res.status(response.status).json({ error: "AI API error" });
      const result = (await response.json()) as any;
      let content = result.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      res.json({ ...JSON.parse(content), usage: result.usage });
    } catch (error) {
      res.status(500).json({ error: "AI process failed" });
    }
  });

  // Single KP Generation
  app.post("/api/ai/generate-single-kp", async (req, res) => {
    const { content, existingKps } = req.body;
    const deepseekKey = getApiKey('deepseek');
    if (!content || !deepseekKey) return res.status(400).json({ error: "Missing data" });
    try {
      const response = await fetchWithRetry("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `你是一个生物专家。生成一个独特考点。严禁重复：${(existingKps || []).map((k: any) => k.title).join(', ')}。JSON: { "knowledgePoint": { "title": "...", "content": "..." } }`
            },
            { role: "user", content }
          ],
          response_format: { type: "json_object" }
        }),
      });
      if (!response.ok) return res.status(response.status).json({ error: "AI API error" });
      const result = (await response.json()) as any;
      let aiContent = result.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      res.json({ ...JSON.parse(aiContent), usage: result.usage });
    } catch (error) {
      res.status(500).json({ error: "AI process failed" });
    }
  });

  // Knowledge Summary
  app.post("/api/ai/knowledge-summary", async (req, res) => {
    const { kps } = req.body;
    const deepseekKey = getApiKey('deepseek');
    if (!kps || !deepseekKey) return res.status(400).json({ error: "Missing data" });
    try {
      const response = await fetchWithRetry("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-reasoner",
          messages: [{ role: "system", content: "你是一个生物特级教师。生成学习分析报告（Markdown）。" }, { role: "user", content: JSON.stringify(kps) }]
        }),
      });
      if (!response.ok) return res.status(response.status).json({ error: "AI API error" });
      const result = (await response.json()) as any;
      res.json({ summary: result.choices[0].message.content, usage: result.usage });
    } catch (error) {
      res.status(500).json({ error: "AI process failed" });
    }
  });

  // Evaluate Answer
  app.post("/api/ai/evaluate-answer", async (req, res) => {
    const { title, content, answer } = req.body;
    const deepseekKey = getApiKey('deepseek');
    if (!title || !content || !answer || !deepseekKey) return res.status(400).json({ error: "Missing data" });
    try {
      const response = await fetchWithRetry("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `你是一个生物阅卷组长。对:${title}\n标答:${content}\n用户回答:${answer} 进行批改。JSON: { "pass": bool, "reason": "..." }`
            }
          ],
          response_format: { type: "json_object" }
        }),
      });
      if (!response.ok) return res.status(response.status).json({ error: "AI API error" });
      const result = (await response.json()) as any;
      let aiContent = result.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      res.json({ ...JSON.parse(aiContent), usage: result.usage });
    } catch (error) {
      res.status(500).json({ error: "AI process failed" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
