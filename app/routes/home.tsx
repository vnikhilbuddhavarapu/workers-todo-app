"use client";

import { useEffect, useState } from "react";

interface Todo {
  id: number;
  content: string;
  created_at: string;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in and fetch todos
  useEffect(() => {
    const checkLogin = async () => {
      //console.log("🔍 Checking auth status via /api/me");
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
        });

        if (!res.ok) {
          console.warn("❌ /api/me failed:", res.status);
          setIsLoggedIn(false);
          setTodos([]);
          return;
        }

        const data = await res.json();
        //console.log("📬 /api/me response:", data);

        if (data?.user?.id) {
          //console.log("✅ Logged in as:", data.user.firstname);
          setIsLoggedIn(true);

          const todosRes = await fetch("/api/todos", {
            credentials: "include",
          });

          const todosData = await todosRes.json();
          setTodos(Array.isArray(todosData.todos) ? todosData.todos : []);
        } else {
          console.warn("❌ No user found. Ephemeral todos.");
          setIsLoggedIn(false);
          setTodos([]);
        }
      } catch (err) {
        console.error("⚠️ Error fetching /api/me:", err);
        setIsLoggedIn(false);
        setTodos([]);
      }
    };

    checkLogin();
  }, []);

  const handleAddTodo = async () => {
    //console.log("📥 Add Todo triggered with input:", newTodo);
    if (!newTodo.trim()) {
      //console.log("❌ Empty input, aborting.");
      return;
    }

    const tempTodo = {
      id: Date.now(),
      content: newTodo,
      created_at: new Date().toISOString(),
    };

    if (isLoggedIn) {
      try {
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newTodo }),
          credentials: "include",
        });

        if (!res.ok) {
          console.error("❌ Server responded with non-200:", res.status);
          throw new Error("Failed to add todo");
        }

        const added = await res.json();
        //console.log("✅ Todo added:", added);
        if (added?.todo?.id) {
          setTodos((prev) => [added.todo, ...prev]);
        } else {
        console.warn("❌ Malformed todo response:", added);
        }

      } catch (err) {
        console.error("❌ Error adding todo:", err);
        setError("Error adding todo");
      }
    } else {
      console.warn("⚠️ Ephemeral mode: storing local todo");
      setTodos((prev) => [tempTodo, ...prev]);
    }

    setNewTodo("");
  };

  const handleDelete = async (id: number) => {
    if (isLoggedIn) {
      try {
        const res = await fetch(`/api/todos/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to delete");

        setTodos((prev) => prev.filter((t) => t.id !== id));
      } catch {
        setError("Error deleting todo");
      }
    } else {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <main className="p-15 max-w-xl mx-auto">
      <h1 className="text-4xl poiret font-bold mb-4">Add a ToDo...</h1>

      <div className="flex mb-4 gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="New ToDo..."
          className="border px-3 py-2 w-full rounded"
        />
        <button
          onClick={handleAddTodo}
          className="bg-orange-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <ul className="space-y-2">
        {todos.map((todo, index) => {
        //console.log("🔑 Rendering todo:", todo); // Debug: see if `todo.id` exists

        const safeKey = todo.id ?? `todo-${index}`; // fallback in case id is undefined

        return (
          <li
            key={safeKey}
            className="flex justify-between items-center border px-4 py-2 rounded"
          >
            <span>{todo.content}</span>
            <button
              onClick={() => handleDelete(todo.id)}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </li>
        );
      })}
      </ul>
    </main>
  );
}
