// IPAdress.js
// Before (incorrect for Vite):
// export const IPAdress = process.env.REACT_APP_API_URL || "http://121.242.232.213:8089";

// After (correct for Vite):
export const IPAdress =
  import.meta.env.VITE_API_URL || "https://startups.itelfoundation.in";
  //http://10.20.35.21:8086"
console.log("API URL:", IPAdress);

// Backend returns absolute URLs pointing at the production host (e.g.
// https://startups.itelfoundation.in/itelinc/uploads/...). Force them to use
// the configured API host so previews/downloads hit the same server the file
// was uploaded to instead of production.
export const normalizeFileUrl = (url) => {
  if (!url) return url;
  try {
    const api = new URL(IPAdress);
    const parsed = new URL(url, api.origin);
    if (parsed.pathname.startsWith("/itelinc/")) {
      return `${api.origin}${parsed.pathname}${parsed.search}`;
    }
    return url;
  } catch {
    return url;
  }
};
 