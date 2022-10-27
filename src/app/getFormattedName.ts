import {ParamsForSampleName} from "./paramsForSampleName";

export function getFormattedName(dto: ParamsForSampleName): string {
  const midiNumSecondString = dto.midiNumSecond ? `--${dto.midiNumSecond}` : ``;
  return `${dto.midiNum}${midiNumSecondString} ${dto.art} RR${dto.rr}`;
}
