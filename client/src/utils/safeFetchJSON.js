// src/utils/safeFetchJSON.js
export async function safeFetchJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
      else if (data.message) errorMessage = data.message;
    } catch {
      // Ignore JSON parsing error, fallback to status text
    }
    throw new Error(`API request failed: ${errorMessage}`);
  }
  
  return response.json();
}
