import {midiNoteNumbers} from "./midiNoteNumbers";
import {articulations} from "./articulations";
import {getFormattedName} from "./getFormattedName";
import {legatoTypes} from "./legatoTypes";
import {getTransitionSampleNameDto} from "./getTransitionSampleNameDto";

export function getTransitionSampleName(dto: getTransitionSampleNameDto): string {
  const noteId = dto.noteId;
  const nextNoteId = dto.nextNoteId;
  const previousNoteId = dto.previousNoteId;
  const legatoType = dto.legatoType;

  let result = '';

  // const higherNoteId = midiNoteNumbers.N_A2_45;
  const higherNoteId = midiNoteNumbers.some_NoteId;
  const lowerNoteId = midiNoteNumbers.N_B1_35;
  const higherTriggerNoteId = midiNoteNumbers.N_D2b_25_SomeTrigger;
  const lowerTriggerNoteId = midiNoteNumbers.N_C1_24_VibratoTrigger;
  const previousItem = previousNoteId;


  if (nextNoteId) {
    if (legatoType === legatoTypes.noPairs) {
      if (noteId >= lowerNoteId && noteId <= higherNoteId &&
        nextNoteId >= lowerNoteId && nextNoteId <= higherNoteId) {
        let articulationTemp = '';
        let interval = 0;

        if (noteId < nextNoteId) {
          interval = nextNoteId - noteId;
          articulationTemp = 'legDown';
        } else {
          interval = noteId - nextNoteId;
          articulationTemp = 'legUp';
        }
        const intervalStr = interval.toString().padStart(2, '0')
        result = getFormattedName({
          midiNum: noteId,
          art: articulations[`${articulationTemp}_${intervalStr}`],
          noRr: true,
        });
      }
    } else {
      if (noteId >= lowerNoteId && noteId <= higherNoteId &&
        nextNoteId >= lowerNoteId && nextNoteId <= higherNoteId) {
        result = `${noteId} ${nextNoteId}`;
      }
    }
  }

  const temporaryTernedOff = true;

  if (!temporaryTernedOff) {


    if (!result) {
      if (noteId >= lowerNoteId && noteId <= higherNoteId) {
        result = getFormattedName({
          midiNum: noteId,
          art: articulations.fastDown,
          noRr: true,
        });
      }
    }


    if (!result) {
      if (previousItem &&
        (noteId >= lowerTriggerNoteId && noteId <= higherTriggerNoteId)) {
        if (noteId === midiNoteNumbers.N_C1_24_VibratoTrigger) {
          result = getFormattedName({
            midiNum: previousItem,
            art: articulations.vib,
            noRr: true,
          });
        }
      }
    }
  }

  console.log(result);

  return result;
}
