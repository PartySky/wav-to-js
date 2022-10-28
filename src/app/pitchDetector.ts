import {DTO_01} from "./DTO_01";
import {getFileFromUrl} from "./getFileFromUrl";
import * as WavFileEncoder from "wav-file-encoder";
import {openSaveAsDialog} from "./openSaveAsDialog";
import {getDateString} from "./getDateString";
import {getUiParams} from "./getUiParams";

export class PitchDetector {
  constructor() {
  }

  /**
   * Autocorrelation function
   * @param f
   * @param W
   * @param t
   * @param lag
   */
  ACF(f: number[], W: number, t: number, lag: number): number {
    let multipliedArray = this.numpyMultiplyArrays(f.slice(t, t + W), f.slice(lag + t, lag + t + W));

    return this.numpySum(multipliedArray);
  }

  getClosestPeriodIndexDF1(f: number[], W: number, t: number, sample_rate: number, bounds: number[]): number {
    return 0;
  }

  getDFVals(f: number[], W: number, t: number, sample_rate: number, bounds: number[]): number[] {
    let DF_vals: number[] = [];

    for (let i = 0; i < bounds[0]; i++) {
      DF_vals.push(-0.5);
    }

    for (let i = bounds[0]; i < bounds[1]; i++) {
      let lag = i;
      const x1 = f.slice(t, t + W).length;
      const x2 = f.slice(lag + t, lag + t + W).length;
      if (x1 && x2 && x1 === x2) {
        DF_vals.push(this.DF(f, W, t, i));
      }
    }

    let localMins: number[] = [];

    // abc
    // (b-a)(c-b) < 0
    DF_vals.forEach((item, i) => {
      if (DF_vals[i - 1] > DF_vals[i] && DF_vals[i] < DF_vals[i + 1]) {
        localMins.push(i);
      }
    })

    debugger;

    return DF_vals;
  }

  detect_pitch_ACF(f: number[], W: number, t: number, sample_rate: number, bounds: number[]): number {
    let ACF_vals: number[] = [];
    for (let i = bounds[0]; i < bounds[1]; i++) {
      let lag = i;
      const x1 = f.slice(t, t + W).length;
      const x2 = f.slice(lag + t, lag + t + W).length;
      if (x1 && x2 && x1 === x2) {
        ACF_vals.push(this.ACF(f, W, t, i));
      }
    }
    let sample = this.numpyArgmax(ACF_vals) + bounds[0];
    return sample_rate / sample;
  }

  /**
   * Difference function
   * @param f
   * @param W
   * @param t
   * @param lag
   * @constructor
   */
  DF(f: number[], W: number, t: number, lag: number): number {
    let result = this.ACF(f, W, t, 0) + this.ACF(f, W, t + lag, 0) - 2 * this.ACF(f, W, t, lag);
    return result;
  }

  memo_CMNDF(f: number[], W: number, t: number, lag_max: number): number[] {
    let running_sum = 0;
    let vals: number[] = [];

    for (let lag = 0; lag < lag_max; lag++) {
      if (lag === 0) {
        vals.push(1);
        running_sum += 0;
      } else {
        const x1 = f.slice(t, t + W).length;
        const x2 = f.slice(lag + t, lag + t + W).length;
        if (x1 && x2 && x1 === x2) {
          const DFResult = this.DF(f, W, t, lag);
          running_sum += DFResult;
          vals.push(DFResult / running_sum * lag);
        }
      }
    }

    return vals;
  }

  getConvertedChData(chData: Float32Array, multiplayer, multiplayer_2): Float32Array {
    let result: number[] = [];

    chData.forEach(item => {
      const itemTemp = item < 0 ? item * multiplayer : item * multiplayer_2;
      result.push(itemTemp);
    })

    return new Float32Array(result);
  }

  normalize(data: number[]): number[] {
    let result: number[] = [];

    const min = Math.min(...data); // 9 // 1
    const max = Math.max(...data); // 3 // -1

    // 9 1
    // i x

    // x = i * 1 / 9

    data.forEach(item => {
      result.push(item * 1 / max);
    })

    return result;
  }

  getPeriodsFromX(dto: DTO_01): number[] {
    const sampleRate = dto.sampleRate;
    const chData = this.getConvertedChData(dto.chData, 32768, 32767);
    const windowSize = 5 / 2000 * 44100;
    let maxBound = 6000; // 2000
    const bounds = [20, maxBound];
    let result: number[] = [];

    let iTemp = 0;

    let DF_vals = this.getDFVals(
      // @ts-ignore
      chData,
      windowSize,
      1, // 1, // iTemp, // ?
      sampleRate,
      bounds,
    );

    const outPutAB: AudioBuffer = new AudioBuffer({
      length: DF_vals.length,
      numberOfChannels: 1,
      sampleRate: sampleRate,
    });

    const normalizedDFVals = this.normalize(DF_vals);

    outPutAB.copyToChannel(new Float32Array(normalizedDFVals), 0);

    const uiParms = getUiParams();

    const wavFileData = WavFileEncoder.encodeWavFile(outPutAB, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    openSaveAsDialog(blob, `test ${getDateString(new Date())}.wav`);

    // let firstPeriod = this.DF(
    //   // @ts-ignore
    //   chData,
    //   windowSize,
    //   iTemp,
    //   bounds[1],
    // );

    debugger;

    return result;

    const maxIToFind = chData.length / (windowSize + 3);

    let lastI = 0;

    for (let i = 0; i < maxIToFind; i++) {
      if (i - lastI > 2) {
        this.drawProgress(maxIToFind, i);
        lastI = i;
      }
      result.push(this.augmented_detect_pitch_CMNDF(
        chData,
        windowSize,
        i * windowSize,
        sampleRate,
        bounds
      ))
    }

    return result;
  }

  getPitchesFromX(dto: DTO_01): number[] {
    const sampleRate = dto.sampleRate;
    const chData = this.getConvertedChData(dto.chData, 32768, 32767);
    const windowSize = 5 / 2000 * 44100;
    let maxBound = 2000;
    const bounds = [20, maxBound];
    let result: number[] = [];
    let lastI = 0;
    const maxIToFind = chData.length / (windowSize + 3);


    for (let i = 0; i < maxIToFind; i++) {
      if (i - lastI > 2) {
        this.drawProgress(maxIToFind, i);
        lastI = i;
      }
      result.push(this.augmented_detect_pitch_CMNDF(
        chData,
        windowSize,
        i * windowSize,
        sampleRate,
        bounds
      ))
    }

    return result;
  }

  drawProgress(total: number, i: number) {
    console.log(`Progress: ${i * 100 / total}`);
  }

  /**
   * Returns pitch
   */
  augmented_detect_pitch_CMNDF(f: any, W: number, t: number, sample_rate: number, bounds: number[], thresh = 0.1): number {
    /**
     * Cumulative mean normalized difference function
     */
    const CMNDF_vals = this.memo_CMNDF(f, W, t, bounds.slice(-1)[0]).slice(bounds[0]);
    let sample: number = null;

    for (let i = 0; i < CMNDF_vals.length; i++) {
      if (CMNDF_vals[i] < thresh) {
        sample = i + bounds[0];
        break;
      }
    }

    if (!sample) {
      sample = this.numpyArgmin(CMNDF_vals) + bounds[0];
    }

    return sample_rate / (sample + 1);
  }

  numpyMultiplyArrays(a: number[], b: number[]): number[] {
    /**
     * [37] * [37] = [1369]
     * [37] * [37, 1] = [1369, 37]
     * [37, 1] * [37, 1] = [1369, 1]
     * [37, 1, -34, -73] * [37, 1, -34, -73] = [1369, 1, 1156, 5329]
     *
     * [ 37.   1. -34. -73.] * [-107. -129. -156. -187.] = [-3959.  -129.  5304. 13651.]
     * [ 37.   1. -34. -73.] * [-107. -129. -156.] = не работает, длины должны быть равны
     * [ 37.   1. -34.] * [-107. -129. -156. ] = [-3959.  -129.  5304.]
     */

    if (a.length && !b?.length) {
      return a;
    }

    if (a.length != b.length) {
      throw new Error(`{ValueError}operands could not be broadcast together with shapes (${a.length},) (${b.length},)`)
    }

    let result: number[] = [];
    a.forEach((item, i) => {
      result.push(item * b[i]);
    })

    return result;
  }

  numpySum(a: number[]): number {
    let result = 0;
    a.forEach(item => {
      result = result + item;
    })
    return result;
  }

  /**
   * Returns index of minimal value
   */
  private numpyArgmin(data: number[]): number {
    const min = Math.min(...data);
    let result = data.indexOf(min);
    return result;
  }

  /**
   * Returns index of maximal value
   */
  private numpyArgmax(data: number[]): number {
    const max = Math.max(...data);
    let result = data.indexOf(max);
    return result;
  }

  async periodsDetector() {
    const pitchDetector = new PitchDetector();

    const AB_Transition_F_G = await getFileFromUrl('assets/F2 Up2.wav');
    const audioCtx = new AudioContext();
    let audioBuffer_Transition_F_G = await audioCtx.decodeAudioData(AB_Transition_F_G);
    let chData = audioBuffer_Transition_F_G.getChannelData(0);


    let testPitches = pitchDetector.getPeriodsFromX(
      {
        sampleRate: 44100,
        chData,
      }
    );

    debugger;
  }

  async testPitchDetector() {
    const pitchDetector = new PitchDetector();

    // const AB_Transition_F_G = await getFileFromUrl('assets/F2 ACF Test 09.wav');
    const AB_Transition_F_G = await getFileFromUrl('assets/lib/Legato/Legato Up 04/Legato Up 04 Sprite 52.wav');
    const audioCtx = new AudioContext();
    let audioBuffer_Transition_F_G = await audioCtx.decodeAudioData(AB_Transition_F_G);
    let chData = audioBuffer_Transition_F_G.getChannelData(0);

    let testPitches = pitchDetector.getPitchesFromX(
      {
        sampleRate: 44100,
        chData,
      }
    );

    debugger;
  }
}

