export async function isWpApiAccessible(url: string) {
  const apiUrl = `${url}/wp-json`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    return false;
  }

  const data = await response.json();

  if (!("routes" in data && "/wp/v2" in data.routes)) {
    return false;
  }

  return true;
}
