import {Component, OnInit} from '@angular/core';
import * as WavFileEncoder from "wav-file-encoder";
import {CR} from "@angular/compiler/src/i18n/serializers/xml_helper";

interface UiParms {
  frequency:      number;
  amplitude:      number;
  duration:       number;
  channels:       number;
  sampleRate:     number;
  wavFileType:    WavFileEncoder.WavFileType;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  channelData: Float32Array;
  patternChannelData: Float32Array;
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

  getRadioButtonGroupValue (name: string) : string | undefined {
    const a = document.getElementsByName(name);
    for (let i = 0; i < a.length; i++) {
      const e = <HTMLInputElement>a[i];
      if (e.checked) {
        return e.value; }}
    return undefined;
    }

  // When a parameter is invalid, an error message is displayed, the cursor is placed within
  // the affected field and the return value is undefined.
  getUiParms() : UiParms | undefined {
    const frequencyElement  = <HTMLInputElement>document.getElementById("frequency")!;
    const amplitudeElement  = <HTMLInputElement>document.getElementById("amplitude")!;
    const durationElement   = <HTMLInputElement>document.getElementById("duration")!;
    const channelsElement   = <HTMLInputElement>document.getElementById("channels")!;
    const sampleRateElement = <HTMLInputElement>document.getElementById("sampleRate")!;
    if (  !frequencyElement.reportValidity() ||
      !amplitudeElement.reportValidity()  ||
      !durationElement.reportValidity()  ||
      !channelsElement.reportValidity()  ||
      !sampleRateElement.reportValidity() ) {
      return; }
    const uiParms = <UiParms>{};
    uiParms.frequency  = frequencyElement.valueAsNumber;
    uiParms.amplitude  = amplitudeElement.valueAsNumber;
    uiParms.duration   = durationElement.valueAsNumber;
    uiParms.channels   = channelsElement.valueAsNumber;
    uiParms.sampleRate = sampleRateElement.valueAsNumber;
    uiParms.wavFileType = Number(this.getRadioButtonGroupValue("wavFileType"));
    return uiParms;
    }

  generateSineWaveSignal (frequency: number, amplitude: number, duration: number, channels: number, sampleRate: number) : AudioBuffer {
    const length = duration * sampleRate;
    const audioBuffer: AudioBuffer = new (<any>AudioBuffer)({length, numberOfChannels: channels, sampleRate});
    // <any> is used because the constructor declaration is missing in TypeScript 2.8.
    const omega = 2 * Math.PI * frequency;
    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let p = 0; p < length; p++) {
        channelData[p] = Math.sin(p / sampleRate * omega) * amplitude; }}
    return audioBuffer;
    }

  openSaveAsDialog (blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = fileName;
    const clickEvent = new MouseEvent("click");
    element.dispatchEvent(clickEvent);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    (<any>document).dummySaveAsElementHolder = element;
  }
  // to prevent garbage collection

  generateWavFile() {
    const uiParms = this.getUiParms();
    if (!uiParms) {
      return; }
    const audioBuffer = this.generateSineWaveSignal(uiParms.frequency, uiParms.amplitude, uiParms.duration, uiParms.channels, uiParms.sampleRate);
    const wavFileData = WavFileEncoder.encodeWavFile(audioBuffer, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    this.openSaveAsDialog(blob, "test.wav");
  }


  async generateWavFile2() {
    const uiParms = this.getUiParms();
    if (!uiParms) {
      return; }
    const audioBuffer = this.generateSineWaveSignal(uiParms.frequency, uiParms.amplitude, uiParms.duration, uiParms.channels, uiParms.sampleRate);

    const audioCtx = new AudioContext();
    const buffer = audioCtx.createBuffer(2, 22050, 44100);

    const ab_pattern_01 = await this.getFileFromUrl('assets/pattern.wav');
    const ab1 = await this.getFileFromUrl('assets/test.wav');

    let audBuff_pattern_01 = await audioCtx.decodeAudioData(ab_pattern_01);
    let audioBuffer_02 = await audioCtx.decodeAudioData(ab1);

    const x_pattern_01 = audBuff_pattern_01.getChannelData(0);
    const x1 = audioBuffer.getChannelData(0);
    const x2 = audioBuffer_02.getChannelData(0);
    const x2_right = audioBuffer_02.getChannelData(1);

    x2[1320] = 0;
    x2[1319] = -0.1;

    debugger;

    // const notes = this.scanNotes(x2);
    // const pattern_notes = this.scanNotes(x_pattern_01, 2530);

    const periods: Period[] = this.scanPeriods(x2, 1320 + 2);
    const patternPeriods: Period[] = this.scanPeriods(x_pattern_01, 1695 + 2);
    // const allZeroCrosses = this.getAllZeroCrosses(x2, 1320 + 2);


    const testI = 1;
    const doTest = false;
    const doTestOnRight = true;
    const doTestOnPattern = false;
    const doRenderPeriods = true;


    const maxPeriod = 10;

    if(doTest) {
      const chData = x2;
      // x2[periods[testI].start + 1] = 0.5;
      // x2[periods[testI].crosses[0] + 1] = -0.25;
      // x2[periods[testI].crosses[1] + 1] = -0.25;
      // x2[periods[testI].crosses[2] + 1] = -0.25;
      // x2[periods[testI].end + 1] = -0.5;

      let i = 0;

      periods.forEach(item => {
        if(i < maxPeriod) {
          chData[item.start + 1] = 0.25;
          chData[item.end + 3] = -0.25;
          item.crosses.forEach(cross => {
            chData[cross + 1] = -0.125;
          })
        }
        i++;
      })
    }

    if(doTestOnRight) {
      const chData = x2_right;

      let i = 0;

      periods.forEach(item => {
        if(i < maxPeriod) {
          chData[item.start + 1] = 0.25;
          chData[item.end + 3] = -0.25;
          item.crosses.forEach(cross => {
            chData[cross + 1] = -0.125;
          })
        }
        i++;
      })
    }

    if(doTestOnPattern) {
      const chData = x_pattern_01;

      let i = 0;

      patternPeriods.forEach(item => {
        if(i < maxPeriod) {
          chData[item.start + 1] = 0.25;
          chData[item.end + 3] = -0.25;
          item.crosses.forEach(cross => {
            chData[cross + 1] = -0.125;
          })
        }
        i++;
      })
    }

    if(doRenderPeriods && false) {
      const chData = x2;

      let i = 0;
      let volumeDelta = 0.001;
      let volumeTemp = -1;

      periods.forEach(item => {
        if(i < maxPeriod) {
          volumeTemp = -1;
          for (let iCounter = item.start; iCounter < item.end; iCounter++) {
            chData[iCounter] = volumeTemp;
            volumeTemp = volumeTemp + volumeDelta;

            if(volumeTemp > 1) {
              volumeTemp = -1;
            }
          }
        }
        i++;
      })
    }

    if(doRenderPeriods && false) {
      const chData = x2;

      let i = 0;
      let volumeDelta = 0.001;
      let volumeTemp = -1;

      periods.forEach(item => {
        if(i < maxPeriod) {
          let iPattern = 2530;
          for (let iCounter = item.start; iCounter < item.end; iCounter++) {
            chData[iCounter] =  x_pattern_01[iPattern];


            iPattern++;

            // if(volumeTemp > 1) {
            //   volumeTemp = -1;
            // }
          }
        }
        i++;
      })
    }

    if(doRenderPeriods) {
      const chData = x2;

      let i = 0;
      let volumeDelta = 0.001;
      let volumeTemp = -1;
      let patternPeriodCounter = 0;
      let patternSampleHeader = 0;

      debugger;
      periods.forEach(item => {

        patternSampleHeader = patternPeriods[patternPeriodCounter].start;
        if(i < maxPeriod && patternPeriodCounter < patternPeriods.length) {
          for (let iCounter = item.start; iCounter < item.end; iCounter++) {
            chData[iCounter] = x_pattern_01[patternSampleHeader];


            patternSampleHeader++;

          }
        }
        i++;
        patternPeriodCounter++;

      })
    }


    this.channelData = x2.slice(0, 30000);
    this.patternChannelData = x_pattern_01.slice(0, 15000);

    // this.applyRandomePitch(x2, notes);

    const wavFileData = WavFileEncoder.encodeWavFile(audioBuffer_02, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    this.openSaveAsDialog(blob, "test.wav");


  }

  scanNotes(channelData: Float32Array, patternFirstNoteStart = 0): Note[] {
    const startScanTreshold = 0.035;
    let firstNoteStart = 0;

    for (let i = 0; firstNoteStart === 0; i++) {
      if(Math.abs(channelData[i]) >= startScanTreshold) {
        firstNoteStart = i;
      }
    }

    if (patternFirstNoteStart) {
      firstNoteStart = patternFirstNoteStart;
    }

    const allZeroCrosses = this.getAllZeroCrosses(channelData, firstNoteStart);

    const note_01: Note = {
      start: allZeroCrosses[0],
      length: 0,
      periods: [
      ],
    };

    const someX = 750;
    // let lastCross = firstNoteStart;

    let lastStart = note_01.start;

    for (let i = 0; i < someX; i++) {
      const periodTemp: Period = {
        start: 0,
        end: 0,
        crosses: [],
        periodLength: 0
      };

      periodTemp.crosses = this.getPeriodCrosses(channelData, lastStart);

      let delta = null;

      if (patternFirstNoteStart) {
        delta = 154 / 4
      } else {
        delta = 154 / 16
      }

      const periodEnd = this.findPeriodLengthByNDots(channelData, lastStart, allZeroCrosses, delta);

      periodTemp.start = lastStart;
      periodTemp.end = periodEnd;
      periodTemp.periodLength = periodEnd - lastStart;

      note_01.periods.push(periodTemp);

      lastStart = periodEnd;
    }

    let firstNoteEnd = 0;

    for (let i = 0; firstNoteStart === 0; i++) {
      if(Math.abs(channelData[i]) >= startScanTreshold) {
        // firstNoteStart = i;
      }
    }

    let result: Note[] = [
      note_01
    ];
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
      if(item >= start && !found) {

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
      if(allZeroCrosses[i] > start && allZeroCrosses[i] > periodCrosses[2] && !found) {
        const delta_b_01 = Math.abs(allZeroCrosses[i + 1] - allZeroCrosses[i]);
        const delta_b_02 = Math.abs(allZeroCrosses[i + 2] - allZeroCrosses[i + 1]);
        const delta_b_03 = Math.abs(allZeroCrosses[i + 3] - allZeroCrosses[i + 2]);

        if(
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
      if(allZeroCrosses[i] > periodCrosses[2] && !found) {
        const delta_b_01 = Math.abs(allZeroCrosses[i + 1] - allZeroCrosses[i]);
        const delta_b_02 = Math.abs(allZeroCrosses[i + 2] - allZeroCrosses[i + 1]);
        const delta_b_03 = Math.abs(allZeroCrosses[i + 3] - allZeroCrosses[i + 2]);

        if(
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

  generateWavFileButton_click() {
    try {
      this.generateWavFile2();
    }
    catch (e) {
      alert(e);
    }
  }

  private applyRandomePitch(x: Float32Array, notes: Note[]) {
    notes.forEach(item => {
      for (let i = item.start; i < item.length; i++) {
        x[i] = -0.1;
      }
    });
  }

  private getNoteZeroCross(x: Float32Array, start: number) {
    // hotfix
    let result = 0;
    let lastValue = x[start];
    let found = false;

    for (let i = start; found === false && i < x.length; i++) {
      if((x[i] < 0) && (lastValue >= 0) ||
        (x[i] > 0) && (lastValue <= 0))  {
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
      if(cross <= 0) {
        stop = true;
      }

      result.push(cross);
      lastCross = cross;
      i = lastCross;
    }

    return result;
  }

  private getPeriodCrosses(channelData: Float32Array, start: number) {
    const result: number[]  = [];

    result[0] = this.getNoteZeroCross(channelData, start);
    result[1] = this.getNoteZeroCross(channelData, result[0]);
    result[2] = this.getNoteZeroCross(channelData, result[1]);

    return result;
  }

  private scanPeriods(channelData: Float32Array, start = 0): Period[] {
    const result: Period[] = [];

    const allZeroCrosses = this.getAllZeroCrosses(channelData, start);
    let lastStart = start;

    let crossTrigger = 9000;

    for (let i = 0; crossTrigger > 0 && i < 4000; i++) {

      const crosses = this.getPeriodCrosses(channelData, lastStart);
      crossTrigger = crosses[0];

      const periodEnd = this.findPeriodLengthByNDots2(lastStart, crosses, allZeroCrosses);
      const periodTemp: Period = {
        start: lastStart,
        end: periodEnd,
        crosses: crosses,
        periodLength: 0
      };
      result.push(periodTemp)
      lastStart = periodEnd;
    }

    return result;
  }
}

export interface Note {
  start: number;
  end?: number;
  length: number;
  periods: Period[];
}


export interface Period {
  start?: number;
  end?: number;
  periodLength: number;
  crosses: number[];
}

export interface Period2 {
  start?: number;
  end?: number;
  periodLength: number;
  croses: number[];
}

export interface NoteCrosses {
  first: number;
  second: number;
  third: number;
}
