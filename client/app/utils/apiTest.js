// Utility to test API connectivity
export const testApiConnection = async () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return {
      success: false,
      error: "NEXT_PUBLIC_API_URL environment variable not set",
    };
  }

  try {
    const cleanApiUrl = apiBaseUrl.replace(/\/$/, "");
    const healthUrl = `${cleanApiUrl}/health`;

    console.log("Testing API connection to:", healthUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        data,
        url: healthUrl,
      };
    } else {
      return {
        success: false,
        error: `API returned status ${response.status}`,
        url: healthUrl,
      };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "Connection timed out after 5 seconds",
        url: apiBaseUrl,
      };
    }

    return {
      success: false,
      error: error.message,
      url: apiBaseUrl,
    };
  }
};
