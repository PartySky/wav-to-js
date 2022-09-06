import {Component, OnInit} from '@angular/core';
import * as WavFileEncoder from "wav-file-encoder";
import {Note} from "./note";
import {Period} from "./period";
import {UiParms} from "./uiParms";
import {Period3} from "./period2";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  channelData: Float32Array;
  patternChannelData: Float32Array;
  dataToRender: Float32Array;

  constructor() {
  }

  ngOnInit() {
    this.generateWavFileButton_click();
  }

  async getFileFromUrl(url: string) {
    let response = await fetch(url);

    let ab = await response.arrayBuffer();
    return ab;
  }

  getRadioButtonGroupValue(name: string): string | undefined {
    const a = document.getElementsByName(name);
    for (let i = 0; i < a.length; i++) {
      const e = <HTMLInputElement>a[i];
      if (e.checked) {
        return e.value;
      }
    }
    return undefined;
  }

  // When a parameter is invalid, an error message is displayed, the cursor is placed within
  // the affected field and the return value is undefined.
  getUiParms(): UiParms | undefined {
    const frequencyElement = <HTMLInputElement>document.getElementById("frequency")!;
    const amplitudeElement = <HTMLInputElement>document.getElementById("amplitude")!;
    const durationElement = <HTMLInputElement>document.getElementById("duration")!;
    const channelsElement = <HTMLInputElement>document.getElementById("channels")!;
    const sampleRateElement = <HTMLInputElement>document.getElementById("sampleRate")!;
    if (!frequencyElement.reportValidity() ||
      !amplitudeElement.reportValidity() ||
      !durationElement.reportValidity() ||
      !channelsElement.reportValidity() ||
      !sampleRateElement.reportValidity()) {
      return;
    }
    const uiParms = <UiParms>{};
    uiParms.frequency = frequencyElement.valueAsNumber;
    uiParms.amplitude = amplitudeElement.valueAsNumber;
    uiParms.duration = durationElement.valueAsNumber;
    uiParms.channels = channelsElement.valueAsNumber;
    uiParms.sampleRate = sampleRateElement.valueAsNumber;
    uiParms.wavFileType = Number(this.getRadioButtonGroupValue("wavFileType"));
    return uiParms;
  }

  generateSineWaveSignal(frequency: number, amplitude: number, duration: number, channels: number, sampleRate: number): AudioBuffer {
    const length = duration * sampleRate;
    const audioBuffer: AudioBuffer = new (<any>AudioBuffer)({length, numberOfChannels: channels, sampleRate});
    // <any> is used because the constructor declaration is missing in TypeScript 2.8.
    const omega = 2 * Math.PI * frequency;
    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let p = 0; p < length; p++) {
        channelData[p] = Math.sin(p / sampleRate * omega) * amplitude;
      }
    }
    return audioBuffer;
  }

  openSaveAsDialog(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = fileName;
    const clickEvent = new MouseEvent("click");
    element.dispatchEvent(clickEvent);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    (<any>document).dummySaveAsElementHolder = element;
  }

  async generateWavFile2() {
    const uiParms = this.getUiParms();
    if (!uiParms) {
      return;
    }
    const audioCtx = new AudioContext();

    const ab_pattern_01 = await this.getFileFromUrl('assets/pattern.wav');
    const AB_Note_Zero = await this.getFileFromUrl('assets/Note Zero.wav');
    const AB_Note_A = await this.getFileFromUrl('assets/Eb2 Up2.wav');
    const AB_Note_B = await this.getFileFromUrl('assets/F2 Up2.wav');

    let audBuff_pattern_01 = await audioCtx.decodeAudioData(ab_pattern_01);
    let audioBuffer_Note_Zero = await audioCtx.decodeAudioData(AB_Note_Zero);
    let audioBuffer_Note_A = await audioCtx.decodeAudioData(AB_Note_A);
    let audioBuffer_Note_B = await audioCtx.decodeAudioData(AB_Note_B);

    const x_pattern_01 = audBuff_pattern_01.getChannelData(0);
    const x2_channelData_Left = audioBuffer_Note_A.getChannelData(0);
    const x2_channelData_right = audioBuffer_Note_A.numberOfChannels > 1 ?
      audioBuffer_Note_A.getChannelData(1) : audioBuffer_Note_A.getChannelData(0);

    this.channelData = x2_channelData_Left.slice(0, 30000);
    this.patternChannelData = x_pattern_01.slice(0, 15000);

    const outPutAB: AudioBuffer = audioBuffer_Note_Zero;
    let outPutChData: Float32Array = outPutAB.getChannelData(0);

    for (let i = 0; i < outPutChData.length; i++) {
      outPutChData[i] = 0;
    }

    const outPutChDataTemp = this.mixDownChDatas([
      {periodList: this.getChanelDataList(audioBuffer_Note_A.getChannelData(0)), offset: 0},
      {periodList: this.getChanelDataList(audioBuffer_Note_B.getChannelData(0)), offset: 6000}, // 1200
    ]);

    for (let i = 0; i < outPutChDataTemp.length; i++) {
      outPutChData[i] = outPutChDataTemp[i];
    }

    const wavFileData = WavFileEncoder.encodeWavFile(outPutAB, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    this.openSaveAsDialog(blob, `test ${this.getDateString(new Date())}.wav`);
  }

  mixDownChDatas(chDataList: { periodList: Period3[], offset: number }[]): Float32Array {
    const renderMono = true;
    let result: number[] = [];

    let maxLenght = 0;

    chDataList.forEach(item => {
      let lengthTemp = item.offset;
      item.periodList.forEach(period => {
        lengthTemp = lengthTemp + period.chData.length;
      })
      if (lengthTemp > maxLenght) {
        maxLenght = lengthTemp;
      }
    })

    for (let chDataNum = 0; chDataNum < chDataList.length; chDataNum++) {
      const periodListTemp = chDataList[chDataNum].periodList;

      let nextChDataStart = chDataList[chDataNum + 1] ? chDataList[chDataNum + 1]?.offset : 0;

      let usedPeriodsNum = 0;
      const numPeriodsToCrossfade = 15; // 5
      if (chDataList[chDataNum + 1]) {
        nextChDataStart = this.getNearestNextChDataStart({
          periodList: periodListTemp,
          offset: 0, target:
          nextChDataStart
        });

        usedPeriodsNum = this.getUsedPeriodsForNearestNextChDataStart({
          periodList: periodListTemp,
          offset: 0, target:
          nextChDataStart
        });

        if (nextChDataStart) {
          let nextChDataTemp = chDataList[chDataNum + 1];
          nextChDataTemp.offset = nextChDataStart;

          let periodCounter = 0;
          let crossfadePeriodCounter = 0;
          periodListTemp.forEach(item => {
            /**
             * Тут нужно не с начала periodListTemp идти, а с периода,
             * котрый соответсвтует nextChDataStart
             */
            if (periodCounter >= usedPeriodsNum) {

              if (crossfadePeriodCounter < numPeriodsToCrossfade) {
                nextChDataTemp.periodList[crossfadePeriodCounter].chData =
                  this.getAdjustedChDataForPeriod({
                    chData: nextChDataTemp.periodList[crossfadePeriodCounter].chData,
                    targetLength: item.chData.length
                  });
              }
              crossfadePeriodCounter++;
            }

            periodCounter++;
          })
        }
      }

      const drawNextChDataStart = true;
      if (drawNextChDataStart && nextChDataStart) {
        for (let i = 0; i < 8; i++) {
          result[nextChDataStart + i] = -2;
        }
      }

      const offsetTemp = chDataList[chDataNum].offset
      let i = offsetTemp;
      let periodCounter = 0;
      periodListTemp.forEach(period => {
        if (!renderMono || !usedPeriodsNum || (periodCounter < (usedPeriodsNum + numPeriodsToCrossfade))) {
          period.chData.forEach(chData => {
            if (i < maxLenght) {
              if (!result[i]) {
                result[i] = 0;
              }
              if (chData) {
                result[i] = result[i] + chData;
              }
            }
            i++;
          })
        }
        periodCounter++;
      })
    }

    return new Float32Array(result);
  }

  getChanelDataList(chData: Float32Array): Period3[] {
    let result: Period3[] = [];
    let found = false;
    const tracholdLength = 200;

    let lastValue = 0;

    // @ts-ignore
    let chDataTemp: Float32Array = [];
    let chDataTempCounter = 0;

    for (let i = 0; i < chData.length; i++) {
      chDataTemp[chDataTempCounter] = chData[i];
      chDataTempCounter++;

      const zeroCrossDetected = (chData[i] < 0) && (lastValue >= 0) ||
        (chData[i] > 0) && (lastValue <= 0);

      if (zeroCrossDetected && chDataTemp.length > tracholdLength) {
        found = true;
      }
      if (found) {
        result.push({chData: chDataTemp});
        // @ts-ignore
        chDataTemp = [];
        chDataTempCounter = 0;
        found = false;
      }
      lastValue = chData[i];
    }

    const drawEdges = true;

    if (drawEdges) {
      result.forEach(item => {
        item.chData[0] = 1;
        item.chData[1] = -1;
      })
    }

    return result;
  }

  getUsedPeriodsForNearestNextChDataStart(dto: { periodList: Period3[], offset: number, target: number }): number {
    let nearestNextChDataStart = 0;
    let lastSubstract = 0;
    let head = 0;
    let result = 0;
    let periodCounter = 0;

    dto.periodList.forEach(item => {
      const periodEndTemp = item.chData.length + head + dto.offset;
      let currentSubstract = Math.abs(dto.target - periodEndTemp);
      if (!lastSubstract || (currentSubstract < lastSubstract)) {
        lastSubstract = currentSubstract;
        nearestNextChDataStart = periodEndTemp;
        result = periodCounter;
      }
      head = head + item.chData.length;
      periodCounter++;
    })

    return result;
  }

  getNearestNextChDataStart(dto: { periodList: Period3[], offset: number, target: number }): number {
    let result = 0;
    let lastSubstract = 0;
    let head = 0;

    dto.periodList.forEach(item => {
      const periodEndTemp = item.chData.length + head + dto.offset;
      let currentSubstract = Math.abs(dto.target - periodEndTemp);
      if (!lastSubstract || (currentSubstract < lastSubstract)) {
        lastSubstract = currentSubstract;
        result = periodEndTemp;
      }
      head = head + item.chData.length;
    })

    return result;
  }

  getDateString(date: Date): string {
    let result = '';
    const dt = new Date();
    const padL = (nr, len = 2, chr = `0`) => `${nr}`.padStart(2, chr);

    result =
      // `${padL(dt.getDate())}.${
      // padL(dt.getMonth()+1)}.${
      // dt.getFullYear()}` +
      `${padL(dt.getHours())}:${
        padL(dt.getMinutes())}:${
        padL(dt.getSeconds())}`;

    return result;
  }

  findPeriodLengthByNDots(x: Float32Array, start: number, allZeroCrosses: number[], delta = 154 / 16): number {
    /**
     * Measuring error
     */
      // const delta = 154 / 16;
    let result = 0;
    let found = false;

    allZeroCrosses.forEach(item => {
      if (item >= start && !found) {

      }
    })

    //
    // const cross: number = this.getNoteZeroCross(x, lastCross);

    const periodCrosses: number[] = [];
    periodCrosses[0] = this.getNoteZeroCross(x, start);
    periodCrosses[1] = this.getNoteZeroCross(x, periodCrosses[0]);
    periodCrosses[2] = this.getNoteZeroCross(x, periodCrosses[1]);

    const delta_01 = Math.abs(periodCrosses[0] - start);
    const delta_02 = Math.abs(periodCrosses[1] - periodCrosses[0]);
    const delta_03 = Math.abs(periodCrosses[2] - periodCrosses[1]);

    for (let i = 0; i + 2 < allZeroCrosses.length; i++) {
      if (allZeroCrosses[i] > start && allZeroCrosses[i] > periodCrosses[2] && !found) {
        const delta_b_01 = Math.abs(allZeroCrosses[i + 1] - allZeroCrosses[i]);
        const delta_b_02 = Math.abs(allZeroCrosses[i + 2] - allZeroCrosses[i + 1]);
        const delta_b_03 = Math.abs(allZeroCrosses[i + 3] - allZeroCrosses[i + 2]);

        if (
          (Math.abs(delta_01 - delta_b_01) < delta) &&
          (Math.abs(delta_02 - delta_b_02) < delta)
          // (Math.abs(delta_03 - delta_b_03) < delta)
        ) {
          result = allZeroCrosses[i];
          found = true;
        }
      }
    }

    return result;
  }


  findPeriodLengthByNDots2(periodStart: number, periodCrosses: number[], allZeroCrosses: number[], delta = 154 / 16): number {
    /**
     * Measuring error
     */
    delta = 154 / 4;
    let result = 0;
    let found = false;

    const delta_01 = Math.abs(periodCrosses[0] - periodStart);
    const delta_02 = Math.abs(periodCrosses[1] - periodCrosses[0]);
    const delta_03 = Math.abs(periodCrosses[2] - periodCrosses[1]);

    for (let i = 0; i + 2 < allZeroCrosses.length; i++) {
      if (allZeroCrosses[i] > periodCrosses[2] && !found) {
        const delta_b_01 = Math.abs(allZeroCrosses[i + 1] - allZeroCrosses[i]);
        const delta_b_02 = Math.abs(allZeroCrosses[i + 2] - allZeroCrosses[i + 1]);
        const delta_b_03 = Math.abs(allZeroCrosses[i + 3] - allZeroCrosses[i + 2]);

        if (
          (Math.abs(delta_01 - delta_b_01) < delta) &&
          (Math.abs(delta_02 - delta_b_02) < delta) &&
          (Math.abs(delta_03 - delta_b_03) < delta)
        ) {
          result = allZeroCrosses[i];
          found = true;
        }
      }
    }

    return result;
  }

  generateWavFileButton_click(): void {
    try {
      this.generateWavFile2();
    } catch (e) {
      alert(e);
    }
  }

  private getNoteZeroCross(x: Float32Array, start: number): number {
    // hotfix
    let result = 0;
    let lastValue = x[start];
    let found = false;

    for (let i = start; found === false && i < x.length; i++) {
      if ((x[i] < 0) && (lastValue >= 0) ||
        (x[i] > 0) && (lastValue <= 0)) {
        result = i;
        found = true;
      }
      lastValue = x[i];
    }

    return result;
  }

  private getAllZeroCrosses(x: Float32Array, start): number[] {
    let result = [];
    let lastCross = start;
    let stop = false;

    // hotfix
    // for (let i = 0; i < x.length;) {
    // for (let i = 0; i < 8000;) {
    for (let i = 0; !stop;) {
      const cross: number = this.getNoteZeroCross(x, lastCross);
      if (cross <= 0) {
        stop = true;
      }

      result.push(cross);
      lastCross = cross;
      i = lastCross;
    }

    return result;
  }

  private getPeriodCrosses(channelData: Float32Array, start: number): number[] {
    const result: number[] = [];

    result[0] = this.getNoteZeroCross(channelData, start);
    result[1] = this.getNoteZeroCross(channelData, result[0]);
    result[2] = this.getNoteZeroCross(channelData, result[1]);

    return result;
  }

  private copyPeriodData(chData: Float32Array, chData2: Float32Array, period: Period, period2: Period): void {
    let pattPeriodI = period2.start;

    for (let i = period.start; i < period.end; i++) {
      chData[i] = 0.0;

      if (pattPeriodI <= period2.end) {
        chData[i] = chData2[pattPeriodI];
      }

      pattPeriodI++;
    }
  }

  private doMorphingInPeriod(chData: Float32Array, chData2: Float32Array, period: Period, period2: Period): void {
    let pattPeriodI = period2.start;

    let underZeroHalfWaves: Period[] = this.halfWaves(chData, period, 0);
    let pattUnderZeroHalfWaves: Period[] = this.halfWaves(chData2, period2, 0)

    let subZeroHalfWaves: Period[] = this.halfWaves(chData, period, 1);
    let pattSubZeroHalfWaves: Period[] = this.halfWaves(chData2, period2, 1);

    const substrackted: Float32Array = this.substracktHarmonicsFromSineWaveSignal(chData, underZeroHalfWaves[7], chData2, pattUnderZeroHalfWaves[3], 1);

    underZeroHalfWaves.forEach(item => {
      //   let pattPeriodI_2 = pattUnderZeroHalfWaves[3].start;

      const length = item.end - item.start;
      const sampleRate = 44100;
      const duration = length / sampleRate;
      const frequency = (1 / duration) * (1 / 2); //440;
      // const frequency = 440;

      const amplitube: number = this.getMaxAmplitube(chData, item) * 6;
      // const x: AudioBuffer = this.generateSineWaveSignal(frequency, amplitube, duration, 1, sampleRate);
      // const xData = x.getChannelData(0);
      // const xData: Float32Array = this.adjustSineWaveSignal(chData, item, chData2, pattUnderZeroHalfWaves[3], amplitube);
      // const xData: Float32Array = this.addHarmonicsToSineWaveSignal(chData, item, chData2, pattUnderZeroHalfWaves[1], amplitube);
      const xData: Float32Array = this.addHarmonicsToSineWaveSignal_2(chData, item, substrackted, 1);
      // const xData: Float32Array = this.adjustSineWaveSignal(chData, item, xDataPre, pattUnderZeroHalfWaves[3], amplitube);


      let pattPeriodI_2 = 0;

      for (let i = item.start; i <= item.end; i++) {
        //     // chData[i] = 0.5;
        //     if (pattPeriodI_2 < pattUnderZeroHalfWaves[3].end) {
        //       chData[i] = chData2[pattPeriodI_2];
        //     }
        //
        //     pattPeriodI_2++;

        if (pattPeriodI_2 <= xData.length) {
          chData[i] = xData[pattPeriodI_2];
        }

        pattPeriodI_2++;
      }
    })


    subZeroHalfWaves.forEach(item => {
      //   let pattPeriodI_2 = pattUnderZeroHalfWaves[3].start;

      const length = item.end - item.start;
      const sampleRate = 44100;
      const duration = length / sampleRate;
      const frequency = (1 / duration) * (1 / 2); //440;
      // const frequency = 440;

      const amplitube: number = -this.getMinAmplitube(chData, item) * 6;
      // const x = this.generateSineWaveSignal(frequency, amplitube, duration, 1, sampleRate);
      // const xData = x.getChannelData(0);
      // const xData: Float32Array = this.adjustSineWaveSignal(chData, item, chData2, pattSubZeroHalfWaves[1], amplitube);
      // const xData: Float32Array = this.addHarmonicsToSineWaveSignal(chData, item, chData2, pattSubZeroHalfWaves[1], amplitube);
      const xData: Float32Array = this.addHarmonicsToSineWaveSignal_2(chData, item, substrackted, 1);

      let pattPeriodI_2 = 0;

      for (let i = item.start; i <= item.end; i++) {
        //     // chData[i] = 0.5;
        //     if (pattPeriodI_2 < pattUnderZeroHalfWaves[3].end) {
        //       chData[i] = chData2[pattPeriodI_2];
        //     }
        //
        //     pattPeriodI_2++;

        if (pattPeriodI_2 <= xData.length) {
          chData[i] = xData[pattPeriodI_2];
        }

        pattPeriodI_2++;
      }
    })

    // subZeroHalfWaves.forEach(item => {
    //   let pattPeriodI_2 = pattSubZeroHalfWaves[3].start;
    //
    //   for (let i = item.start; i <= item.end; i++) {
    //     // chData[i] = -0.5;
    //     if (pattPeriodI_2 < pattSubZeroHalfWaves[3].end) {
    //       chData[i] = chData2[pattPeriodI_2];
    //     }
    //
    //     pattPeriodI_2++;
    //   }
    // })

    for (let i = period.start; i < period.end; i++) {
      // chData[i] = 0.0;

      if (pattPeriodI <= period2.end) {
        chData[i] = chData2[pattPeriodI];
      }

      pattPeriodI++;
    }
  }

  private halfWaves(chData: Float32Array, period: Period, direction: number): Period[] {
    const result: Period[] = [];
    let lastChData = 0;
    let lastStart = 0;
    let lastEnd = 0;

    for (let i = period.start; i < period.end; i++) {
      /**
       * Не понятно почему когда direction === 0, то неравенство нестрогое
       * а когда direction === 1, то строгое
       */
      if (direction === 0) {
        if (lastChData <= 0 && chData[i] >= 0) {
          lastStart = i;
        } else if (lastChData >= 0 && chData[i] <= 0) {
          lastEnd = i
        }
      } else {
        if (lastChData > 0 && chData[i] < 0) {
          lastStart = i;
        } else if (lastChData < 0 && chData[i] > 0) {
          lastEnd = i
        }
      }

      if (lastStart && lastEnd) {
        result.push(
          {
            start: lastStart,
            end: lastEnd,
            crosses: [],
            periodLength: 0
          });
        lastStart = 0;
        lastEnd = 0;
      }

      lastChData = chData[i];
    }

    return result;
  }

  private getMaxAmplitube(chData: Float32Array, item: Period): number {
    let result = chData[0];

    for (let i = item.start; i < item.end; i++) {
      if (chData[i] > result) {
        result = chData[i];
      }
    }

    return result;
  }

  private getMinAmplitube(chData: Float32Array, item: Period): number {
    let result = chData[0];

    for (let i = item.start; i < item.end; i++) {
      if (chData[i] < result) {
        result = chData[i];
      }
    }

    return result;
  }

  getAdjustedChDataForPeriod(dto: { chData: Float32Array; targetLength: number; amplitude?: number }): Float32Array {
    let result: Float32Array = new Float32Array(dto.targetLength);
    const multiplier = dto.chData.length / dto.targetLength;
    const amplitude = dto.amplitude ? dto.amplitude : 1;
    for (let i = 0; i < result.length; i++) {
      result[i] = dto.chData[Math.round(i * multiplier)] * amplitude;
    }

    return result;
  }

  private adjustSineWaveSignal(chData: Float32Array, period: Period, chData2: Float32Array, period2: Period, amplitube: number): Float32Array {
    const targetLength = period.end - period.start;
    const currentLength = period2.end - period2.start;

    const result: Float32Array = new Float32Array(targetLength);
    const multiplier = currentLength / targetLength;

    const chData2Temp = new Float32Array(currentLength);

    let counterTemp = period2.start;

    for (let i = 0; i < chData2Temp.length; i++) {
      chData2Temp[i] = chData2[counterTemp];
      counterTemp++;
    }

    for (let i = 0; i < result.length; i++) {
      result[i] = chData2Temp[Math.round(i * multiplier)] * amplitube;
    }

    return result;
  }

  private addHarmonicsToSineWaveSignal(chData: Float32Array, period, chData2: Float32Array, period2: Period, amplitube: number): Float32Array {
    const targetLength = period.end - period.start;
    const currentLength = period2.end - period2.start;

    const result: Float32Array = new Float32Array(targetLength);

    let counterTemp = period.start;

    for (let i = 0; i < result.length; i++) {
      result[i] = chData[counterTemp] * 4;

      if (counterTemp / 2 % 1 === 0) {
        result[i] = result[i] + 0.05;
      } else {
        result[i] = result[i] - 0.05;
      }

      counterTemp++;
    }


    return result;
  }

  private substracktHarmonicsFromSineWaveSignal(chData: Float32Array, period: Period, chData2: Float32Array, period2: Period, number: number): Float32Array {
    const amplitube: number = this.getMaxAmplitube(chData, period);
    let adjusted = this.adjustSineWaveSignal(chData, period, chData2, period2, amplitube);

    const targetLength = period.end - period.start;
    const result: Float32Array = new Float32Array(targetLength);

    let slopePeriods: Period[] = [];
    let lastStart = period2.start;
    let lastEnd = period2.start;
    let lastSign = 1;
    let lastValue = chData2[lastStart];

    for (let i = period2.start; i < period2.end; i++) {
      if (lastSign > 0 && chData2[i] < lastValue) {
        lastSign = -1;
      } else if (lastSign < 0 && chData2[i] > lastValue) {
        lastEnd = i;
        lastSign = +1;
        slopePeriods.push(
          {
            start: lastStart,
            end: lastEnd,
            periodLength: 0,
            crosses: []
          });
        lastStart = i;
      }
      lastValue = chData2[i];
    }

    let resultI = 0;

    slopePeriods.forEach(item => {

      console.log('test')
      let delta = 0;
      let deltaForItem = chData2[item.end];

      if (chData2[item.start] > 0) {
        if (chData2[item.start] > chData2[item.end]) {
          deltaForItem = chData2[item.start];
        } else {
          deltaForItem = chData2[item.end];
        }
      } else if (chData2[item.start] < 0) {
        if (chData2[item.start] < chData2[item.end]) {
          deltaForItem = chData2[item.start];
        } else {
          deltaForItem = chData2[item.end];
        }
      }

      let length = item.end - item.start;

      if (chData2[item.end] > chData2[item.start]) {
        delta = chData2[item.end] - chData2[item.start];
      } else if (chData2[item.end] < chData2[item.start]) {
        delta = chData2[item.end] - chData2[item.start];
      }

      let reducer = 1;

      for (let i = item.start; i < item.end; i++) {
        let length2 = item.end - i;

        if (delta > 0) {
          // result[resultI] = (chData2[i] * 1.6) + (delta * length2 / length) - delta * 0.01 * reducer - deltaForItem;
          result[resultI] = (chData2[i] * 1.6) + (delta * length2 / length) - delta * 0.00001 * reducer - deltaForItem * 1.8;
        } else if (delta < 0) {
          // result[resultI] = (chData2[i] * 1.6) - (delta * length2 / length) + delta * 0.01 * reducer + deltaForItem;
          result[resultI] = (chData2[i] * 1.6) - (delta * length2 / length) + delta * 0.00001 * reducer + deltaForItem * 1.8;
        }

        if (result[resultI] >= 1) {
          result[resultI] = 0
        }

        reducer++;

        resultI++;
      }
    })

    let counterTemp = period2.start;

    for (let i = 0; i < result.length; i++) {
      // result[i] = chData[counterTemp];
      // result[i] = adjusted[i];

      // if (adjusted[i] < 0) {
      //   result[i] = (adjusted[i] * 1.6) - chData[counterTemp];
      // } else {
      //   result[i] = - (adjusted[i] * 1.6) + chData[counterTemp];
      // }

      // result[i] = (chData2[counterTemp] * 1.6);

      counterTemp++;
    }


    return result;
  }


  private addHarmonicsToSineWaveSignal_2(chData: Float32Array, period: Period, chData2: Float32Array, number: number): Float32Array {
    const amplitube: number = this.getMaxAmplitube(chData, period) * 6;

    const targetLength = period.end - period.start;
    const result: Float32Array = new Float32Array(targetLength);

    let testPeriod: Period = {
      start: 0,
      end: chData2.length,
      crosses: [],
      periodLength: 0
    };


    // const temp: Float32Array = this.adjustSineWaveSignal(chData, period, chData2, testPeriod, 1);

    let counterTemp = period.start;
    let i_second = 0;
    for (let i = 0; i < result.length; i++) {
      // result[i] = temp[i] * 4;
      // result[i] = (chData[counterTemp]) * 1;
      // result[i] = (chData[counterTemp] + (temp[i] * 2)) * 4;
      // result[i] = ((chData[counterTemp] * 3) + (temp[i] * 5));
      // result[i] = ((chData[counterTemp] * 3) + (chData2[i] * 5));

      if (i_second >= chData2.length) {
        i_second = 0;
      }
      // result[i] = ((chData[counterTemp] * 3) + (chData2[i_second] * 0.5));
      result[i] = ((chData[counterTemp] * 3));
      // result[i] = ((chData2[i_second] * 1));


      counterTemp++;
      i_second++;

      // if (i < temp.length) {
      // result[i] = temp[i] * 4;

      // if(result[i] < 0) {
      //   // result[i] = result[i] - (chData2[i] * 4); // + 0.5;
      //
      //   result[i] = - (chData2[i] * 4);
      // } else {
      //   // result[i] = result[i] + (chData2[i] * 4); // + 0.5;
      //
      //   result[i] = (chData2[i] * 4);
      // }
      // }
    }
    // let counterTemp = period.start;
    //
    // for (let i = 0; i < result.length; i++) {
    //   result[i] = chData[counterTemp];
    //   if (i < chData2.length) {
    //     if(result[i] < 0) {
    //       // result[i] = result[i] - (chData2[i] * 4); // + 0.5;
    //
    //       result[i] = - (chData2[i] * 4);
    //     } else {
    //       // result[i] = result[i] + (chData2[i] * 4); // + 0.5;
    //
    //       result[i] = (chData2[i] * 4);
    //     }
    //
    //   }
    //
    //   result[i] = result[i] * 3;
    //
    //   // result[i] = chData[counterTemp] + chData2[i];
    //   // result[i] = - chData[counterTemp];// - chData2[i];
    //   counterTemp++;
    // }

    return result;
  }
}
