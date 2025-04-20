"use client"

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function UserCourseList() {
  const [courses, setCourses] = useState([]);
  const [error,   setError  ] = useState("");

  useEffect(() => {
    console.log("👉 Fetching from", API_URL);
    fetch(`${API_URL}/api/courses/mine`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => setCourses(data))
      .catch(err => setError(err.message));
  }, []);

  if (error) return <p>Error: {error}</p>;
  if (!courses.length) return <p>No courses yet.</p>;

  return (
    <ul>
      {courses.map(c => (
        <li key={c._id}>{c.name} ({c.code})</li>
      ))}
    </ul>
  );
  
}


