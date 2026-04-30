// functions/api/db/[[path]].ts
import { createDriver } from "../shared/db";

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env, params } = context;
  const db = createDriver(env);
  const requesterUid = request.headers.get('x-user-uid');
  
  const getRequesterRole = async () => {
    if (!requesterUid) return 'guest';
    try {
      const user = await db.first('SELECT role FROM users WHERE uid = ? OR studentId = ?', [requesterUid, requesterUid]) as any;
      return user ? user.role : 'guest';
    } catch (e) {
      return 'guest';
    }
  };

  const isAtLeastAdmin = async () => (await getRequesterRole()) === 'admin';

  const url = new URL(request.url);
  const pathParts = params.path as string[] || [];
  const collection = pathParts[0];
  const id = pathParts[1];

  if (!collection) {
    return new Response(JSON.stringify({ error: "Missing collection" }), { status: 400 });
  }

  const tableMap: Record<string, string> = {
    'users': 'users',
    'questions': 'questions',
    'knowledgePoints': 'knowledge_points',
    'userTags': 'user_tags',
    'allowedStudents': 'allowed_students',
    'settings': 'settings'
  };

  const table = tableMap[collection];
  if (!table) {
    return new Response(JSON.stringify({ error: "Invalid collection" }), { status: 400 });
  }

  try {
    if (request.method === 'GET') {
      if (id) {
        let query = `SELECT * FROM ${table} WHERE id = ?`;
        let binds: any[] = [id];
        
        if (table === 'users') {
          query = `SELECT * FROM users WHERE uid = ? OR studentId = ?`;
          binds = [id, id];
        }
        
        const result = await db.first(query, binds);
        if (!result) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
        return new Response(JSON.stringify(parseItem(result, collection)));
      } else {
        const { limit, offset, order, ...filters } = Object.fromEntries(url.searchParams.entries());
        let query = `SELECT * FROM ${table}`;
        const binds: any[] = [];
        const whereClauses: string[] = [];

        for (const [key, value] of Object.entries(filters)) {
          whereClauses.push(`${key} = ?`);
          binds.push(value);
        }

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }
        
        if (order) {
          query += ` ORDER BY ${order}`;
        } else if (table === 'questions' || table === 'knowledge_points') {
          query += " ORDER BY createdAt DESC";
        }

        if (limit) {
          query += ` LIMIT ?`;
          binds.push(parseInt(limit));
        }
        if (offset) {
          query += ` OFFSET ?`;
          binds.push(parseInt(offset));
        }

        const { results } = await db.query(query, binds);
        return new Response(JSON.stringify(results.map(item => parseItem(item, collection))));
      }
    }

    if (request.method === 'POST') {
      const role = await getRequesterRole();
      if (collection === 'settings' || collection === 'allowedStudents') {
        if (role !== 'admin') return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
      }

      const data = await request.json() as any;
      const itemId = data.id || data.uid || crypto.randomUUID().split('-')[0];
      const createdAt = data.createdAt || new Date().toISOString();
      
      const payload = { ...data, id: itemId, createdAt };
      if (data.uid) payload.uid = data.uid;
      
      const fields = Object.keys(payload);
      const placeholders = fields.map(() => '?').join(', ');
      const columns = fields.join(', ');
      
      const binds = fields.map(f => {
        const val = payload[f];
        return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
      });

      await db.run(`INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`, binds);
      return new Response(JSON.stringify(parseItem(payload, collection)), { status: 201 });
    }

    if (request.method === 'PUT') {
      if (!id) return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
      
      const role = await getRequesterRole();
      
      // Ownership check for non-admins
      if (role !== 'admin') {
        const existing = await db.first(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        if (existing) {
          const ownerField = table === 'questions' ? 'createdBy' : (table === 'knowledge_points' ? 'studentId' : (table === 'user_tags' ? 'userId' : null));
          if (ownerField && existing[ownerField] !== requesterUid) {
            return new Response(JSON.stringify({ error: "Unauthorized: Not owner" }), { status: 403 });
          }
        }
      }

      // Protect Settings and User Roles
      if (collection === 'settings' || collection === 'allowedStudents') {
        if (role !== 'admin') return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
      }

      const updates = await request.json() as any;
      updates.updatedAt = new Date().toISOString();
      
      // User update security: self or admin
      if (table === 'users') {
        if (role !== 'admin' && requesterUid !== id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
        // Only admin can change roles
        if (role !== 'admin') delete updates.role;
      }

      const fields = Object.keys(updates);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const binds = fields.map(f => {
        const val = updates[f];
        return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
      });
      
      let whereClause = `id = ?`;
      if (table === 'users') {
        whereClause = `uid = ? OR studentId = ?`;
        binds.push(id, id);
      } else {
        binds.push(id);
      }

      await db.run(`UPDATE ${table} SET ${setClause} WHERE ${whereClause}`, binds);
      return new Response(JSON.stringify({ success: true }));
    }

    if (request.method === 'DELETE') {
      if (!id) return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
      
      const role = await getRequesterRole();

      // Ownership check for non-admins
      if (role !== 'admin') {
        const existing = await db.first(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        if (existing) {
          const ownerField = table === 'questions' ? 'createdBy' : (table === 'knowledge_points' ? 'studentId' : (table === 'user_tags' ? 'userId' : null));
          if (ownerField && existing[ownerField] !== requesterUid) {
            return new Response(JSON.stringify({ error: "Unauthorized: Not owner" }), { status: 403 });
          }
        }
      }

      if (role !== 'admin' && (collection === 'users' || collection === 'settings' || collection === 'allowedStudents')) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
      }

      let query = `DELETE FROM ${table} WHERE id = ?`;
      let binds = [id];
      if (table === 'users') {
        query = `DELETE FROM users WHERE uid = ? OR studentId = ?`;
        binds = [id, id];
      }
      await db.run(query, binds);
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

function parseItem(item: any, collection: string) {
  if (!item) return item;
  const result = { ...item };
  
  // Universal parsing for potential JSON fields
  const jsonFields = ['field', 'difficulty', 'tags', 'knowledgePoints', 'value'];
  for (const field of jsonFields) {
    if (result[field] && typeof result[field] === 'string') {
      const trimmed = result[field].trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          result[field] = JSON.parse(trimmed);
        } catch (e) {}
      }
    }
  }

  // Flatten settings
  if (collection === 'settings' && result.value && typeof result.value === 'object') {
    return { id: result.id, ...result.value };
  }
  
  // Convert 1/0 to true/false for mastered
  if (result.mastered !== undefined) {
    result.mastered = !!result.mastered;
  }
  
  return result;
}
