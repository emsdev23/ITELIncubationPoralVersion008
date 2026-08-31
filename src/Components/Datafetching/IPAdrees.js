// IPAdress.js
// Before (incorrect for Vite):
// export const IPAdress = process.env.REACT_APP_API_URL || "http://121.242.232.213:8089";

// After (correct for Vite):
export const IPAdress =
  import.meta.env.VITE_API_URL || "http://121.242.232.213:8089";
console.log("API URL:", IPAdress);
 