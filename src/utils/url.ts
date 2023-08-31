export function isValidUrl(maybeUrl: string) {
  try {
    new URL(maybeUrl);
    return true;
  } catch (e) {
    return false;
  }
}

export function getSiteNameFromUrl(url: string) {
  const urlObject = new URL(url);
  return urlObject.hostname.replaceAll(".", "_");
}

export function addSearchParam(
  url: string,
  paramName: string,
  paramValue: string,
) {
  const urlObject = new URL(url);
  urlObject.searchParams.append(paramName, paramValue);
  return urlObject.href;
}
