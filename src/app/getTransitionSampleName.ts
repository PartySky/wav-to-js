import {midiNoteNumbers} from "./midiNoteNumbers";
import {articulations} from "./articulations";
import {getFormattedName} from "./getFormattedName";

export function getTransitionSampleName(noteIdList: number[]): string {
  let result = '';

  const higherNoteId = midiNoteNumbers.N_G2_43;
  const lowerNoteId = midiNoteNumbers.N_B1_35;


  const higherTriggerNoteId = midiNoteNumbers.N_D2b_25_SomeTrigger;
  const lowerTriggerNoteId = midiNoteNumbers.N_C1_24_VibratoTrigger;

  const previousItem = noteIdList[2];

  let roundRobin = 3;

  if (noteIdList[1]) {
    // if (noteIdList[0] >= lowerNoteId && noteIdList[0] <= higherNoteId &&
    //   noteIdList[1] === midiNoteNumbers.N_C1_24_VibratoTrigger) {
    //   result = getFormattedName({
    //     midiNum: noteIdList[0],
    //     art: articulations.vib,
    //     rr: roundRobin,
    //   });
    // }

    if (noteIdList[0] >= lowerNoteId && noteIdList[0] <= higherNoteId &&
      noteIdList[1] >= lowerNoteId && noteIdList[0] <= higherNoteId) {
      result = `${noteIdList[0]} ${noteIdList[1]}`;
    }
  }

  roundRobin = 3;

  if (!result) {
    if (noteIdList[0] >= lowerNoteId && noteIdList[0] <= higherNoteId) {
      result = getFormattedName({
        midiNum: noteIdList[0],
        art: articulations.fastDown,
        rr: roundRobin,
      });
    }
  }

  roundRobin = 3;

  if (!result) {
    if (previousItem &&
      (noteIdList[0] >= lowerTriggerNoteId && noteIdList[0] <= higherTriggerNoteId)) {
      if (noteIdList[0] === midiNoteNumbers.N_C1_24_VibratoTrigger) {
        result = getFormattedName({
          midiNum: previousItem,
          art: articulations.vib,
          rr: roundRobin,
        });
      }
    }
  }

  console.log(result);

  return result;
}
