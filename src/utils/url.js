export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (e) {
    return false;
  }
}

export function getSiteNameFromUrl(string) {
  const url = new URL(string);
  return url.hostname.replace(".", "_");
}
