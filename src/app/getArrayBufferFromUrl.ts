export async function getArrayBufferFromUrl(url: string): Promise<ArrayBuffer> | null {
  let response;
  let responseTemp = await fetch(url).then(data => {
    if (data.status !== 200) {
      debugger
    } else {
      response = data;
    }
  }).catch(error => {
    debugger;
  });

  if (!response) {
    return null
  } else {
    let ab = await response.arrayBuffer();
    return ab;
  }
}
