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
  return url.hostname.replaceAll(".", "_");
}

export function addSearchParam(url, paramName, paramValue) {
  let urlObject = new URL(url);
  urlObject.searchParams.append(paramName, paramValue);
  return urlObject.href;
}
