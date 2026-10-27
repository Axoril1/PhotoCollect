/**
 * Standard utility to parse browser name and device type from User-Agent string
 * without external library dependencies.
 */
export const parseUserAgent = (userAgentString = "") => {
  const ua = userAgentString.toLowerCase();
  let browser = "Unknown Browser";
  let device = "Desktop";

  if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("chrome") && !ua.includes("chromium")) {
    browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")) {
    browser = "Safari";
  } else if (ua.includes("edge")) {
    browser = "Edge";
  } else if (ua.includes("opera") || ua.includes("opr")) {
    browser = "Opera";
  } else if (ua.includes("chromium")) {
    browser = "Chromium";
  }

  // Device determination
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
    device = "Mobile";
  } else if (ua.includes("ipad") || ua.includes("tablet") || ua.includes("playbook")) {
    device = "Tablet";
  }

  return { browser, device };
};

export default parseUserAgent;
