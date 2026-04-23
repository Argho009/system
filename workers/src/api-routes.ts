import type { Context, Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { AppCtx } from './index';
import { getSessionUser, signSession, setSessionCookie, clearSessionCookie } from './auth-helpers';
import type { SessionUser } from './auth-helpers';

async function row<T = Record<string, any>>(
  db: any,
  sql: string,
  ...args: any[]
): Promise<T | null> {
  const st = await db.prepare(sql).bind(...args).first();
  return (st as T) || null;
}

async function all<T = Record<string, any>>(db: any, sql: string, ...args: any[]): Promise<T[]> {
  const r = await db.prepare(sql).bind(...args).all();
  return (r.results as T[]) || [];
}

function id(): string {
  return crypto.randomUUID();
}

function requireAuth(...roles: string[]) {
  return async (c: Context<AppCtx>, next: () => Promise<void>) => {
    const u = await getSessionUser(c as any);
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    const userRole = (u as any).role;
    if (roles.length && !roles.includes(userRole)) return c.json({ error: 'Forbidden' }, 403);
    c.set('user', u as SessionUser);
    await next();
  };
}

export function applyApiRoutes(app: Hono<AppCtx>) {
  app.post('/api/auth/login', async (c) => {
    const body = (await c.req.json()) as { college_id?: string; password?: string };
    const collegeId = (body.college_id || '').trim();
    const password = body.password || '';
    if (!collegeId || !password) return c.json({ error: 'Missing credentials' }, 400);

    const u = await row<{
      id: string;
      college_id: string;
      role: string;
      password_hash: string;
      is_active: number;
      deleted_at: string | null;
    }>(
      c.env.DB,
      `SELECT id, college_id, role, password_hash, is_active, deleted_at, must_change_password FROM users WHERE college_id = ?`,
      collegeId
    );
    if (!u || u.deleted_at) return c.json({ error: 'Invalid credentials' }, 401);
    if (!u.is_active) return c.json({ error: 'Account disabled' }, 403);
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return c.json({ error: 'Invalid credentials' }, 401);

    const token = await signSession(c.env.JWT_SECRET, {
      sub: u.id,
      role: u.role,
      college_id: u.college_id,
    });
    setSessionCookie(c, token);
    return c.json({
      user: {
        id: u.id,
        college_id: u.college_id,
        role: u.role,
        must_change_password: !!u.must_change_password,
        app_metadata: { role: u.role },
      },
    });
  });

  app.post('/api/auth/logout', async (c) => {
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

  app.get('/api/auth/me', async (c) => {
    const u = await getSessionUser(c as any);
    if (!u) return c.json({ user: null, session: null });
    const rowU = await row<{ id: string; college_id: string; name: string; role: string; must_change_password: number }>(
      c.env.DB,
      `SELECT id, college_id, name, role, must_change_password FROM users WHERE id = ?`,
      u.sub
    );
    if (!rowU) return c.json({ user: null, session: null });
    return c.json({
      user: {
        id: rowU.id,
        college_id: rowU.college_id,
        name: rowU.name,
        email: `${rowU.college_id}@college.edu`,
        must_change_password: !!rowU.must_change_password,
        app_metadata: { role: rowU.role },
      },
      session: { user: { id: rowU.id, name: rowU.name, app_metadata: { role: rowU.role } } },
    });
  });

  /* ─── Branches ─── */
  app.get('/api/branches', requireAuth(), async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM branches ORDER BY name`);
    return c.json(rows);
  });

  app.post('/api/branches', requireAuth('admin'), async (c) => {
    const body = (await c.req.json()) as { name?: string; created_by?: string };
    const u = c.get('user');
    const name = (body.name || '').trim().toUpperCase();
    if (!name) return c.json({ error: 'Name required' }, 400);
    const bid = id();
    const createdBy = body.created_by || u?.sub || 'system';
    await c.env.DB.prepare(
      `INSERT INTO branches (id, name, created_by) VALUES (?, ?, ?)`
    )
      .bind(bid, name, createdBy)
      .run();
    return c.json({ id: bid, name, created_by: createdBy });
  });

  app.delete('/api/branches/:id', requireAuth('admin'), async (c) => {
    await c.env.DB.prepare(`DELETE FROM branches WHERE id = ?`).bind(c.req.param('id')).run();
    return c.json({ ok: true });
  });

  /* ─── Users (admin) ─── */
  app.get('/api/users', requireAuth('admin'), async (c) => {
    const deleted = c.req.query('deleted');
    if (deleted === '1') {
      const rows = await all(
        c.env.DB,
        `SELECT * FROM users WHERE deleted_at IS NOT NULL ORDER BY datetime(deleted_at) DESC`
      );
      return c.json(rows);
    }
    const rows = await all(c.env.DB, `SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`);
    return c.json(rows);
  });

  app.post('/api/admin/bulk-upsert-user', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as {
      college_id: string;
      name: string;
      role: string;
      password?: string;
      initial_password?: string;
      roll_no?: string;
      branch?: string;
      sem?: number;
    };
    const existing = await row<{ id: string }>(
      c.env.DB,
      `SELECT id FROM users WHERE college_id = ?`,
      b.college_id
    );
    const pwd = b.password || b.initial_password || b.college_id;
    const hash = await bcrypt.hash(pwd, 10);
    let uid: string;
    if (existing) {
      uid = existing.id;
      await c.env.DB
        .prepare(
          `UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?`
        )
        .bind(b.name, b.role, hash, uid)
        .run();
    } else {
      uid = id();
      await c.env.DB
        .prepare(
          `INSERT INTO users (id, college_id, name, role, password_hash) VALUES (?, ?, ?, ?, ?)`
        )
        .bind(uid, b.college_id, b.name, b.role, hash)
        .run();
    }
    if (b.role === 'student' && b.roll_no != null) {
      const st = await row<{ id: string }>(c.env.DB, `SELECT id FROM students WHERE user_id = ?`, uid);
      if (st) {
        await c.env.DB
          .prepare(`UPDATE students SET roll_no = ?, branch = ?, sem = ? WHERE user_id = ?`)
          .bind(b.roll_no, b.branch || '', b.sem || 1, uid)
          .run();
      } else {
        const sid = id();
        await c.env.DB
          .prepare(`INSERT INTO students (id, user_id, roll_no, branch, sem) VALUES (?, ?, ?, ?, ?)`)
          .bind(sid, uid, b.roll_no, b.branch || '', b.sem || 1)
          .run();
      }
    }
    return c.json({ id: uid });
  });

  app.post('/api/archive_log', requireAuth('admin', 'hod'), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const lid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO archive_log (id, archived_by, branch, sem, academic_year, students_count, subjects_count, rows_archived, rows_deleted, file_name, file_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        lid,
        b.archived_by,
        b.branch,
        b.sem,
        b.academic_year,
        b.students_count,
        b.subjects_count,
        b.rows_archived,
        b.rows_deleted,
        b.file_name ?? null,
        b.file_url ?? null,
        b.status || 'completed'
      )
      .run();
    return c.json({ id: lid });
  });

  app.post('/api/admin/users', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as {
      college_id: string;
      password: string;
      name: string;
      role: string;
      branch?: string | null;
      sem?: number | null;
      roll_no?: string | null;
    };
    const newId = id();
    const hash = await bcrypt.hash(b.password, 10);
    await c.env.DB.prepare(
      `INSERT INTO users (id, college_id, name, role, password_hash) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(newId, b.college_id, b.name, b.role, hash)
      .run();
    if (b.role === 'student' && b.roll_no) {
      const sid = id();
      await c.env.DB.prepare(
        `INSERT INTO students (id, user_id, roll_no, branch, sem) VALUES (?, ?, ?, ?, ?)`
      )
        .bind(sid, newId, b.roll_no, b.branch || '', b.sem || 1)
        .run();
    }
    return c.json({ id: newId });
  });

  app.patch('/api/users/:uid', requireAuth('admin'), async (c) => {
    const uid = c.req.param('uid');
    const b = (await c.req.json()) as {
      name?: string;
      role?: string;
      is_active?: boolean;
      deleted_at?: string | null;
      password?: string;
    };
    if (b.password) {
      const hash = await bcrypt.hash(b.password, 10);
      await c.env.DB
        .prepare(
          `UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active),
         deleted_at = ?, password_hash = ? WHERE id = ?`
        )
        .bind(
          b.name ?? null,
          b.role ?? null,
          b.is_active === undefined ? null : b.is_active ? 1 : 0,
          b.deleted_at ?? null,
          hash,
          uid
        )
        .run();
    } else {
      await c.env.DB
        .prepare(
          `UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active), deleted_at = ? WHERE id = ?`
        )
        .bind(
          b.name ?? null,
          b.role ?? null,
          b.is_active === undefined ? null : b.is_active ? 1 : 0,
          b.deleted_at ?? null,
          uid
        )
        .run();
    }
    return c.json({ ok: true });
  });

  app.delete('/api/users/:uid', requireAuth('admin'), async (c) => {
    await c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(c.req.param('uid')).run();
    return c.json({ ok: true });
  });

  /* ─── Students ─── */
  app.get('/api/students', requireAuth(), async (c) => {
    const branch = c.req.query('branch');
    const sem = c.req.query('sem');
    const rollNo = c.req.query('roll_no');
    if (branch || sem || rollNo) {
      let sql = `SELECT s.*, u.name AS user_name FROM students s JOIN users u ON u.id = s.user_id WHERE 1=1`;
      const args: unknown[] = [];
      if (branch) {
        sql += ` AND s.branch = ?`;
        args.push(branch);
      }
      if (sem) {
        sql += ` AND s.sem = ?`;
        args.push(parseInt(sem, 10));
      }
      if (rollNo) {
        sql += ` AND s.roll_no = ?`;
        args.push(rollNo.trim());
      }
      sql += ` ORDER BY s.roll_no`;
      const rows = await all(c.env.DB, sql, ...args);
      return c.json(
        rows.map((r: Record<string, unknown>) => ({
          ...r,
          users: { name: r.user_name },
        }))
      );
    }
    const rows = await all(c.env.DB, `SELECT * FROM students`);
    return c.json(rows);
  });

  app.patch('/api/students/by-user/:userId', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as { roll_no: string; branch: string; sem: number };
    await c.env.DB
      .prepare(`UPDATE students SET roll_no = ?, branch = ?, sem = ? WHERE user_id = ?`)
      .bind(b.roll_no, b.branch, b.sem, c.req.param('userId'))
      .run();
    return c.json({ ok: true });
  });

  app.get('/api/students-with-users', requireAuth(), async (c) => {
    const branch = c.req.query('branch');
    const sem = c.req.query('sem');
    let sql = `SELECT s.*, u.name as user_name FROM students s JOIN users u ON u.id = s.user_id WHERE 1=1`;
    const args: unknown[] = [];
    if (branch) {
      sql += ` AND s.branch = ?`;
      args.push(branch);
    }
    if (sem) {
      sql += ` AND s.sem = ?`;
      args.push(parseInt(sem, 10));
    }
    sql += ` ORDER BY s.roll_no`;
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        users: { name: r.user_name },
      }))
    );
  });

  /* ─── Subjects & assignments ─── */
  app.get('/api/subjects', requireAuth(), async (c) => {
    const subs = await all(c.env.DB, `SELECT * FROM subjects ORDER BY code`);
    const mappings = await all(c.env.DB, `SELECT * FROM subject_branches`);
    
    return c.json(subs.map(s => ({
      ...s,
      branches: mappings.filter(m => m.subject_id === s.id).map(m => m.branch_name)
    })));
  });

  app.post('/api/subjects', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as { 
      name: string; 
      code: string; 
      sem: number; 
      branches?: string[]; 
      branch?: string; 
    };
    const sid = id();
    const branchNames = b.branches || (b.branch ? [b.branch] : []);

    await c.env.DB.prepare(
      `INSERT INTO subjects (id, name, code, sem) VALUES (?, ?, ?, ?)`
    )
      .bind(sid, b.name, b.code.toUpperCase(), b.sem)
      .run();

    if (branchNames.length) {
      const markers = branchNames.map(() => '(?, ?)').join(', ');
      const flat = branchNames.flatMap(bn => [sid, bn]);
      await c.env.DB.prepare(
        `INSERT INTO subject_branches (subject_id, branch_name) VALUES ${markers}`
      ).bind(...flat).run();
    }

    return c.json({ id: sid });
  });

  app.delete('/api/subjects/:id', requireAuth('admin'), async (c) => {
    await c.env.DB.prepare(`DELETE FROM subjects WHERE id = ?`).bind(c.req.param('id')).run();
    return c.json({ ok: true });
  });

  app.get('/api/subject-assignments', requireAuth(), async (c) => {
    const teacher = c.req.query('teacher_id');
    const branch = c.req.query('branch_name');
    let sql = `SELECT sa.*, u.name as teacher_name, u.college_id as teacher_college_id FROM subject_assignments sa LEFT JOIN users u ON u.id = sa.teacher_id WHERE 1=1`;
    const args: unknown[] = [];
    if (teacher) {
      sql += ` AND sa.teacher_id = ?`;
      args.push(teacher);
    }
    if (branch) {
      sql += ` AND sa.branch_name = ?`;
      args.push(branch);
    }
    const rows = await all(c.env.DB, sql, ...args);
    const subs = await all(c.env.DB, `SELECT id, code, name, sem FROM subjects`);
    const mappings = await all(c.env.DB, `SELECT * FROM subject_branches`);
    const subMap = Object.fromEntries(subs.map((s: any) => [
      s.id, 
      { ...s, branches: mappings.filter(m => m.subject_id === s.id).map(m => m.branch_name) }
    ]));
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        users: { name: r.teacher_name },
        teacher: { name: r.teacher_name, college_id: r.teacher_college_id },
        subjects: subMap[r.subject_id as string],
      }))
    );
  });

  app.post('/api/subject-assignments', requireAuth('admin', 'hod'), async (c) => {
    const b = (await c.req.json()) as {
      subject_id: string;
      teacher_id: string;
      academic_year: string;
      branch_name: string; // Now required
    };
    const aid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO subject_assignments (id, subject_id, teacher_id, academic_year, branch_name) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(subject_id, teacher_id, academic_year, branch_name) DO NOTHING`
      )
      .bind(aid, b.subject_id, b.teacher_id, b.academic_year, b.branch_name)
      .run();
    return c.json({ ok: true });
  });

  app.delete('/api/subject-assignments/:id', requireAuth('admin', 'hod'), async (c) => {
    await c.env.DB.prepare(`DELETE FROM subject_assignments WHERE id = ?`).bind(c.req.param('id')).run();
    return c.json({ ok: true });
  });

  /* ─── System config ─── */
  app.get('/api/system_config', requireAuth(), async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM system_config`);
    return c.json(rows);
  });

  app.get('/api/system_config/:key', requireAuth(), async (c) => {
    const k = c.req.param('key');
    const r = await row(c.env.DB, `SELECT * FROM system_config WHERE key = ?`, k);
    return c.json(r);
  });

  app.put('/api/system_config', requireAuth('admin', 'hod'), async (c) => {
    const b = (await c.req.json()) as { key: string; value: string; updated_by?: string };
    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    await c.env.DB
      .prepare(
        `INSERT INTO system_config (key, value, updated_by) VALUES (?, ?, ?) 
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
      )
      .bind(b.key, b.value, b.updated_by || u.sub)
      .run();
    return c.json({ ok: true });
  });

  app.delete('/api/system_config/:key', requireAuth('admin'), async (c) => {
    await c.env.DB.prepare(`DELETE FROM system_config WHERE key = ?`).bind(c.req.param('key')).run();
    return c.json({ ok: true });
  });

  /* ─── Lectures & attendance ─── */
  app.get('/api/lectures', requireAuth(), async (c) => {
    const subjectId = c.req.query('subject_id');
    const teacherId = c.req.query('teacher_id');
    const date = c.req.query('date');
    const sem = c.req.query('sem');
    const year = c.req.query('academic_year');
    const isSkipped = c.req.query('is_skipped');
    let sql = `SELECT l.*, s.code as sub_code, s.name as sub_name,
      (SELECT GROUP_CONCAT(branch_name) FROM subject_branches sb WHERE sb.subject_id = s.id) as sub_branches,
      (SELECT COUNT(*) FROM attendance a WHERE a.lecture_id = l.id AND (a.status = 'present' OR a.status = 'late')) as present_count,
      (SELECT COUNT(*) FROM attendance a WHERE a.lecture_id = l.id AND a.status = 'late') as late_count,
      (SELECT COUNT(*) FROM attendance a WHERE a.lecture_id = l.id AND a.status = 'excused') as excused_count,
      (SELECT COUNT(*) FROM attendance a WHERE a.lecture_id = l.id) as total_count
      FROM lectures l 
      LEFT JOIN subjects s ON s.id = l.subject_id WHERE 1=1`;
    const args: unknown[] = [];
    if (subjectId) {
      sql += ` AND l.subject_id = ?`;
      args.push(subjectId);
    }
    if (teacherId) {
      sql += ` AND l.teacher_id = ?`;
      args.push(teacherId);
    }
    if (date) {
      sql += ` AND l.date = ?`;
      args.push(date);
    }
    if (sem) {
      sql += ` AND l.sem = ?`;
      args.push(parseInt(sem, 10));
    }
    if (year) {
      sql += ` AND l.academic_year = ?`;
      args.push(year);
    }
    if (isSkipped === 'false') {
      sql += ` AND l.is_skipped = 0`;
    }
    if (isSkipped === 'true') {
      sql += ` AND l.is_skipped = 1`;
    }
    sql += ` ORDER BY l.date DESC, l.lecture_no`;
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        subjects: { code: r.sub_code, name: r.sub_name, branches: (r.sub_branches as string || '').split(',') },
        is_skipped: !!r.is_skipped,
      }))
    );
  });

  app.get('/api/lectures/count', requireAuth(), async (c) => {
    const teacherId = c.req.query('teacher_id');
    const gte = c.req.query('gte_date');
    let sql = `SELECT COUNT(*) as c FROM lectures WHERE 1=1`;
    const args: unknown[] = [];
    if (teacherId) {
      sql += ` AND teacher_id = ?`;
      args.push(teacherId);
    }
    if (gte) {
      sql += ` AND date >= ?`;
      args.push(gte);
    }
    const r = await row<{ c: number }>(c.env.DB, sql, ...args);
    return c.json({ count: r?.c ?? 0 });
  });

  /** Lectures for a branch/sem (via subjects) — e.g. HOD attendance report */
  app.get('/api/lectures/for-branch', requireAuth(), async (c) => {
    const branch = c.req.query('branch')!;
    const sem = parseInt(c.req.query('sem') || '0', 10);
    const rows = await all(
      c.env.DB,
      `SELECT l.id, l.subject_id, s.code AS sub_code FROM lectures l
       JOIN subjects s ON s.id = l.subject_id
       JOIN subject_branches sb ON sb.subject_id = s.id
       WHERE l.sem = ? AND sb.branch_name = ? AND l.is_skipped = 0`,
      sem,
      branch
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        subject_id: r.subject_id,
        subjects: { code: r.sub_code },
      }))
    );
  });

  app.post('/api/lectures', requireAuth('teacher', 'admin'), async (c) => {
    const b = (await c.req.json()) as { 
       subject_id: string; 
       date: string; 
       lecture_nos: (string|number)[]; 
       academic_year: string; 
       sem: number;
       blank_means?: string;
       teacher_id?: string;
    };
    const u = c.get('user')!;
    const lecture_nos = Array.isArray(b.lecture_nos) ? b.lecture_nos : [b.lecture_no];

    // Helper to check timetable for proxy detection
    const getSlotOwner = async (ln: number) => {
       const row_ = await row<{ teacher_id: string }>(
         c.env.DB,
         `SELECT teacher_id FROM timetable WHERE subject_id = ? AND lecture_no = ?`,
         b.subject_id, ln
       );
       return row_?.teacher_id;
    };

    const createdIds: string[] = [];
    for (const lnRaw of lecture_nos) {
       const ln = parseInt(lnRaw.toString(), 10);
       const ownerId = await getSlotOwner(ln);
       const isProxy = !!ownerId && ownerId !== u.sub;
       const lid = id();
       
       await c.env.DB
         .prepare(
           `INSERT INTO lectures (id, subject_id, teacher_id, date, lecture_no, academic_year, sem, blank_means, is_skipped, is_proxy, proxy_marked_by, proxy_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
         )
         .bind(
           lid,
           b.subject_id,
           ownerId || u.sub, // The lecture belongs to the slot owner (so they approve it) or the marker
           b.date,
           ln,
           b.academic_year,
           b.sem,
           b.blank_means || 'absent',
           isProxy ? 1 : 0,
           isProxy ? u.sub : null,
           isProxy ? 'pending' : 'approved'
         )
         .run();
       createdIds.push(lid);
    }
    
    return c.json({ ids: createdIds, id: createdIds[0] });
  });

  app.post('/api/lectures/approve/:id', requireAuth('teacher'), async (c) => {
     const lid = c.req.param('id');
     const u = c.get('user')!;
     await c.env.DB.prepare(`UPDATE lectures SET proxy_status = 'approved' WHERE id = ? AND teacher_id = ?`).bind(lid, u.sub).run();
     return c.json({ ok: true });
  });

  app.post('/api/lectures/reject/:id', requireAuth('teacher'), async (c) => {
     const lid = c.req.param('id');
     const u = c.get('user')!;
     // If rejected, we mark it as skipped or delete? User said "approve it". If not approved, it shouldn't count.
     // Let's delete it and its attendance to be clean.
     await c.env.DB.prepare(`DELETE FROM attendance WHERE lecture_id = ?`).bind(lid).run();
     await c.env.DB.prepare(`DELETE FROM lectures WHERE id = ? AND teacher_id = ?`).bind(lid, u.sub).run();
     return c.json({ ok: true });
  });

  app.get('/api/lectures/pending-proxy', requireAuth('teacher'), async (c) => {
     const u = c.get('user')!;
     const rows = await all(
       c.env.DB,
       `SELECT l.*, s.code as sub_code, u2.name as marked_by_name FROM lectures l
        JOIN subjects s ON s.id = l.subject_id
        JOIN users u2 ON u2.id = l.proxy_marked_by
        WHERE l.teacher_id = ? AND l.is_proxy = 1 AND l.proxy_status = 'pending'`,
       u.sub
     );
     return c.json(rows);
  });

  app.get('/api/attendance', requireAuth(), async (c) => {
    const lectureId = c.req.query('lecture_id');
    const studentId = c.req.query('student_id');
    const academicYear = c.req.query('academic_year');
    const lectureIds = c.req.query('lecture_ids');
    let sql = `SELECT * FROM attendance WHERE 1=1`;
    const args: unknown[] = [];
    if (lectureId) {
      sql += ` AND lecture_id = ?`;
      args.push(lectureId);
    }
    if (lectureIds) {
      const ids = lectureIds.split(',').filter(Boolean);
      if (ids.length) {
        sql += ` AND lecture_id IN (${ids.map(() => '?').join(',')})`;
        args.push(...ids);
      }
    }
    if (studentId) {
      sql += ` AND student_id = ?`;
      args.push(studentId);
    }
    if (academicYear) {
      sql += ` AND academic_year = ?`;
      args.push(academicYear);
    }
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(rows);
  });

  app.post('/api/attendance', requireAuth('teacher', 'admin'), async (c) => {
    const body = await c.req.json();
    const rows = Array.isArray(body) ? body : (body as { rows?: unknown }).rows;
    const list = (Array.isArray(rows) ? rows : []) as Record<string, unknown>[];
    if (!list.length) return c.json({ error: 'No rows' }, 400);

    // Use UPSERT logic
    await c.env.DB.batch(
      list.map((r) =>
        c.env.DB.prepare(
          `INSERT INTO attendance (id, lecture_id, student_id, status, marked_by, academic_year) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(lecture_id, student_id) DO UPDATE SET 
             status = excluded.status, 
             edited_by = ?, 
             edited_at = datetime('now')`
        ).bind(id(), r.lecture_id, r.student_id, r.status, r.marked_by, r.academic_year, r.marked_by)
      )
    );
    return c.json({ ok: true });
  });

  app.patch('/api/attendance', requireAuth('teacher', 'admin'), async (c) => {
    const b = (await c.req.json()) as {
      lecture_id: string;
      student_id: string;
      status: string;
      edited_by: string;
      edited_at: string;
    };
    await c.env.DB
      .prepare(
        `INSERT INTO attendance (id, lecture_id, student_id, status, marked_by, academic_year) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(lecture_id, student_id) DO UPDATE SET 
           status = excluded.status, 
           edited_by = excluded.marked_by, 
           edited_at = datetime('now')`
      )
      .bind(id(), b.lecture_id, b.student_id, b.status, b.edited_by, '2024-25') // academic year fallback
      .run();
    return c.json({ ok: true });
  });

  /* ─── Notices ─── */
  app.get('/api/notices', requireAuth(), async (c) => {
    const rows = await all(
      c.env.DB,
      `SELECT n.*, u.name as poster_name, s.code as subject_code FROM notices n 
       LEFT JOIN users u ON u.id = n.created_by LEFT JOIN subjects s ON s.id = n.subject_id
       ORDER BY n.is_pinned DESC, n.created_at DESC`
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        users: { name: r.poster_name },
        subjects: r.subject_code ? { code: r.subject_code } : null,
        is_active: !!r.is_active,
        is_pinned: !!r.is_pinned,
      }))
    );
  });

  app.post('/api/notices', requireAuth('admin', 'hod', 'teacher'), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    const nid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO notices (id, title, body, type, created_by, subject_id, branch, sem, due_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(
        nid,
        b.title,
        b.body,
        b.type,
        b.created_by || u.sub,
        b.subject_id || null,
        b.branch || null,
        b.sem ?? null,
        b.due_date || null
      )
      .run();
    return c.json({ id: nid });
  });

  app.patch('/api/notices/:id', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of ['is_pinned', 'is_active', 'title', 'body']) {
      if (k in b) {
        sets.push(`${k} = ?`);
        vals.push(k === 'is_pinned' || k === 'is_active' ? (b[k] ? 1 : 0) : b[k]);
      }
    }
    if (!sets.length) return c.json({ ok: true });
    vals.push(c.req.param('id'));
    await c.env.DB.prepare(`UPDATE notices SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return c.json({ ok: true });
  });

  app.delete('/api/notices/:id', requireAuth('admin', 'hod', 'teacher'), async (c) => {
    await c.env.DB.prepare(`DELETE FROM notices WHERE id = ?`).bind(c.req.param('id')).run();
    return c.json({ ok: true });
  });

  /* ─── Holidays ─── */
  app.get('/api/holidays', requireAuth(), async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM holidays ORDER BY date DESC`);
    return c.json(rows);
  });

  app.post('/api/holidays', requireAuth('hod', 'admin'), async (c) => {
    const b = (await c.req.json()) as { date: string; reason: string; added_by?: string };
    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    const hid = id();
    await c.env.DB
      .prepare(`INSERT INTO holidays (id, date, reason, added_by) VALUES (?, ?, ?, ?)`)
      .bind(hid, b.date, b.reason, b.added_by || u.sub)
      .run();
    return c.json({ id: hid });
  });

  app.delete('/api/holidays/:id', requireAuth('hod', 'admin'), async (c) => {
    await c.env.DB.prepare(`DELETE FROM holidays WHERE id = ?`).bind(c.req.param('id')).run();
    return c.json({ ok: true });
  });

  /* ─── Timetable ─── */
  app.get('/api/timetable', requireAuth(), async (c) => {
    const branch = c.req.query('branch');
    const sem = c.req.query('sem');
    const teacher_id = c.req.query('teacher_id');
    const subjectIds = c.req.query('subject_ids');
    const day = c.req.query('day_of_week');

    if (teacher_id) {
       const rows = await all(
         c.env.DB,
         `SELECT t.*, s.code as subject_code, s.name as subject_name FROM timetable t 
          LEFT JOIN subjects s ON s.id = t.subject_id WHERE t.teacher_id = ? ORDER BY t.day_of_week, t.lecture_no`,
         teacher_id
       );
       return c.json(rows.map((r: any) => ({
         ...r,
         subjects: r.subject_code ? { code: r.subject_code, name: r.subject_name } : null
       })));
    }

    if (subjectIds) {
      const ids = subjectIds.split(',').filter(Boolean);
      if (!ids.length) return c.json([]);
      const placeholders = ids.map(() => '?').join(',');
      let sql = `SELECT t.*, s.code as subject_code, s.name as subject_name FROM timetable t
        LEFT JOIN subjects s ON s.id = t.subject_id WHERE t.subject_id IN (${placeholders})`;
      const args: unknown[] = [...ids];
      if (day) {
        sql += ` AND t.day_of_week = ?`;
        args.push(day);
      }
      sql += ` ORDER BY t.lecture_no`;
      const rows = await all(c.env.DB, sql, ...args);
      return c.json(
        rows.map((r: Record<string, unknown>) => ({
          ...r,
          subjects: r.subject_code ? { code: r.subject_code, name: r.subject_name } : null,
        }))
      );
    }
    const rows = await all(
      c.env.DB,
      `SELECT t.*, s.code as subject_code, s.name as subject_name FROM timetable t 
       LEFT JOIN subjects s ON s.id = t.subject_id WHERE t.branch = ? AND t.sem = ? ORDER BY t.day_of_week, t.lecture_no`,
      branch,
      parseInt(sem || '1', 10)
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        subjects: r.subject_code ? { code: r.subject_code, name: r.subject_name } : null,
      }))
    );
  });

  app.get('/api/timetable_change_log', requireAuth(), async (c) => {
    const branch = c.req.query('branch');
    const sem = c.req.query('sem');
    const rows = await all(
      c.env.DB,
      `SELECT l.*, u.name AS changer_name FROM timetable_change_log l
       LEFT JOIN users u ON u.id = l.changed_by
       WHERE l.branch = ? AND l.sem = ? ORDER BY l.changed_at DESC`,
      branch,
      parseInt(sem || '0', 10)
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        users: { name: r.changer_name },
      }))
    );
  });

  app.post('/api/timetable', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, any>;

    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    
    const branch = String(b.branch || '');
    const sem = parseInt(String(b.sem), 10);
    // Normalize day name: MONDAY -> Monday
    let day_of_week = (String(b.day_of_week || '').toLowerCase());
    day_of_week = day_of_week.charAt(0).toUpperCase() + day_of_week.slice(1);
    
    const lecture_no = parseInt(String(b.lecture_no), 10);

    if (!branch || isNaN(sem) || !day_of_week || isNaN(lecture_no)) {
      return c.json({ error: 'Missing or invalid timetable fields' }, 400);
    }

    const existing = await row<{ id: string }>(
      c.env.DB,
      `SELECT id FROM timetable WHERE branch = ? AND sem = ? AND day_of_week = ? AND lecture_no = ?`,
      branch,
      sem,
      day_of_week,
      lecture_no
    );
    const tid = existing?.id || id();
    await c.env.DB
      .prepare(
        `INSERT INTO timetable (id, branch, sem, day_of_week, lecture_no, subject_id, room, edited_by, edited_at, teacher_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
       ON CONFLICT(branch, sem, day_of_week, lecture_no) DO UPDATE SET
         subject_id = excluded.subject_id, room = excluded.room, edited_by = excluded.edited_by, edited_at = datetime('now'), teacher_id = excluded.teacher_id`
      )
      .bind(
        tid,
        branch,
        sem,
        day_of_week,
        lecture_no,
        b.subject_id || null,
        b.room || null,
        u.sub,
        b.teacher_id || null
      )
      .run();
    return c.json({ ok: true, id: tid });
  });

  app.post('/api/timetable/clear', requireAuth('admin', 'hod'), async (c) => {
    const b = (await c.req.json()) as { branch: string; sem: number };
    if (!b.branch || isNaN(b.sem)) return c.json({ error: 'Branch and Sem required' }, 400);
    const u = c.get('user')!;

    await c.env.DB.prepare(`DELETE FROM timetable WHERE branch = ? AND sem = ?`).bind(b.branch, b.sem).run();

    await c.env.DB
      .prepare(
        `INSERT INTO timetable_change_log (id, changed_by, branch, sem, day_of_week, lecture_no, change_description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id(), u.sub, b.branch, b.sem, 'ALL', 0, 'Cleared entire schedule')
      .run();

    return c.json({ ok: true });
  });


  app.post('/api/timetable/batch', requireAuth('admin', 'hod'), async (c) => {
    const b = (await c.req.json()) as { 
      slots: any[], 
      branch: string, 
      sem: any,
      mode?: 'student' | 'teacher'
    };
    const u = c.get('user')!;
    if (!b.slots || !Array.isArray(b.slots)) return c.json({ error: 'Invalid slots array' }, 400);

    const branch = String(b.branch || '');
    const sem = parseInt(String(b.sem), 10);
    const mode = b.mode || 'student';

    const statements = [];

    if (mode === 'student') {
      // 1. Delete existing for THIS segment only
      statements.push(c.env.DB.prepare(`DELETE FROM timetable WHERE branch = ? AND sem = ?`).bind(branch, sem));
      
      // 2. Insert fresh rows using ID resolution
      for (const s of b.slots) {
         let day = (String(s.day_of_week || s.day || '').toLowerCase());
         day = day.charAt(0).toUpperCase() + day.slice(1);
         const ln = parseInt(String(s.lecture_no), 10);
         if (!day || isNaN(ln)) continue;

         // Note: We use subqueries so the frontend can just send CODE and NAME
         // If a subject/teacher isn't found, the ID becomes NULL (which is fine, manual fix later)
         statements.push(
           c.env.DB.prepare(
             `INSERT INTO timetable (id, branch, sem, day_of_week, lecture_no, subject_id, teacher_id, room, edited_by, edited_at)
              VALUES (?, ?, ?, ?, ?, 
                (SELECT id FROM subjects WHERE code = ? LIMIT 1),
                (SELECT id FROM users WHERE name LIKE ? AND role = 'teacher' LIMIT 1),
                ?, ?, datetime('now'))`
           ).bind(
             id(),
             branch,
             sem,
             day,
             ln,
             s.subject_code || '',
             s.teacher_name ? `${s.teacher_name}%` : '',
             s.room || null,
             u.sub
           )
         );
      }
      
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO timetable_change_log (id, changed_by, branch, sem, day_of_week, lecture_no, change_description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(id(), u.sub, branch, sem, 'ALL', 0, 'Full schedule import/overwrite')
      );
    } else {
      // Teacher Mode - UPDATE existing slots with teacher_id
      for (const s of b.slots) {
         let day = (String(s.day_of_week || s.day || '').toLowerCase());
         day = day.charAt(0).toUpperCase() + day.slice(1);
         const ln = parseInt(String(s.lecture_no), 10);
         if (!day || isNaN(ln)) continue;

         statements.push(
           c.env.DB.prepare(
             `UPDATE timetable SET 
                teacher_id = (SELECT id FROM users WHERE name LIKE ? AND role = 'teacher' LIMIT 1),
                edited_by = ?,
                edited_at = datetime('now')
              WHERE branch = ? AND sem = ? AND day_of_week = ? AND lecture_no = ?`
           ).bind(
             s.teacher_name ? `${s.teacher_name}%` : '',
             u.sub,
             branch,
             sem,
             day,
             ln
           )
         );
      }
      
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO timetable_change_log (id, changed_by, branch, sem, day_of_week, lecture_no, change_description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(id(), u.sub, branch, sem, 'ALL', 0, 'Teacher schedule overwrite/stamp')
      );
    }

    await c.env.DB.batch(statements);
    return c.json({ ok: true });
  });



  app.post('/api/timetable_change_log', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const lid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO timetable_change_log (id, timetable_id, changed_by, old_subject_id, new_subject_id, old_room, new_room, branch, sem, day_of_week, lecture_no, change_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        lid,
        b.timetable_id,
        b.changed_by,
        b.old_subject_id ?? null,
        b.new_subject_id ?? null,
        b.old_room ?? null,
        b.new_room ?? null,
        b.branch ?? null,
        b.sem ?? null,
        b.day_of_week ?? null,
        b.lecture_no ?? null,
        b.change_description ?? null
      )
      .run();
    return c.json({ ok: true });
  });

  /* ─── Substitute / leave / condonation / marks / misc ─── */
  app.get('/api/substitute_log', requireAuth(), async (c) => {
    const date = c.req.query('date');
    const status = c.req.query('status');
    const mine = c.req.query('mine');
    const sessionU = c.get('user');
    let sql = `SELECT sl.*, 
      tu.name AS orig_name, su.name AS sub_name,
      tt.day_of_week AS tt_day, tt.lecture_no AS tt_lec, tt.branch AS tt_branch, tt.sem AS tt_sem,
      sub.code AS sub_code
      FROM substitute_log sl
      LEFT JOIN users tu ON tu.id = sl.original_teacher_id
      LEFT JOIN users su ON su.id = sl.substitute_teacher_id
      LEFT JOIN timetable tt ON tt.id = sl.timetable_id
      LEFT JOIN subjects sub ON sub.id = tt.subject_id
      WHERE 1=1`;
    const args: unknown[] = [];
    if (date) {
      sql += ` AND sl.date = ?`;
      args.push(date);
    }
    if (status) {
      sql += ` AND sl.status = ?`;
      args.push(status);
    }
    if (mine === '1' && sessionU) {
      sql += ` AND (sl.original_teacher_id = ? OR sl.substitute_teacher_id = ?)`;
      args.push(sessionU.sub, sessionU.sub);
    }
    sql += ` ORDER BY sl.created_at DESC`;
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        original: r.orig_name ? { name: r.orig_name } : null,
        substitute: r.sub_name ? { name: r.sub_name } : null,
        timetable: r.tt_day
          ? {
              day_of_week: r.tt_day,
              lecture_no: r.tt_lec,
              branch: r.tt_branch,
              sem: r.tt_sem,
              subjects: { code: r.sub_code },
            }
          : null,
      }))
    );
  });

  app.post('/api/substitute_log', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const sid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO substitute_log (id, timetable_id, lecture_id, date, original_teacher_id, substitute_teacher_id, note, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .bind(sid, b.timetable_id, b.lecture_id || null, b.date, b.original_teacher_id, b.substitute_teacher_id, b.note || '')
      .run();
    return c.json({ id: sid });
  });

  app.patch('/api/substitute_log/:id', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    await c.env.DB
      .prepare(`UPDATE substitute_log SET status = ?, accepted_by = ? WHERE id = ?`)
      .bind(b.status, b.accepted_by || null, c.req.param('id'))
      .run();
    return c.json({ ok: true });
  });

  app.get('/api/leave_requests', requireAuth(), async (c) => {
    const date = c.req.query('date');
    const status = c.req.query('status');
    const teacherId = c.req.query('teacher_id');
    let sql = `SELECT lr.*, rv.name AS reviewer_name, su.name AS substitute_name,
      tch.name AS teacher_name, tch.college_id AS teacher_college_id
      FROM leave_requests lr
      LEFT JOIN users rv ON rv.id = lr.reviewed_by
      LEFT JOIN users su ON su.id = lr.suggested_substitute
      LEFT JOIN users tch ON tch.id = lr.teacher_id
      WHERE 1=1`;
    const args: unknown[] = [];
    if (date) {
      sql += ` AND lr.date = ?`;
      args.push(date);
    }
    if (status) {
      sql += ` AND lr.status = ?`;
      args.push(status);
    }
    if (teacherId) {
      sql += ` AND lr.teacher_id = ?`;
      args.push(teacherId);
    }
    sql += ` ORDER BY lr.created_at DESC`;
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        reviewer: r.reviewer_name ? { name: r.reviewer_name } : null,
        substitute: r.substitute_name ? { name: r.substitute_name } : null,
        teacher:
          r.teacher_name || r.teacher_college_id
            ? { name: r.teacher_name, college_id: r.teacher_college_id }
            : null,
      }))
    );
  });

  app.get('/api/leave_requests/count', requireAuth(), async (c) => {
    const teacherId = c.req.query('teacher_id')!;
    const status = c.req.query('status') || 'pending';
    const r = await row<{ c: number }>(
      c.env.DB,
      `SELECT COUNT(*) as c FROM leave_requests WHERE teacher_id = ? AND status = ?`,
      teacherId,
      status
    );
    return c.json({ count: r?.c ?? 0 });
  });

  app.post('/api/leave_requests', requireAuth('teacher'), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    const lid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO leave_requests (id, teacher_id, date, type, reason, suggested_substitute, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`
      )
      .bind(lid, u.sub, b.date, b.type, b.reason || '', b.suggested_substitute || null)
      .run();
    return c.json({ id: lid });
  });

  app.patch('/api/leave_requests/:id', requireAuth('hod', 'admin'), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    await c.env.DB
      .prepare(
        `UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
      )
      .bind(b.status, u.sub, c.req.param('id'))
      .run();
    return c.json({ ok: true });
  });

  app.get('/api/attendance_change_requests', requireAuth(), async (c) => {
    const rows = await all(
      c.env.DB,
      `SELECT r.*, 
         l.date AS lec_date, l.lecture_no AS lec_no,
         sub.code AS sub_code,
         req_u.name AS requester_name,
         stu.roll_no AS student_roll,
         stu_u.name AS student_name
       FROM attendance_change_requests r
       LEFT JOIN lectures l ON l.id = r.lecture_id
       LEFT JOIN subjects sub ON sub.id = l.subject_id
       LEFT JOIN users req_u ON req_u.id = r.requested_by
       LEFT JOIN students st ON st.id = r.student_id
       LEFT JOIN users stu_u ON stu_u.id = st.user_id
       ORDER BY r.created_at DESC`
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        lectures: {
          date: r.lec_date,
          lecture_no: r.lec_no,
          subjects: { code: r.sub_code },
        },
        requester: { name: r.requester_name },
        students: { roll_no: r.student_roll, users: { name: r.student_name } },
      }))
    );
  });

  app.patch('/api/attendance_change_requests/:id', requireAuth('hod'), async (c) => {
    const b = (await c.req.json()) as { status?: string; apply_attendance?: boolean; reviewer_id?: string };
    const u = c.get('user')!;
    const reqId = c.req.param('id');
    const existing = await row<{
      lecture_id: string;
      student_id: string;
      requested_status: string;
    }>(c.env.DB, `SELECT lecture_id, student_id, requested_status FROM attendance_change_requests WHERE id = ?`, reqId);
    if (b.apply_attendance && b.status === 'approved' && existing) {
      await c.env.DB
        .prepare(
          `UPDATE attendance SET status = ?, edited_by = ?, edited_at = datetime('now') WHERE lecture_id = ? AND student_id = ?`
        )
        .bind(existing.requested_status, u.sub, existing.lecture_id, existing.student_id)
        .run();
    }
    await c.env.DB
      .prepare(
        `UPDATE attendance_change_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
      )
      .bind(b.status, u.sub, reqId)
      .run();
    return c.json({ ok: true });
  });

  app.get('/api/attendance_condonation', requireAuth(), async (c) => {
    const studentId = c.req.query('student_id');
    const teacherId = c.req.query('teacher_id');
    const requestedBy = c.req.query('requested_by');
    const branch = c.req.query('branch');
    const sem = c.req.query('sem');
    let sql = `SELECT ac.*,
      s.code AS subject_code,
      s.name AS subject_name,
      st.roll_no AS student_roll_no,
      su.name AS student_user_name,
      ru.name AS requested_by_name
      FROM attendance_condonation ac
      LEFT JOIN subjects s ON s.id = ac.subject_id
      LEFT JOIN students st ON st.id = ac.student_id
      LEFT JOIN users su ON su.id = st.user_id
      LEFT JOIN users ru ON ru.id = ac.requested_by
      WHERE 1=1`;
    const args: unknown[] = [];
    if (studentId) {
      sql += ` AND ac.student_id = ?`;
      args.push(studentId);
    }
    if (requestedBy) {
      sql += ` AND ac.requested_by = ?`;
      args.push(requestedBy);
    }
    if (branch) {
      sql += ` AND ac.branch_name = ?`;
      args.push(branch);
    }
    if (sem) {
      sql += ` AND ac.sem = ?`;
      args.push(parseInt(sem, 10));
    }
    if (teacherId) {
      sql += ` AND EXISTS (SELECT 1 FROM subject_assignments sa WHERE sa.subject_id = ac.subject_id AND sa.teacher_id = ?)`;
      args.push(teacherId);
    }
    sql += ` ORDER BY ac.created_at DESC`;
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        subjects: { code: r.subject_code, name: r.subject_name },
        students: { roll_no: r.student_roll_no, users: { name: r.student_user_name } },
        requested_by_user: { name: r.requested_by_name },
      }))
    );
  });

  app.post('/api/attendance_condonation', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const cid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO attendance_condonation (id, student_id, subject_id, branch_name, sem, lectures_condoned, reason, document_url, requested_by, teacher_confirmed_by, status, academic_year)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        cid,
        b.student_id,
        b.subject_id,
        b.branch_name,
        b.sem,
        b.lectures_condoned,
        b.reason,
        b.document_url || null,
        b.requested_by,
        b.teacher_confirmed_by || null,
        b.status || 'pending',
        b.academic_year
      )
      .run();
    return c.json({ id: cid });
  });

  app.patch('/api/attendance_condonation/:id', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of ['status', 'teacher_confirmed_by', 'approved_by']) {
      if (k in b) {
        sets.push(`${k} = ?`);
        vals.push(b[k]);
      }
    }
    if (!sets.length) return c.json({ ok: true });
    vals.push(c.req.param('id'));
    await c.env.DB.prepare(`UPDATE attendance_condonation SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return c.json({ ok: true });
  });

  app.get('/api/ct_marks', requireAuth(), async (c) => {
    const studentId = c.req.query('student_id');
    const subjectId = c.req.query('subject_id');
    const testName = c.req.query('test_name');
    if (subjectId && testName && !studentId) {
      const detail = await all(
        c.env.DB,
        `SELECT cm.marks_obtained, cm.max_marks, cm.created_at, st.roll_no, u.name AS student_name
         FROM ct_marks cm
         JOIN students st ON st.id = cm.student_id
         JOIN users u ON u.id = st.user_id
         WHERE cm.subject_id = ? AND cm.test_name = ?`,
        subjectId,
        testName
      );
      return c.json(
        detail.map((d: Record<string, unknown>) => ({
          marks_obtained: d.marks_obtained,
          max_marks: d.max_marks,
          created_at: d.created_at,
          students: { roll_no: d.roll_no, users: { name: d.student_name } },
        }))
      );
    }
    let sql = `SELECT cm.*, s.code, s.name FROM ct_marks cm JOIN subjects s ON s.id = cm.subject_id WHERE 1=1`;
    const args: unknown[] = [];
    if (studentId) {
      sql += ` AND cm.student_id = ?`;
      args.push(studentId);
    }
    if (subjectId) {
      sql += ` AND cm.subject_id = ?`;
      args.push(subjectId);
    }
    if (testName) {
      sql += ` AND cm.test_name = ?`;
      args.push(testName);
    }
    sql += ` ORDER BY cm.created_at DESC`;
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        subjects: { code: r.code, name: r.name },
      }))
    );
  });

  app.post('/api/ct_marks/upsert', requireAuth('hod', 'admin'), async (c) => {
    const body = (await c.req.json()) as { rows: Record<string, unknown>[] };
    const batch = body.rows.map((r) =>
      c.env.DB
        .prepare(
          `INSERT INTO ct_marks (id, student_id, subject_id, test_name, marks_obtained, max_marks, academic_year, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(student_id, subject_id, test_name, academic_year) DO UPDATE SET
             marks_obtained = excluded.marks_obtained, 
             max_marks = excluded.max_marks, 
             uploaded_by = excluded.uploaded_by
           WHERE julianday('now') - julianday(created_at) <= 7`
        )
        .bind(
          id(),
          r.student_id,
          r.subject_id,
          r.test_name,
          r.marks_obtained,
          r.max_marks,
          r.academic_year,
          r.uploaded_by || null
        )
    );
    await c.env.DB.batch(batch);
    return c.json({ ok: true });
  });

  app.get('/api/endsem_marks', requireAuth(), async (c) => {
    const studentId = c.req.query('student_id');
    let sql = `SELECT em.*, s.code as scode, s.name as sname FROM endsem_marks em 
      JOIN subjects s ON s.id = em.subject_id WHERE 1=1`;
    const args: unknown[] = [];
    if (studentId) {
      sql += ` AND em.student_id = ?`;
      args.push(studentId);
    }
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        subjects: { code: r.scode, name: r.sname },
      }))
    );
  });

  app.patch('/api/endsem_marks/group', requireAuth('hod', 'admin'), async (c) => {
    const b = (await c.req.json()) as {
      subject_id: string;
      academic_year: string;
      sem: number;
      poll_open?: boolean;
      is_locked?: boolean;
      verified_by?: string | null;
    };
    if (b.poll_open !== undefined) {
      await c.env.DB
        .prepare(
          `UPDATE endsem_marks SET poll_open = ? WHERE subject_id = ? AND academic_year = ? AND sem = ?`
        )
        .bind(b.poll_open ? 1 : 0, b.subject_id, b.academic_year, b.sem)
        .run();
    }
    if (b.is_locked) {
      await c.env.DB
        .prepare(
          `UPDATE endsem_marks SET is_locked = 1, verified_by = ? WHERE subject_id = ? AND academic_year = ? AND sem = ?`
        )
        .bind(b.verified_by || null, b.subject_id, b.academic_year, b.sem)
        .run();
    }
    return c.json({ ok: true });
  });

  app.patch('/api/endsem_marks', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    await c.env.DB
      .prepare(
        `UPDATE endsem_marks SET marks = ?, submitted_by = ?, is_locked = COALESCE(?, is_locked), poll_open = COALESCE(?, poll_open), verified_by = COALESCE(?, verified_by) WHERE id = ?`
      )
      .bind(
        b.marks,
        b.submitted_by,
        b.is_locked === undefined ? null : b.is_locked ? 1 : 0,
        b.poll_open === undefined ? null : b.poll_open ? 1 : 0,
        b.verified_by ?? null,
        b.id
      )
      .run();
    return c.json({ ok: true });
  });

  app.post('/api/endsem_marks', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const eid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO endsem_marks (id, student_id, subject_id, sem, marks, submitted_by, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(eid, b.student_id, b.subject_id, b.sem, b.marks, b.submitted_by, b.academic_year)
      .run();
    return c.json({ id: eid });
  });

  app.post('/api/endsem_marks/initialize', requireAuth('hod', 'admin'), async (c) => {
    const b = (await c.req.json()) as { branch: string; sem: number; subject_id: string; academic_year: string };
    const u = c.get('user')!;

    // 1. Get all students for the branch/sem
    const students = await all<{ id: string }>(
      c.env.DB, 
      `SELECT id FROM students WHERE branch = ? AND sem = ?`, 
      b.branch, 
      b.sem
    );

    if (!students.length) return c.json({ error: 'No students found for this branch/sem' }, 404);

    // 2. Insert records for all students using batch
    const stmts = students.map(s => 
      c.env.DB.prepare(
        `INSERT INTO endsem_marks (id, student_id, subject_id, sem, academic_year, poll_open) 
         VALUES (?, ?, ?, ?, ?, 1)
         ON CONFLICT(student_id, subject_id, academic_year) DO UPDATE SET poll_open = 1`
      ).bind(id(), s.id, b.subject_id, b.sem, b.academic_year)
    );

    await c.env.DB.batch(stmts);
    return c.json({ ok: true, count: students.length });
  });

  app.get('/api/teachers', requireAuth(), async (c) => {

    const u = c.get('user');
    const exclude = c.req.query('exclude') || u?.sub || '';
    const rows = await all(
      c.env.DB,
      `SELECT id, name, college_id FROM users WHERE role = 'teacher' AND is_active = 1 AND id != ?`,
      exclude
    );
    return c.json(rows);
  });

  app.get('/api/count/:table', requireAuth(), async (c) => {
    const t = c.req.param('table') || '';
    const allowed = ['students', 'users', 'subjects', 'notices', 'lectures', 'attendance', 'ct_marks'];
    if (!allowed.includes(t)) return c.json({ error: 'Invalid table' }, 400);
    const r = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM ${t}`).first<{ c: number }>();
    return c.json({ count: r?.c || 0 });
  });

  app.post('/api/bulk_upload_logs', requireAuth(), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    const lid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO bulk_upload_logs (id, uploaded_by, file_name, type, status, errors_json) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        lid,
        u.sub,
        b.file_name,
        b.type || 'marks',
        b.status || 'success',
        typeof b.errors_json === 'string' ? b.errors_json : JSON.stringify(b.errors_json || null)
      )
      .run();
    return c.json({ id: lid });
  });

  app.get('/api/semester_transitions', requireAuth('admin'), async (c) => {
    const rows = await all(
      c.env.DB,
      `SELECT t.*, u.name AS triggered_by_name FROM semester_transitions t LEFT JOIN users u ON u.id = t.triggered_by ORDER BY t.created_at DESC`
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        users: { name: r.triggered_by_name },
      }))
    );
  });

  app.post('/api/semester_transitions', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as Record<string, unknown>;
    const u = c.get('user');
    if (!u) return c.json({ error: 'Unauthorized' }, 401);
    const tid = id();
    await c.env.DB
      .prepare(
        `INSERT INTO semester_transitions (id, triggered_by, branch, old_sem, new_sem, affected_students) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(tid, u.sub, b.branch as string, b.old_sem, b.new_sem, b.affected_students)
      .run();
    return c.json({ id: tid });
  });

  app.post('/api/admin/promote-semester', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as { branch: string; old_sem: number; new_sem: number };
    const res = await c.env.DB
      .prepare(`UPDATE students SET sem = ? WHERE branch = ? AND sem = ?`)
      .bind(b.new_sem, b.branch, b.old_sem)
      .run();
    return c.json({ ok: true, changes: res.meta?.changes ?? 0 });
  });

  /* Archive & health */
  app.get('/api/archive_log', requireAuth('admin', 'hod'), async (c) => {
    const rows = await all(
      c.env.DB,
      `SELECT a.*, u.name as archiver_name FROM archive_log a LEFT JOIN users u ON u.id = a.archived_by ORDER BY a.created_at DESC`
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        users: { name: r.archiver_name },
      }))
    );
  });

  app.get('/api/semester_summary', requireAuth(), async (c) => {
    const rows = await all(
      c.env.DB,
      `SELECT ss.*, s.roll_no, s.branch as student_branch, u.name as student_name, sub.code as subject_code, sub.name as subject_name
       FROM semester_summary ss
       JOIN students s ON s.id = ss.student_id
       JOIN users u ON u.id = s.user_id
       JOIN subjects sub ON sub.id = ss.subject_id
       ORDER BY ss.archived_at DESC`
    );
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        students: {
          roll_no: r.roll_no,
          branch: r.student_branch,
          users: { name: r.student_name },
        },
        subjects: { code: r.subject_code, name: r.subject_name },
      }))
    );
  });

  app.get('/api/health/db-stats', requireAuth('admin'), async (c) => {
    const tables = ['attendance', 'lectures', 'ct_marks'];
    const out: Record<string, number> = {};
    for (const t of tables) {
      const r = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM ${t}`).first<{ c: number }>();
      out[t] = r?.c || 0;
    }
    return c.json(out);
  });

  app.get('/api/stats/admin-summary', requireAuth('admin'), async (c) => {
    const r = await row<{
      students: number;
      teachers: number;
      subjects: number;
      notices: number;
    }>(
      c.env.DB,
      `SELECT
        (SELECT COUNT(*) FROM students) AS students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND deleted_at IS NULL AND is_active = 1) AS teachers,
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM notices WHERE is_active = 1) AS notices`
    );
    return c.json(r || { students: 0, teachers: 0, subjects: 0, notices: 0 });
  });

  app.get('/api/stats/hod-summary', requireAuth('hod', 'admin'), async (c) => {
    const r = await row<{
      students: number;
      subjects: number;
      pending_leaves: number;
      pending_condonation: number;
    }>(
      c.env.DB,
      `SELECT
        (SELECT COUNT(*) FROM students) AS students,
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM leave_requests WHERE status = 'pending') AS pending_leaves,
        (SELECT COUNT(*) FROM attendance_condonation WHERE status IN ('pending','teacher_review')) AS pending_condonation`
    );
    return c.json(
      r || { students: 0, subjects: 0, pending_leaves: 0, pending_condonation: 0 }
    );
  });

  app.get('/api/bulk_upload_logs', requireAuth('admin'), async (c) => {
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const type = c.req.query('type');
    let sql = `SELECT b.*, u.name AS uploader_name FROM bulk_upload_logs b LEFT JOIN users u ON u.id = b.uploaded_by WHERE 1=1`;
    const args: unknown[] = [];
    if (type) {
      sql += ` AND b.type = ?`;
      args.push(type);
    }
    sql += ` ORDER BY b.created_at DESC LIMIT ?`;
    args.push(limit);
    const rows = await all(c.env.DB, sql, ...args);
    return c.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        users: { name: r.uploader_name },
      }))
    );
  });

  /* Multi-purpose lecture finder */
  app.get('/api/lectures/find', requireAuth(), async (c) => {
    const subjectId = c.req.query('subject_id')!;
    const date = c.req.query('date')!;
    const lectureNo = parseInt(c.req.query('lecture_no') || '0', 10);
    const r = await row(
      c.env.DB,
      `SELECT id, blank_means FROM lectures WHERE subject_id = ? AND date = ? AND lecture_no = ?`,
      subjectId,
      date,
      lectureNo
    );
    return c.json(r);
  });

  app.get('/api/student/for-user/:userId', requireAuth(), async (c) => {
    const r = await row(c.env.DB, `SELECT * FROM students WHERE user_id = ?`, c.req.param('userId'));
    return c.json(r);
  });

  /* Archive semester — D1 APIs (replaces exec_sql / storage) */
  app.get('/api/archive/preview', requireAuth('admin'), async (c) => {
    const branch = c.req.query('branch');
    const sem = parseInt(c.req.query('sem') || '', 10);
    const year = c.req.query('year');
    if (!branch || !sem || !year) return c.json({ error: 'branch, sem, year required' }, 400);

    const studR = await c.env.DB
      .prepare(`SELECT COUNT(*) as c FROM students WHERE branch = ? AND sem = ?`)
      .bind(branch, sem)
      .first<{ c: number }>();
    const subR = await c.env.DB
      .prepare(`SELECT COUNT(*) as c FROM subjects WHERE branch = ? AND sem = ?`)
      .bind(branch, sem)
      .first<{ c: number }>();
    const lecR = await c.env.DB
      .prepare(
        `SELECT COUNT(*) as c FROM lectures l
         JOIN subjects sub ON sub.id = l.subject_id
         WHERE l.sem = ? AND l.academic_year = ? AND sub.branch = ? AND sub.sem = ?`
      )
      .bind(sem, year, branch, sem)
      .first<{ c: number }>();
    const attR = await c.env.DB
      .prepare(
        `SELECT COUNT(*) as c FROM attendance a
         JOIN lectures l ON l.id = a.lecture_id
         JOIN students s ON s.id = a.student_id
         JOIN subjects sub ON sub.id = l.subject_id
         WHERE a.academic_year = ? AND l.sem = ? AND l.academic_year = ?
           AND sub.branch = ? AND sub.sem = ? AND s.branch = ? AND s.sem = ?`
      )
      .bind(year, sem, year, branch, sem, branch, sem)
      .first<{ c: number }>();

    const existing = await row<{ created_at: string; status: string }>(
      c.env.DB,
      `SELECT created_at, status FROM archive_log WHERE branch = ? AND sem = ? AND academic_year = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
      branch,
      sem,
      year
    );

    const students = studR?.c ?? 0;
    const subjects = subR?.c ?? 0;
    const lectures = lecR?.c ?? 0;
    const attendance = attR?.c ?? 0;
    const estimatedMB = Math.round((attendance + lectures) * 0.0002);

    return c.json({
      students,
      subjects,
      lectures,
      attendance,
      estimatedMB,
      existingLog: existing,
    });
  });

  app.get('/api/archive/wizard-data', requireAuth('admin'), async (c) => {
    const branch = c.req.query('branch');
    const sem = parseInt(c.req.query('sem') || '', 10);
    const year = c.req.query('year');
    if (!branch || !sem || !year) return c.json({ error: 'branch, sem, year required' }, 400);

    const attendanceRows = await all(
      c.env.DB,
      `SELECT s.roll_no, u.name as student_name, sub.code as subject_code,
              sub.name as subject_name, l.date, l.lecture_no, a.status, a.remarks, a.created_at
       FROM attendance a
       JOIN lectures l ON l.id = a.lecture_id
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = s.user_id
       JOIN subjects sub ON sub.id = l.subject_id
       WHERE l.sem = ? AND a.academic_year = ? AND s.branch = ?
         AND sub.branch = ? AND sub.sem = ?
       ORDER BY s.roll_no, sub.code, l.date, l.lecture_no`,
      sem,
      year,
      branch,
      branch,
      sem
    );

    const ctMarksRows = await all(
      c.env.DB,
      `SELECT s.roll_no, u.name as student_name, sub.code as subject_code, sub.name as subject_name,
              cm.test_name, cm.marks_obtained, cm.max_marks, cm.academic_year
       FROM ct_marks cm
       JOIN students s ON s.id = cm.student_id
       JOIN users u ON u.id = s.user_id
       JOIN subjects sub ON sub.id = cm.subject_id
       WHERE cm.academic_year = ? AND s.branch = ? AND s.sem = ?`,
      year,
      branch,
      sem
    );

    const condonationRows = await all(
      c.env.DB,
      `SELECT s.roll_no, u.name as student_name, sub.code as subject_code,
              ac.lectures_condoned, ac.reason, ac.status, ac.created_at
       FROM attendance_condonation ac
       JOIN students s ON s.id = ac.student_id
       JOIN users u ON u.id = s.user_id
       JOIN subjects sub ON sub.id = ac.subject_id
       WHERE ac.sem = ? AND ac.academic_year = ? AND s.branch = ?`,
      sem,
      year,
      branch
    );

    return c.json({ attendance: attendanceRows, ctMarks: ctMarksRows, condonation: condonationRows });
  });

  app.post('/api/archive/semester_summary/batch', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as { rows?: Record<string, unknown>[] };
    const rows = b.rows || [];
    if (!rows.length) return c.json({ ok: true, upserted: 0 });
    const stmts: any[] = [];
    for (const r of rows) {
      const rowId = (r.id as string) || id();
      stmts.push(
        c.env.DB
          .prepare(
            `INSERT INTO semester_summary (id, student_id, subject_id, sem, academic_year, total_lectures, present, absent, late, excused, condoned, raw_percent, final_percent, archive_file_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(student_id, subject_id, sem, academic_year) DO UPDATE SET
               total_lectures = excluded.total_lectures,
               present = excluded.present,
               absent = excluded.absent,
               late = excluded.late,
               excused = excluded.excused,
               condoned = excluded.condoned,
               raw_percent = excluded.raw_percent,
               final_percent = excluded.final_percent,
               archived_at = datetime('now'),
               archive_file_url = excluded.archive_file_url`
          )
          .bind(
            rowId,
            r.student_id,
            r.subject_id,
            r.sem,
            r.academic_year,
            r.total_lectures,
            r.present,
            r.absent,
            r.late ?? 0,
            r.excused ?? 0,
            r.condoned ?? 0,
            r.raw_percent,
            r.final_percent,
            r.archive_file_url ?? null
          )
      );
    }
    await c.env.DB.batch(stmts);
    return c.json({ ok: true, upserted: rows.length });
  });

  app.post('/api/archive/delete-raw', requireAuth('admin'), async (c) => {
    const b = (await c.req.json()) as { branch?: string; sem?: number; year?: string };
    if (!b.branch || b.sem == null || !b.year) return c.json({ error: 'branch, sem, year required' }, 400);

    const subIds = await all<{ id: string }>(
      c.env.DB,
      `SELECT id FROM subjects WHERE branch = ? AND sem = ?`,
      b.branch,
      b.sem
    );
    if (!subIds.length) {
      return c.json({ deletedAttendance: 0, deletedLectures: 0 });
    }
    const placeholders = subIds.map(() => '?').join(',');
    const lecRows = await all<{ id: string }>(
      c.env.DB,
      `SELECT id FROM lectures WHERE sem = ? AND academic_year = ? AND subject_id IN (${placeholders})`,
      b.sem,
      b.year,
      ...subIds.map((r) => r.id)
    );
    const lecIds = lecRows.map((x) => x.id);
    if (!lecIds.length) {
      return c.json({ deletedAttendance: 0, deletedLectures: 0 });
    }
    const lp = lecIds.map(() => '?').join(',');

    const delAtt = await c.env.DB
      .prepare(`DELETE FROM attendance WHERE academic_year = ? AND lecture_id IN (${lp})`)
      .bind(b.year, ...lecIds)
      .run();
    const delLec = await c.env.DB
      .prepare(`DELETE FROM lectures WHERE id IN (${lp})`)
      .bind(...lecIds)
      .run();

    return c.json({
      deletedAttendance: delAtt.meta?.rows_written ?? delAtt.meta?.changes ?? 0,
      deletedLectures: delLec.meta?.rows_written ?? delLec.meta?.changes ?? 0,
    });
  });

  /* File upload (optional R2) */
  /* ─── Manual initialization ─── */
  app.get('/api/manual-attendance-init', requireAuth(), async (c) => {
    const teacherId = c.req.query('teacher_id');
    const subjectId = c.req.query('subject_id');
    const branch = c.req.query('branch_name');
    const sem = c.req.query('sem');
    const academicYear = c.req.query('academic_year');

    if (branch && sem) {
      const masters = await all(c.env.DB, 
        `SELECT * FROM manual_attendance_init WHERE branch_name = ? AND sem = ?`, 
        branch, parseInt(sem, 10)
      );
      if (!masters.length) return c.json([]);
      
      const counts = await all(c.env.DB, 
        `SELECT * FROM manual_student_attendance_init WHERE init_id IN (${masters.map(() => '?').join(',')})`,
        ...masters.map(m => m.id)
      );
      
      return c.json(masters.map(m => ({
        ...m,
        student_counts: counts.filter(co => co.init_id === m.id)
      })));
    }

    let sql = `SELECT * FROM manual_attendance_init WHERE 1=1`;
    const args: any[] = [];
    if (teacherId) { sql += ` AND teacher_id = ?`; args.push(teacherId); }
    if (subjectId) { sql += ` AND subject_id = ?`; args.push(subjectId); }
    if (branch) { sql += ` AND branch_name = ?`; args.push(branch); }
    if (academicYear) { sql += ` AND academic_year = ?`; args.push(academicYear); }

    const records = await all(c.env.DB, sql, ...args);
    
    if (records.length === 1 && subjectId && branch) {
      const studentCounts = await all(c.env.DB, 
        `SELECT * FROM manual_student_attendance_init WHERE init_id = ?`, 
        records[0].id
      );
      return c.json({ ...records[0], student_counts: studentCounts });
    }

    return c.json(records);
  });

  app.post('/api/manual-attendance-init', requireAuth('teacher'), async (c) => {
    const b = (await c.req.json()) as {
      subject_id: string;
      branch_name: string;
      sem: number;
      academic_year: string;
      total_lectures_init: number;
      student_counts: { student_id: string; present_count_init: number }[];
    };
    const u = c.get('user')!;
    
    const existing = await row<{ id: string }>(c.env.DB, 
      `SELECT id FROM manual_attendance_init WHERE teacher_id = ? AND subject_id = ? AND branch_name = ? AND sem = ? AND academic_year = ?`,
      u.sub, b.subject_id, b.branch_name, b.sem, b.academic_year
    );

    const rid = existing?.id || id();
    
    const queries = [
      c.env.DB.prepare(
        `INSERT INTO manual_attendance_init (id, teacher_id, subject_id, branch_name, sem, academic_year, total_lectures_init)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(teacher_id, subject_id, branch_name, sem, academic_year) 
         DO UPDATE SET total_lectures_init = excluded.total_lectures_init`
      ).bind(rid, u.sub, b.subject_id, b.branch_name, b.sem, b.academic_year, b.total_lectures_init)
    ];

    queries.push(c.env.DB.prepare(`DELETE FROM manual_student_attendance_init WHERE init_id = ?`).bind(rid));

    for (const s of b.student_counts) {
      queries.push(
        c.env.DB.prepare(
          `INSERT INTO manual_student_attendance_init (init_id, student_id, present_count_init) VALUES (?, ?, ?)`
        ).bind(rid, s.student_id, s.present_count_init)
      );
    }

    await c.env.DB.batch(queries);
    return c.json({ ok: true, id: rid });
  });

  app.post('/api/upload', requireAuth(), async (c) => {
    if (!c.env.FILES) {
      return c.json({ error: 'File storage not configured. Add R2 binding FILES in wrangler.toml.' }, 501);
    }
    const form = await c.req.formData();
    const file = form.get('file') as File | null;
    const folder = (form.get('folder') as string) || 'uploads';
    if (!file) return c.json({ error: 'No file' }, 400);
    const key = `${folder}/${id()}_${file.name}`;
    await c.env.FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    const url = new URL(`/api/files/${encodeURIComponent(key)}`, c.req.url).href;
    return c.json({ path: key, url });
  });

  app.get('/api/files/*', async (c) => {
    if (!c.env.FILES) return c.json({ error: 'Not found' }, 404);
    const key = c.req.path.replace(/^\/api\/files\//, '');
    const obj = await c.env.FILES.get(decodeURIComponent(key));
    if (!obj) return c.json({ error: 'Not found' }, 404);
    return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream' } });
  });

  /* ─── Maintenance ─── */
  app.post('/api/maintenance/reset-attendance', requireAuth('admin'), async (c) => {
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(`DELETE FROM attendance`),
        c.env.DB.prepare(`DELETE FROM lectures`),
        c.env.DB.prepare(`DELETE FROM manual_student_attendance_init`),
        c.env.DB.prepare(`DELETE FROM manual_attendance_init`),
        c.env.DB.prepare(`DELETE FROM attendance_condonation`),
      ]);
      return c.json({ ok: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });
}
