// functions/api/auth/login.ts
export const onRequestPost: PagesFunction<{ DB: D1Database }> = async (context) => {
  const { request, env } = context;
  const { email } = await request.json() as { email: string };

  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
  }

  try {
    // Check if user exists
    let user = await env.DB.prepare("SELECT * FROM users WHERE studentId = ? OR uid = ?")
      .bind(email, email) // We use email/studentId interchangeably in this simplified mock
      .first() as any;

    if (!user) {
      // Check if this is the first user
      const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first('count') as number;
      const role = userCount === 0 ? 'admin' : 'student';

      const uid = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      user = {
        uid,
        studentId: email,
        nickname: email.split('@')[0],
        role: role,
        points: 0,
        questionsUploaded: 0,
        kpsUploaded: 0,
        questionsAnswered: 0,
        tokensUsed: 0,
        createdAt
      };

      await env.DB.prepare(`
        INSERT INTO users (uid, studentId, nickname, role, points, questionsUploaded, kpsUploaded, questionsAnswered, tokensUsed, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user.uid,
        user.studentId,
        user.nickname,
        user.role,
        user.points,
        user.questionsUploaded,
        user.kpsUploaded,
        user.questionsAnswered,
        user.tokensUsed,
        user.createdAt
      ).run();
    }

    return new Response(JSON.stringify(user));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Auth process failed", details: error.message }), { status: 500 });
  }
};
