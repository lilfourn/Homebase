"use client"

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function AddCourseForm({ onSuccess }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1) log the payload
    console.log("→ Adding course:", { name, code, description, icon });

    try {
      const res = await fetch(`${API_URL}/api/courses`, {
        method: "POST",
        credentials: "include",         // if you’re sending cookies/auth
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, description, icon })
      });

      // 2) log status
      console.log("← Response status:", res.status);

      const body = await res.json();
      // 3) log response body
      console.log("← Response body:", body);

      if (!res.ok) {
        throw new Error(body.message || "Failed to add");
      }

      console.log("✓ Course added successfully");
      setName(""); setCode(""); setDescription(""); setIcon("");
      onSuccess?.(body);
    } catch (err) {
      console.error("✗ AddCourseForm error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add a Course</h2>

      <label>
        Name
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </label>

      <label>
        Code
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          required
        />
      </label>

      <label>
        Description
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </label>

      <label>
        Icon URL
        <input
          value={icon}
          onChange={e => setIcon(e.target.value)}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save Course"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
