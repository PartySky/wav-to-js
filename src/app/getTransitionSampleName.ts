import {midiNoteNumbers} from "./midiNoteNumbers";


export function getTransitionSampleName(noteIdList: number[]): string {
  let result = '';

  if (noteIdList[1]) {
    if (noteIdList[0] === midiNoteNumbers.Eb2_39 && noteIdList[1] === midiNoteNumbers.F2_41) {
      result = 'Eb2 F';
    } else if (noteIdList[0] === midiNoteNumbers.F2_41 && noteIdList[1] === midiNoteNumbers.G2_43) {
      result = 'F G';
    }
  }

  if (!result) {
    if (noteIdList[0] === midiNoteNumbers.Eb2_39) {
      result = 'Eb';
    } else if (noteIdList[0] === midiNoteNumbers.F2_41) {
      result = 'F';
    } else if (noteIdList[0] === midiNoteNumbers.G2_43) {
      result = 'G';
    }
  }

  console.log(result);

  return result;
}
