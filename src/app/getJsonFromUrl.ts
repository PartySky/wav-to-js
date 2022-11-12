export async function getJsonFromUrl(url: string): Promise<number[]> {
  let response = await fetch(url);

  let ab = await response.json();
  return ab;
}
