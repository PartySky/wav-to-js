import {midiNoteNumbers} from "./midiNoteNumbers";
import {articulations} from "./articulations";

export function getTransitionSampleName(noteIdList: number[]): string {
  let result = '';

  const higherNoteId = midiNoteNumbers.N_G2_43;
  const lowerNoteId = midiNoteNumbers.N_B1_35;

  if (noteIdList[1]) {
    if (noteIdList[0] >= lowerNoteId && noteIdList[0] <= higherNoteId &&
      noteIdList[1] === midiNoteNumbers.N_C1_24_VibratoTrigger) {
      result = `${noteIdList[0]} Vib`;
    }

    if (noteIdList[0] >= lowerNoteId && noteIdList[0] <= higherNoteId &&
      noteIdList[1] >= lowerNoteId && noteIdList[0] <= higherNoteId) {
      result = `${noteIdList[0]} ${noteIdList[1]}`;
    }
  }

  if (!result) {
    if (noteIdList[0] >= lowerNoteId && noteIdList[0] <= higherNoteId) {
      result = `${noteIdList[0]} ${articulations.fastDown}`;
    }
  }

  console.log(result);

  return result;
}
