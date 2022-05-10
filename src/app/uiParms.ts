import * as WavFileEncoder from "wav-file-encoder";

export interface UiParms {
  frequency: number;
  amplitude: number;
  duration: number;
  channels: number;
  sampleRate: number;
  wavFileType: WavFileEncoder.WavFileType;
}
