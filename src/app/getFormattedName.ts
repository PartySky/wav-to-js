import {ParamsForSampleName} from "./paramsForSampleName";

export function getFormattedName(dto: ParamsForSampleName): string {
  const rrPart = dto.noRr ? '' : ` RR${dto.rr}`;
  const midiNumSecondString = dto.midiNumSecond ? `--${dto.midiNumSecond}` : ``;
  return `${dto.midiNum}${midiNumSecondString} ${dto.art}${rrPart}`;
}
