import {Component, OnInit} from '@angular/core';
import * as WavFileEncoder from "wav-file-encoder";

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

    const pattern_notes = this.scanPatternNotes(x_pattern_01);
    const notes = this.scanNotes(x2);

    notes[0].periods.forEach(item => {
      for (let i = item.start, iPattern = pattern_notes[0].start; i < x2.length && i < item.end; i++, iPattern++) {
        x2[i] = x_pattern_01[iPattern];
      }
    })

    debugger;

    this.channelData = x2.slice(0, 5000);
    this.patternChannelData = x_pattern_01.slice(0, 5000);


    // this.applyRandomePitch(x2, notes);

    const wavFileData = WavFileEncoder.encodeWavFile(audioBuffer_02, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    this.openSaveAsDialog(blob, "test.wav");


  }

  scanPatternNotes(x: Float32Array): Note[] {
    const startScanTreshold = 0.035;
    let firstNoteStart = 0;

    // for (let i = 0; firstNoteStart === 0; i++) {
    //   if(Math.abs(x[i]) >= startScanTreshold) {
    //     firstNoteStart = i;
    //   }
    // }

    firstNoteStart = this.getNoteZeroCross(x,2530);


    const cross_01: number = this.getNoteZeroCross(x, firstNoteStart);
    const cross_02: number = this.getNoteZeroCross(x, cross_01);
    const cross_03: number = this.getNoteZeroCross(x, cross_02);

    const allZeroCrosses = this.getAllZeroCrosses(x, firstNoteStart);

    allZeroCrosses.forEach(item => {
      // x[item] = 0.2;
    })

    // x[cross_01] = 0.3;
    // x[cross_02] = 0.3;
    // x[cross_03] = 0.3;
    // x[firstNoteStart] = 1;

    const note_01: Note = {
      start: allZeroCrosses[0],
      length: 0,
      periods: [
        {
          periodLength: 0,
          croses: [cross_01, cross_02, cross_03]
        }
      ],
    };



    // const periods = this.findNotePeriods(x, note_01);
    const period_01_start = this.findPeriodLengthByNDots(x, note_01.start, note_01.periods[0], allZeroCrosses);
    const period_02_start = this.findPeriodLengthByNDots(x, period_01_start, note_01.periods[0], allZeroCrosses);
    const period_03_start = this.findPeriodLengthByNDots(x, period_02_start, note_01.periods[0], allZeroCrosses);


    // for (let i = note_01.start; i < x.length && i < period_01_start; i++) {
    //   x[i] = 0.25
    // }
    //
    // for (let i = period_01_start; i < x.length && i < period_02_start; i++) {
    //   x[i] = 0.5
    // }

    // x[period_01_start] = 0.75;
    // x[period_02_start] = 0.8;
    // x[period_02_start] = 1;

    let firstNoteEnd = 0;

    for (let i = 0; firstNoteStart === 0; i++) {
      if(Math.abs(x[i]) >= startScanTreshold) {
        // firstNoteStart = i;
      }
    }

    let result: Note[] = [
      note_01
    ];
    return result;
  }


  scanNotes(x: Float32Array): Note[] {
    const startScanTreshold = 0.035;
    let firstNoteStart = 0;

    for (let i = 0; firstNoteStart === 0; i++) {
      if(Math.abs(x[i]) >= startScanTreshold) {
        firstNoteStart = i;
      }
    }

    const cross_01: number = this.getNoteZeroCross(x, firstNoteStart);
    const cross_02: number = this.getNoteZeroCross(x, cross_01);
    const cross_03: number = this.getNoteZeroCross(x, cross_02);
    const cross_04: number = this.getNoteZeroCross(x, cross_03);

    const allZeroCrosses = this.getAllZeroCrosses(x, firstNoteStart);

    allZeroCrosses.forEach(item => {
      // x[item] = 0.2;
    })

    // x[cross_01] = 0.3;
    // x[cross_02] = 0.3;
    // x[cross_03] = 0.3;
    // x[firstNoteStart] = 1;

    const note_01: Note = {
      start: allZeroCrosses[0],
      length: 0,
      periods: [
      ],
    };


    const period_00: Period = {
      start: 0,
      end: 0,
      croses: [cross_01, cross_02, cross_03, cross_04],
      // croses: [],
      periodLength: 0
    };

    const period_01: Period = {
      start: 0,
      end: 0,
      croses: [cross_01, cross_02, cross_03, cross_04],
      // croses: [],
      periodLength: 0
    };

    const period_02: Period = {
      start: 0,
      end: 0,
      croses: [cross_01, cross_02, cross_03, cross_04],
      // croses: [],
      periodLength: 0
    };

    const period_03: Period = {
      start: 0,
      end: 0,
      croses: [cross_01, cross_02, cross_03, cross_04],
      // croses: [],
      periodLength: 0
    };

    const period_04: Period = {
      start: 0,
      end: 0,
      croses: [cross_01, cross_02, cross_03, cross_04],
      // croses: [],
      periodLength: 0
    };

    // const periods = this.findNotePeriods(x, note_01);
    const period_01_start = this.findPeriodLengthByNDots(x, note_01.start, period_00, allZeroCrosses);
    const period_02_start = this.findPeriodLengthByNDots(x, period_01_start, period_00, allZeroCrosses);
    const period_03_start = this.findPeriodLengthByNDots(x, period_02_start, period_00, allZeroCrosses);
    const period_04_start = this.findPeriodLengthByNDots(x, period_03_start, period_00, allZeroCrosses);
    const period_05_start = this.findPeriodLengthByNDots(x, period_04_start, period_00, allZeroCrosses);


    period_00.start = note_01.start;
    period_00.end = period_01_start;
    period_00.periodLength = period_01_start - note_01.start;

    period_01.start = period_01_start;
    period_01.end = period_02_start;
    period_01.periodLength = period_02_start - period_01_start;

    period_02.start = period_02_start;
    period_02.end = period_03_start;
    period_02.periodLength = period_03_start - period_02_start;

    period_03.start = period_03_start;
    period_03.end = period_04_start;
    period_03.periodLength = period_04_start - period_03_start;

    period_04.start = period_04_start;
    period_04.end = period_05_start;
    period_04.periodLength = period_05_start - period_04_start;

    note_01.periods.push(period_00);
    note_01.periods.push(period_01);
    note_01.periods.push(period_02);
    note_01.periods.push(period_03);
    note_01.periods.push(period_04);

    // for (let i = note_01.start; i < x.length && i < period_01_start; i++) {
    //   x[i] = 0.25
    // }
    //
    // for (let i = period_01_start; i < x.length && i < period_02_start; i++) {
    //   x[i] = 0.5
    // }

    // x[period_01_start] = 0.75;
    // x[period_02_start] = 0.8;
    // x[period_02_start] = 1;

    let firstNoteEnd = 0;

    for (let i = 0; firstNoteStart === 0; i++) {
      if(Math.abs(x[i]) >= startScanTreshold) {
        // firstNoteStart = i;
      }
    }

    let result: Note[] = [
      note_01
    ];
    return result;
  }

  findPeriodLengthByNDots(x: Float32Array, start: number, period: Period, allZeroCrosses: number[]): number {
    /**
     * Measuring error
     */
    const delta = 154 / 16;
    let result = 0;
    let found = false;

    allZeroCrosses.forEach(item => {
      if(item >= start && !found) {

      }
    })

    for (let i = 0; i + 2 < allZeroCrosses.length; i++) {
      if(allZeroCrosses[i] > start && allZeroCrosses[i] > period.croses[2] && !found) {
        const delta_01 = Math.abs(period.croses[1] - period.croses[0]);
        const delta_02 = Math.abs(period.croses[2] - period.croses[1]);
        const delta_03 = Math.abs(period.croses[3] - period.croses[2]);

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

    // hotfix
    // for (let i = 0; i < x.length;) {
    for (let i = 0; i < 5000;) {
      const cross: number = this.getNoteZeroCross(x, lastCross);
      result.push(cross);
      lastCross = cross;
      i = lastCross;
    }

    return result;
  }
}

export interface Note {
  start: number;
  length: number;
  periods: Period[];
}


export interface Period {
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
