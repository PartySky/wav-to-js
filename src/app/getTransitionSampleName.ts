export function getTransitionSampleName(noteIdList: number[]): string {
  let result = '';

  if (noteIdList[1]) {
    if (noteIdList[0] === 1 && noteIdList[1] === 2) {
      result = 'Eb2 F';
    } else if (noteIdList[0] === 2 && noteIdList[1] === 3) {
      result = 'F G';
    }
  }

  if (!result) {
    if (noteIdList[0] === 1) {
      result = 'Eb';
    } else if (noteIdList[0] === 2) {
      result = 'F';
    } else if (noteIdList[0] === 3) {
      result = 'G';
    }
  }

  console.log(result);

  return result;
}
