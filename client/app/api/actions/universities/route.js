import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "School name parameter is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `http://universities.hipolabs.com/search?name=${encodeURIComponent(
        name
      )}`,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; UniversitySearchBot/1.0)",
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const universities = await response.json();

    return NextResponse.json(universities);
  } catch (error) {
    console.error("Error fetching universities:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to fetch universities";
    if (error.name === "TimeoutError") {
      errorMessage = "Request timed out. Please try again.";
    } else if (
      error.message.includes("ENOTFOUND") ||
      error.message.includes("network")
    ) {
      errorMessage = "Network error. Please check your connection.";
    } else if (error.code === "UND_ERR_SOCKET") {
      errorMessage =
        "Connection error. The service may be temporarily unavailable.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
