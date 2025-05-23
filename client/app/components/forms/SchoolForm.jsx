"use client";

import { useEffect, useState } from "react";

export default function SchoolForm() {
  const [schoolName, setSchoolName] = useState("");
  const [universities, setUniversities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schoolName.trim() || schoolName.length < 3) {
      setUniversities([]);
      return;
    }

    const fetchUniversities = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/actions/universities?name=${encodeURIComponent(schoolName)}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }
        const data = await response.json();
        setUniversities(data);
      } catch (err) {
        setError(err.message);
        setUniversities([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the API call - increased to 1 second to reduce load
    const timerId = setTimeout(() => {
      fetchUniversities();
    }, 1000);

    return () => clearTimeout(timerId);
  }, [schoolName]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={schoolName}
        onChange={(e) => setSchoolName(e.target.value)}
        placeholder="Enter school name (min 3 characters)"
        className="max-w-md p-2 border border-gray-300 rounded-md"
      />
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {universities.length > 0 && (
        <ul className="max-w-md space-y-2 rounded-md border p-4">
          {universities.map((uni, index) => (
            <li key={index} className="border-b pb-2 last:border-b-0 last:pb-0">
              <h3 className="font-semibold">{uni.name}</h3>
              <p className="text-sm text-gray-600">{uni.country}</p>
              {uni.web_pages && uni.web_pages.length > 0 && (
                <a
                  href={uni.web_pages[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                >
                  {uni.web_pages[0]}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {!isLoading &&
        !error &&
        schoolName.trim() &&
        universities.length === 0 && (
          <p>No universities found for "{schoolName}".</p>
        )}
    </div>
  );
}
