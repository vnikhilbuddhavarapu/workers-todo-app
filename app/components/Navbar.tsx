"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [user, setUser] = useState<{ firstname: string } | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser({ firstname: data.user.firstname });
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("❌ Failed to fetch user info:", err);
        setUser(null);
      });
  }, []);

  const handleSignOut = async () => {
    //console.log("🚪 Signing out...");
    const res = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      //console.log("✅ Logged out successfully");
      setUser(null);
      window.location.href = "/";
    } else {
      console.error("❌ Failed to log out");
    }
  };

  return (
    <nav className="w-full px-6 py-4 flex justify-between items-center bg-gray-900 text-white shadow">
      <Link to="/" className="text-2xl font-bold">
        ToDo App
      </Link>

      <div className="flex gap-4 items-center text-xl">
        <div className="flex-grow text-center">
        <span>
          {user ? `Hey ${user.firstname}!` : "Hey there!"}
        </span></div>
        {user ? (
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
          >
            Sign Out
          </button>
        ) : (
          <>
            <Link to="/login" className="hover:underline">
              Sign In
            </Link>
            <Link to="/signup" className="hover:underline">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
