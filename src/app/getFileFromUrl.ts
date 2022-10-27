export async function getFileFromUrl(url: string): Promise<ArrayBuffer> {
  let response = await fetch(url);

  let ab = await response.arrayBuffer();
  return ab;
}
