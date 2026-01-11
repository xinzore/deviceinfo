import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const SETTINGS_KEY = 'site:settings';
const setCacheHeaders = (c: any, value: string) => {
  c.header('Cache-Control', value);
};

const requireAdmin = async (c: any) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { error: c.text('Unauthorized', 401) };
  }

  const userProfile = await kv.get(`user:${user.id}`);
  if (!userProfile || userProfile.role !== 'admin') {
    return { error: c.text('Forbidden - Admin only', 403) };
  }

  return { user, userProfile };
};

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-ac750b50/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-ac750b50/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      return c.text(error.message, 400);
    }

    // Create user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Signup error:', error);
    return c.text(String(error), 500);
  }
});

// Get all approved phones
app.get("/make-server-ac750b50/phones", async (c) => {
  try {
    const approvedIds = await kv.get('phones:approved') || [];
    const normalizedIds = approvedIds
      .filter((id: any) => typeof id === 'string' && id.length > 0);
    if (normalizedIds.length === 0) {
      return c.json([]);
    }
    const phones = await kv.mget(normalizedIds.map((id: string) => `phone:${id}`));
    setCacheHeaders(c, 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    return c.json(phones.filter(Boolean));
  } catch (error) {
    console.log('Get phones error:', error);
    return c.text(String(error), 500);
  }
});

const turkishCharMap: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

const replaceTurkishChars = (value: string) =>
  value.replace(/[çğıİöşü]/gi, (char) => turkishCharMap[char] || char);

const slugify = (value: string) =>
  replaceTurkishChars(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildPhoneSlug = (phone: { brand?: string; title?: string }) =>
  slugify(`${phone?.brand ?? ''} ${phone?.title ?? ''}`.trim());

const normalizeCategory = (value?: string) => (value || 'Telefon').trim().toLowerCase();

// Get latest phones by category (public)
app.get("/make-server-ac750b50/phones/latest", async (c) => {
  try {
    const category = c.req.query('category') || 'Telefon';
    const limit = Number(c.req.query('limit') || '6');
    const approvedIds = await kv.get('phones:approved') || [];
    const normalizedIds = approvedIds.filter((id: any) => typeof id === 'string' && id.length > 0);
    if (normalizedIds.length === 0) {
      return c.json([]);
    }
    const phones = await kv.mget(normalizedIds.map((id: string) => `phone:${id}`));
    const filtered = phones
      .filter(Boolean)
      .filter((phone: any) => normalizeCategory(phone.category) === normalizeCategory(category))
      .sort((a: any, b: any) =>
        new Date(b?.submittedAt || 0).getTime() - new Date(a?.submittedAt || 0).getTime()
      )
      .slice(0, Math.max(limit, 0));
    setCacheHeaders(c, 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
    return c.json(filtered);
  } catch (error) {
    console.log('Get latest phones error:', error);
    return c.text(String(error), 500);
  }
});

// Get phone summary list (public)
app.get("/make-server-ac750b50/phones/summary", async (c) => {
  try {
    const approvedIds = await kv.get('phones:approved') || [];
    const normalizedIds = approvedIds.filter((id: any) => typeof id === 'string' && id.length > 0);
    if (normalizedIds.length === 0) {
      return c.json([]);
    }
    const phones = await kv.mget(normalizedIds.map((id: string) => `phone:${id}`));
    const settings = await kv.get(SETTINGS_KEY) || {};
    const filterFields = Array.isArray(settings.filterFields) ? settings.filterFields : [];
    const summary = phones
      .filter(Boolean)
      .map((phone: any) => ({
        id: phone.id,
        brand: phone.brand,
        title: phone.title,
        images: phone.images || [],
        category: phone.category,
        price: phone.price,
        submittedAt: phone.submittedAt,
        filters: filterFields.reduce((acc: Record<string, unknown>, field: any) => {
          const sectionId = field?.sectionId;
          const fieldKey = field?.fieldKey;
          if (!sectionId || !fieldKey) return acc;
          const value = phone?.specs?.sections?.[sectionId]?.[fieldKey];
          if (value !== undefined && value !== null && value !== '') {
            acc[`${sectionId}:${fieldKey}`] = value;
          }
          return acc;
        }, {}),
      }));
    setCacheHeaders(c, 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
    return c.json(summary);
  } catch (error) {
    console.log('Get phone summary error:', error);
    return c.text(String(error), 500);
  }
});

// Resolve phone by slug (public)
app.get("/make-server-ac750b50/phones/slug/:slug", async (c) => {
  try {
    const slug = c.req.param('slug');
    const approvedIds = await kv.get('phones:approved') || [];
    const normalizedIds = approvedIds.filter((id: any) => typeof id === 'string' && id.length > 0);
    if (normalizedIds.length === 0) {
      return c.text('Phone not found', 404);
    }
    const phones = await kv.mget(normalizedIds.map((id: string) => `phone:${id}`));
    const match = phones.find((phone: any) => phone && buildPhoneSlug(phone) === slug);
    if (!match) {
      return c.text('Phone not found', 404);
    }
    setCacheHeaders(c, 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
    return c.json(match);
  } catch (error) {
    console.log('Get phone by slug error:', error);
    return c.text(String(error), 500);
  }
});

// Get single phone
app.get("/make-server-ac750b50/phones/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const phone = await kv.get(`phone:${id}`);

    if (!phone) {
      return c.text('Phone not found', 404);
    }

    return c.json(phone);
  } catch (error) {
    console.log('Get phone error:', error);
    return c.text(String(error), 500);
  }
});

// Get phone comments (public)
app.get("/make-server-ac750b50/phones/:id/comments", async (c) => {
  try {
    const id = c.req.param('id');
    const comments = await kv.get(`phone:${id}:comments`) || [];
    return c.json(comments);
  } catch (error) {
    console.log('Get comments error:', error);
    return c.text(String(error), 500);
  }
});

// Add phone comment (requires auth)
app.post("/make-server-ac750b50/phones/:id/comments", async (c) => {
  try {
    const id = c.req.param('id');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.text('Unauthorized', 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile?.status === 'banned') {
      return c.text('User is banned', 403);
    }

    const payload = await c.req.json();
    const message = String(payload?.message || '').trim();
    if (!message) {
      return c.text('Message required', 400);
    }
    if (message.length > 500) {
      return c.text('Message too long', 400);
    }

    const entry = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: userProfile?.name || user.user_metadata?.name || user.email,
      message,
      createdAt: new Date().toISOString(),
    };

    const key = `phone:${id}:comments`;
    const existing = await kv.get(key) || [];
    const next = [entry, ...existing].slice(0, 200);
    await kv.set(key, next);

    return c.json({ success: true, comment: entry });
  } catch (error) {
    console.log('Add comment error:', error);
    return c.text(String(error), 500);
  }
});

// Get phone ratings (public)
app.get("/make-server-ac750b50/phones/:id/ratings", async (c) => {
  try {
    const id = c.req.param('id');
    const ratings = await kv.get(`phone:${id}:ratings`) || [];
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return c.json({ average: 0, count: 0 });
    }
    const total = ratings.reduce((sum: number, item: any) => sum + Number(item?.score || 0), 0);
    const count = ratings.length;
    const average = count === 0 ? 0 : Math.round((total / count) * 10) / 10;
    return c.json({ average, count });
  } catch (error) {
    console.log('Get ratings error:', error);
    return c.text(String(error), 500);
  }
});

// Add/update phone rating (requires auth)
app.post("/make-server-ac750b50/phones/:id/ratings", async (c) => {
  try {
    const id = c.req.param('id');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.text('Unauthorized', 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile?.status === 'banned') {
      return c.text('User is banned', 403);
    }

    const payload = await c.req.json();
    const scoreRaw = Number(payload?.score);
    if (!Number.isFinite(scoreRaw)) {
      return c.text('Score required', 400);
    }
    const score = Math.min(100, Math.max(0, Math.round(scoreRaw)));

    const key = `phone:${id}:ratings`;
    const existing = await kv.get(key) || [];
    const existingList = Array.isArray(existing) ? existing : [];
    const alreadyRated = existingList.find((entry: any) => entry?.userId === user.id);
    if (alreadyRated) {
      return c.text('Already rated', 409);
    }
    const entry = {
      userId: user.id,
      score,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...existingList].slice(0, 500);
    await kv.set(key, next);

    const total = next.reduce((sum: number, item: any) => sum + Number(item?.score || 0), 0);
    const count = next.length;
    const average = count === 0 ? 0 : Math.round((total / count) * 10) / 10;
    return c.json({ success: true, average, count, score });
  } catch (error) {
    console.log('Add rating error:', error);
    return c.text(String(error), 500);
  }
});

// Get current user's rating (requires auth)
app.get("/make-server-ac750b50/phones/:id/ratings/me", async (c) => {
  try {
    const id = c.req.param('id');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.text('Unauthorized', 401);
    }

    const ratings = await kv.get(`phone:${id}:ratings`) || [];
    const list = Array.isArray(ratings) ? ratings : [];
    const match = list.find((entry: any) => entry?.userId === user.id);
    return c.json({ score: match?.score ?? null });
  } catch (error) {
    console.log('Get my rating error:', error);
    return c.text(String(error), 500);
  }
});

// Delete phone comment (admin only)
app.delete("/make-server-ac750b50/admin/phones/:id/comments/:commentId", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const id = c.req.param('id');
    const commentId = c.req.param('commentId');
    const key = `phone:${id}:comments`;
    const existing = await kv.get(key) || [];
    const next = existing.filter((entry: any) => entry?.id !== commentId);
    await kv.set(key, next);
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete comment error:', error);
    return c.text(String(error), 500);
  }
});

// Submit new phone (requires auth)
app.post("/make-server-ac750b50/phones", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.text('Unauthorized', 401);
    }

    const phoneData = await c.req.json();
    const id = crypto.randomUUID();

    // Check if user is admin
    const userProfile = await kv.get(`user:${user.id}`);
    const isAdmin = userProfile && userProfile.role === 'admin';

    // Auto-approve if admin
    const status = (isAdmin && phoneData.autoApprove) ? 'approved' : 'pending';

    const phone = {
      id,
      ...phoneData,
      status,
      submittedBy: user.id,
      submittedAt: new Date().toISOString(),
      ...(status === 'approved' && {
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString()
      })
    };

    await kv.set(`phone:${id}`, phone);

    if (status === 'approved') {
      // Add to approved list
      const approved = await kv.get('phones:approved') || [];
      approved.push(id);
      await kv.set('phones:approved', approved);
    } else {
      // Add to pending list
      const pending = await kv.get('phones:pending') || [];
      pending.push(id);
      await kv.set('phones:pending', pending);
    }

    return c.json({ success: true, phone });
  } catch (error) {
    console.log('Submit phone error:', error);
    return c.text(String(error), 500);
  }
});

// Get pending phones (admin only)
app.get("/make-server-ac750b50/admin/phones/pending", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.text('Unauthorized', 401);
    }

    // Check if user is admin
    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile || userProfile.role !== 'admin') {
      return c.text('Forbidden - Admin only', 403);
    }

    const pendingIds = await kv.get('phones:pending') || [];
    const phones = await kv.mget(pendingIds.map((id: string) => `phone:${id}`));
    return c.json(phones.filter(Boolean));
  } catch (error) {
    console.log('Get pending phones error:', error);
    return c.text(String(error), 500);
  }
});

// Approve/reject phone (admin only)
app.post("/make-server-ac750b50/admin/phones/:id/:action", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.text('Unauthorized', 401);
    }

    // Check if user is admin
    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile || userProfile.role !== 'admin') {
      return c.text('Forbidden - Admin only', 403);
    }

    const id = c.req.param('id');
    const action = c.req.param('action'); // 'approve' or 'reject'

    const phone = await kv.get(`phone:${id}`);
    if (!phone) {
      return c.text('Phone not found', 404);
    }

    // Update phone status
    phone.status = action === 'approve' ? 'approved' : 'rejected';
    phone.reviewedBy = user.id;
    phone.reviewedAt = new Date().toISOString();
    await kv.set(`phone:${id}`, phone);

    // Remove from pending list
    const pending = await kv.get('phones:pending') || [];
    const newPending = pending.filter((pId: string) => pId !== id);
    await kv.set('phones:pending', newPending);

    // Add to approved list if approved
    if (action === 'approve') {
      const approved = await kv.get('phones:approved') || [];
      approved.push(id);
      await kv.set('phones:approved', approved);
    }

    return c.json({ success: true, phone });
  } catch (error) {
    console.log('Approve/reject phone error:', error);
    return c.text(String(error), 500);
  }
});

// Get user profile
app.get("/make-server-ac750b50/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.text('Unauthorized', 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    return c.json(userProfile || { id: user.id, email: user.email, role: 'user' });
  } catch (error) {
    console.log('Get profile error:', error);
    return c.text(String(error), 500);
  }
});

// Get public settings
app.get("/make-server-ac750b50/settings", async (c) => {
  try {
    const settings = await kv.get(SETTINGS_KEY);
    return c.json(settings || {});
  } catch (error) {
    console.log('Get settings error:', error);
    return c.text(String(error), 500);
  }
});

// Get admin settings (admin only)
app.get("/make-server-ac750b50/admin/settings", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const settings = await kv.get(SETTINGS_KEY);
    return c.json(settings || {});
  } catch (error) {
    console.log('Get admin settings error:', error);
    return c.text(String(error), 500);
  }
});

// Update settings (admin only)
app.put("/make-server-ac750b50/admin/settings", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const settings = await c.req.json();
    await kv.set(SETTINGS_KEY, settings);
    return c.json({ success: true, settings });
  } catch (error) {
    console.log('Update settings error:', error);
    return c.text(String(error), 500);
  }
});

// Get all phones (admin only)
app.get("/make-server-ac750b50/admin/phones", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const phones = await kv.getByPrefix('phone:');
    const sorted = phones
      .filter(Boolean)
      .sort((a: any, b: any) =>
        new Date(b?.submittedAt || 0).getTime() - new Date(a?.submittedAt || 0).getTime()
      );
    return c.json(sorted);
  } catch (error) {
    console.log('Get all phones error:', error);
    return c.text(String(error), 500);
  }
});

// Update phone (admin only)
app.put("/make-server-ac750b50/admin/phones/:id", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const id = c.req.param('id');
    const updates = await c.req.json();
    const existing = await kv.get(`phone:${id}`);
    if (!existing) {
      return c.text('Phone not found', 404);
    }

    const updated = {
      ...existing,
      ...updates,
      id,
      status: existing.status,
      submittedBy: existing.submittedBy,
      submittedAt: existing.submittedAt,
      reviewedBy: existing.reviewedBy,
      reviewedAt: existing.reviewedAt,
    };

    await kv.set(`phone:${id}`, updated);
    return c.json({ success: true, phone: updated });
  } catch (error) {
    console.log('Update phone error:', error);
    return c.text(String(error), 500);
  }
});

// Delete phone (admin only)
app.delete("/make-server-ac750b50/admin/phones/:id", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const id = c.req.param('id');
    const existing = await kv.get(`phone:${id}`);
    if (!existing) {
      return c.text('Phone not found', 404);
    }

    const pending = await kv.get('phones:pending') || [];
    const approved = await kv.get('phones:approved') || [];
    await kv.set('phones:pending', pending.filter((pId: string) => pId !== id));
    await kv.set('phones:approved', approved.filter((pId: string) => pId !== id));
    await kv.del(`phone:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete phone error:', error);
    return c.text(String(error), 500);
  }
});

// Get users (admin only)
app.get("/make-server-ac750b50/admin/users", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const users = await kv.getByPrefix('user:');
    const sorted = users
      .filter(Boolean)
      .sort((a: any, b: any) =>
        new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
      );
    return c.json(sorted);
  } catch (error) {
    console.log('Get users error:', error);
    return c.text(String(error), 500);
  }
});

// Update user (admin only)
app.put("/make-server-ac750b50/admin/users/:id", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const id = c.req.param('id');
    const payload = await c.req.json();
    const existing = await kv.get(`user:${id}`);
    if (!existing) {
      return c.text('User not found', 404);
    }

    const nextRole = payload.role;
    const nextStatus = payload.status;
    const nextEmail = payload.email;
    const updates: Record<string, unknown> = {};

    if (typeof payload.name === 'string') {
      updates.name = payload.name.trim();
    }
    if (typeof nextEmail === 'string') {
      const email = nextEmail.trim();
      if (!email.includes('@')) {
        return c.text('Invalid email', 400);
      }
      if (email && email !== existing.email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(id, {
          email,
          email_confirm: true,
        });
        if (emailError) {
          console.log('Update user email error:', emailError);
          return c.text(emailError.message, 400);
        }
        updates.email = email;
      }
    }
    if (typeof nextRole === 'string' && ['admin', 'user'].includes(nextRole)) {
      updates.role = nextRole;
    }
    if (typeof nextStatus === 'string' && ['active', 'banned'].includes(nextStatus)) {
      updates.status = nextStatus;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${id}`, updated);
    return c.json({ success: true, user: updated });
  } catch (error) {
    console.log('Update user error:', error);
    return c.text(String(error), 500);
  }
});

// Ban/unban user (admin only)
app.post("/make-server-ac750b50/admin/users/:id/ban", async (c) => {
  try {
    const adminCheck = await requireAdmin(c);
    if ('error' in adminCheck) return adminCheck.error;

    const id = c.req.param('id');
    const payload = await c.req.json();
    const existing = await kv.get(`user:${id}`);
    if (!existing) {
      return c.text('User not found', 404);
    }

    const action = payload?.action === 'unban' ? 'unban' : 'ban';
    const updated = {
      ...existing,
      status: action === 'ban' ? 'banned' : 'active',
      bannedAt: action === 'ban' ? new Date().toISOString() : null,
      bannedBy: action === 'ban' ? adminCheck.user.id : null,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${id}`, updated);
    return c.json({ success: true, user: updated });
  } catch (error) {
    console.log('Ban user error:', error);
    return c.text(String(error), 500);
  }
});

// Make user admin (for initial setup - remove this in production)
app.post("/make-server-ac750b50/make-admin", async (c) => {
  try {
    const { email } = await c.req.json();

    // Find user by email
    const allUsers = await kv.getByPrefix('user:');
    const user = allUsers.find((u: any) => u.email === email);

    if (!user) {
      return c.text('User not found', 404);
    }

    user.role = 'admin';
    await kv.set(`user:${user.id}`, user);

    return c.json({ success: true, message: 'User is now admin' });
  } catch (error) {
    console.log('Make admin error:', error);
    return c.text(String(error), 500);
  }
});

Deno.serve(app.fetch);
