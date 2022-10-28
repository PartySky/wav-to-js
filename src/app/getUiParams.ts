import {UiParms} from "./uiParms";

export function getUiParams(): UiParms {
  const result: UiParms = {
    amplitude: 0.95,
    channels: 1,
    duration: 1,
    frequency: 440,
    sampleRate: 44100,
    wavFileType: 0,
  }
  return result;
}
