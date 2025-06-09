import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import bcrypt from "bcryptjs";
import jwt from "jwt-simple";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "hono/adapter";
import { verify } from "hono/jwt";

const app = new Hono();

type Bindings = {
  DB: D1Database;
  TODO_USER_SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

app.post("/api/signup", async (c) => {
  console.log("➡️  Received /api/signup request");
  const { DB, TODO_USER_SESSIONS, JWT_SECRET } = env<Bindings>(c);

  const { firstName, email, password } = await c.req.json();
  console.log("📝 Request Body:", firstName, email, password);

  if (!firstName || !email || !password) {
    return c.json({ error: "Missing fields" }, 400);
  }

  console.log("🔐 Hashing password...");

  const hashed = await bcrypt.hash(password, 10);
  
  console.log("✅ Password hashed");

  try {
    console.log("🗄️ Inserting user into database...");
    const result = await DB.prepare(
      "INSERT INTO users (first_name, email, password) VALUES (?, ?, ?)"
    ).bind(firstName, email, hashed).run();
    console.log("✅ User inserted:", result);

    const userId = result.meta.last_row_id;
    console.log("🆔 userId:", userId);

    const payload = {
      userId,
      email,
      exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
    };
    
    console.log("🔐 Encoding JWT...");
    const token = jwt.encode(payload, JWT_SECRET);
    console.log("✅ JWT token created:", token);

    console.log("💾 Storing session token in KV...");
    await TODO_USER_SESSIONS.put(token, JSON.stringify({ userId }), { expirationTtl: 3600 });
    console.log("✅ Session stored");

    console.log("🍪 Setting cookie...");
    setCookie(c, "auth_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 3600,
      sameSite: "Lax",
      secure: false,
    });
    console.log("✅ Cookie set");

    return c.json({ success: true, userId });
  } catch (err) {
    return c.json({ error: "Email already exists or insert failed." }, 500);
  }
});

// Login Route
app.post("/api/login", async (c) => {
  console.log("➡️  Received /api/login request");

  const { DB, TODO_USER_SESSIONS, JWT_SECRET } = env<Bindings>(c);
  const { email, password } = await c.req.json();

  console.log("📝 Request Body:", email, password);

  if (!email || !password) {
    console.log("❌ Missing email or password");
    return c.json({ error: "Missing fields" }, 400);
  }

  console.log("🔍 Looking up user...");
  const userResult = await DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (!userResult) {
    console.log("❌ User not found");
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const user = userResult as {
    id: number;
    first_name: string;
    email: string;
    password: string;
  };

  console.log("🔐 Verifying password...");
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    console.log("❌ Password mismatch");
    return c.json({ error: "Invalid credentials" }, 401);
  }

  console.log("✅ Password verified");

  const payload = {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  console.log("🔐 Encoding JWT...");
  const token = jwt.encode(payload, JWT_SECRET);
  console.log("✅ JWT token created:", token);

  console.log("💾 Storing session token in KV...");
  await TODO_USER_SESSIONS.put(token, JSON.stringify({ userId: user.id }), {
    expirationTtl: 3600,
  });
  console.log("✅ Session stored");

  console.log("🍪 Setting cookie...");
  setCookie(c, "auth_token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 3600,
    sameSite: "Lax",
    secure: false,
  });
  console.log("✅ Cookie set");

  return c.json({ success: true, userId: user.id });
});

// Add a new ToDo
app.post("/api/todos", async (c) => {
  console.log("➡️  Received /api/todos POST request");

  const { DB, TODO_USER_SESSIONS, JWT_SECRET } = env<Bindings>(c);

  const token = getCookie(c, "auth_token");
  if (!token) {
    console.log("❌ Missing auth_token cookie");
    return c.json({ error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = jwt.decode(token, JWT_SECRET);
    console.log("🔓 Decoded JWT:", payload);
  } catch (err) {
    console.log("❌ Invalid JWT");
    return c.json({ error: "Invalid token" }, 401);
  }

  const session = await TODO_USER_SESSIONS.get(token);
  if (!session) {
    console.log("❌ Session not found in KV");
    return c.json({ error: "Session expired" }, 401);
  }

  const { content } = await c.req.json();
  if (!content || content.trim() === "") {
    console.log("❌ Missing todo content");
    return c.json({ error: "Content is required" }, 400);
  }

  const { userId } = JSON.parse(session);
  console.log("🆔 userId:", userId);
  console.log("📝 Inserting todo into DB...");

  try {
    const result = await DB.prepare(
      "INSERT INTO todos (user_id, content) VALUES (?, ?)"
    ).bind(userId, content).run();

    console.log("✅ Todo inserted:", result.meta);

    const insertedId = result.meta.last_row_id;

    const newTodo = await DB.prepare(
      "SELECT id, content, created_at FROM todos WHERE id = ?"
      ).bind(insertedId).first();

    return c.json({ success: true, todo: newTodo });
    
  } catch (err) {
    console.log("❌ DB insert error:", err);
    return c.json({ error: "Failed to insert todo" }, 500);
  }
});

// GET All ToDos
app.get("/api/todos", async (c) => {
  console.log("➡️  Received /api/todos GET request");
  const { DB, JWT_SECRET } = env<Bindings>(c);

  const token = c.req.header("Cookie")?.split("auth_token=")[1]?.split(";")[0];
  if (!token) {
    console.log("❌ No auth_token found in cookies");
    return c.json({ error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = jwt.decode(token, JWT_SECRET);
    console.log("🔓 Decoded JWT:", payload);
  } catch (err) {
    console.log("❌ Invalid JWT:", err);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = payload.userId;
  console.log("🆔 userId:", userId);
  console.log("📥 Fetching todos from DB...");

  try {
    const { results } = await DB.prepare(
      "SELECT id, content, created_at FROM todos WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(userId).all();

    console.log("✅ Todos retrieved:", results);
    return c.json({ todos: results });
  } catch (err) {
    console.log("❌ Error fetching todos:", err);
    return c.json({ error: "Failed to fetch todos" }, 500);
  }
});


// DELETE ToDos
app.delete("/api/todos/:id", async (c) => {
  console.log("➡️  Received /api/todos DELETE request");
  const { DB, JWT_SECRET } = env<Bindings>(c);

  const todoId = c.req.param("id");
  const token = c.req.header("Cookie")?.split("auth_token=")[1]?.split(";")[0];

  if (!token) {
    console.log("❌ No auth_token found in cookies");
    return c.json({ error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = jwt.decode(token, JWT_SECRET);
    console.log("🔓 Decoded JWT:", payload);
  } catch (err) {
    console.log("❌ Invalid JWT:", err);
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = payload.userId;
  console.log("🆔 userId:", userId);
  console.log(`🗑️ Attempting to delete todo with id: ${todoId}`);

  try {
    const result = await DB.prepare(
      "DELETE FROM todos WHERE id = ? AND user_id = ?"
    ).bind(todoId, userId).run();

    if (result.meta.changes === 0) {
      console.log("⚠️ Todo not found or does not belong to user");
      return c.json({ error: "Todo not found or unauthorized" }, 404);
    }

    console.log("✅ Todo deleted");
    return c.json({ success: true });
  } catch (err) {
    console.log("❌ Error deleting todo:", err);
    return c.json({ error: "Failed to delete todo" }, 500);
  }
});

// Check User's First Name
app.get("/api/me", async (c) => {
  console.log("➡️  Received /api/me GET request");
  const { DB, JWT_SECRET } = env<Bindings>(c);

  const token = c.req.header("Cookie")?.split("auth_token=")[1]?.split(";")[0];
  if (!token) {
    console.log("❌ No auth_token found in cookies");
    return c.json({ user: null });
  }

  let payload;
  try {
    payload = jwt.decode(token, JWT_SECRET);
    console.log("🔓 Decoded JWT:", payload);
  } catch (err) {
    console.log("❌ Invalid JWT:", err);
    return c.json({ user: null });
  }

  const userId = payload.userId;
  console.log("🆔 userId:", userId);
  console.log("📥 Fetching user from DB...");

  try {
    const user = await DB.prepare(
      "SELECT id, first_name as firstname, email FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      console.log("⚠️ No user found with given ID");
      return c.json({ user: null });
    }

    console.log("✅ User found:", user.firstname);
    return c.json({ user });
  } catch (err) {
    console.log("❌ Error querying user:", err);
    return c.json({ user: null });
  }
});

app.post("/api/logout", async (c) => {
  console.log("🚪 Logging out...");

  const token = getCookie(c, "auth_token");
  if (token) {
    const { TODO_USER_SESSIONS } = env<Bindings>(c);
    await TODO_USER_SESSIONS.delete(token);
  }

  setCookie(c, "auth_token", "", {
    path: "/",
    maxAge: 0, // 🧹 clear cookie
  });

  return c.json({ success: true });
});


// 🌐 Catch-all route for React SPA routing
app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});


export default app;
