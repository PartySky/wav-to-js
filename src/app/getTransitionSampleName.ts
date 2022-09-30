import {midiNoteNumbers} from "./midiNoteNumbers";

export function getTransitionSampleName(noteIdList: number[]): string {
  let result = '';

  const higherNoteId = midiNoteNumbers.G2_43;
  const loverNoteId = midiNoteNumbers.C2_36;

  if (noteIdList[1]) {
    if (noteIdList[0] >= loverNoteId && noteIdList[0] <= higherNoteId &&
      noteIdList[1] === midiNoteNumbers.C1_24_VibratoTrigger) {
      result = `${noteIdList[0]} Vib`;
    }

    if (noteIdList[0] >= loverNoteId && noteIdList[0] <= higherNoteId &&
      noteIdList[1] >= loverNoteId && noteIdList[0] <= higherNoteId) {
      result = `${noteIdList[0]} ${noteIdList[1]}`;
    }
  }

  if (!result) {
    if (noteIdList[0] >= loverNoteId && noteIdList[0] <= higherNoteId) {
      result = `${noteIdList[0]}`;
    }
  }

  console.log(result);

  return result;
}
