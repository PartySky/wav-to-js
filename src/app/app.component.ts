import {Component, HostListener, OnInit} from '@angular/core';
import * as WavFileEncoder from "wav-file-encoder";
import {UiParms} from "./uiParms";
import {Period} from "./period";
import {Note} from "./note";
import {getTransitionSampleName} from "./getTransitionSampleName";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  channelData: Float32Array;
  patternChannelData: Float32Array;
  dataToRender: Float32Array;
  notesToRender: Note[] = [];
  notesReadMode = true;
  drawMarkers = false;

  constructor() {
  }

  ngOnInit() {
    this.initMidi();
    this.generateWavFileButton_click();
  }

  initMidi(): void {
    // @ts-ignore
    navigator.requestMIDIAccess()
      .then(this.onMIDISuccess.bind(this), this.onMIDIFailure)
  }

  onMIDIFailure(): void {
    console.log('Could not access your MIDI devices.');
  }

  onMIDISuccess(midiAccess): void {
    for (let input of midiAccess.inputs.values()) {
      input.onmidimessage = this.getMIDIMessage;
    }
  }

  getMIDIMessage(midiMessage) {
    console.log(midiMessage);
  }

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    let key = event.code;

    const maxNoteAmount = 30;
    let noteId = 0;
    if (key === "KeyA") {
      noteId = 1;
    } else if (key === "KeyD") {
      noteId = 2;
    } else if (key === "KeyG") {
      noteId = 3;
    }

    if (key === "KeyM") {
      this.generateWavFile();
    } else if (key === "KeyL") {
      this.drawMarkers = true;
      this.generateWavFile();
    } else if (key === "KeyR") {
      this.notesToRender = [];
    }

    if (!noteId) {
      return;
    }
    const sampleRate = 44100;

    if (this.notesToRender.length < maxNoteAmount) {
      this.notesToRender.push({
        offset: (new Date().getTime() * 0.001) * sampleRate,
        noteId: noteId,
      });
    }
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

  async generateWavFile() {
    const uiParms = this.getUiParms();
    if (!uiParms) {
      return;
    }
    const audioCtx = new AudioContext();

    const ab_pattern_01 = await this.getFileFromUrl('assets/pattern.wav');
    const AB_Note_Zero = await this.getFileFromUrl('assets/Note Zero.wav');
    const AB_Note_A = await this.getFileFromUrl('assets/Tenor Sax Eb.wav');
    const AB_Note_B = await this.getFileFromUrl('assets/Tenor Sax F.wav');
    const AB_Note_C = await this.getFileFromUrl('assets/Tenor Sax G.wav');

    const AB_Transition_Eb_F = await this.getFileFromUrl('assets/Eb2 Up2.wav');
    const AB_Transition_F_G = await this.getFileFromUrl('assets/F2 Up2.wav');

    let audBuff_pattern_01 = await audioCtx.decodeAudioData(ab_pattern_01);
    let audioBuffer_Note_Zero = await audioCtx.decodeAudioData(AB_Note_Zero);
    let audioBuffer_Note_A = await audioCtx.decodeAudioData(AB_Note_A);
    let audioBuffer_Note_B = await audioCtx.decodeAudioData(AB_Note_B);
    let audioBuffer_Note_C = await audioCtx.decodeAudioData(AB_Note_C);

    let audioBuffer_Transition_Eb_F = await audioCtx.decodeAudioData(AB_Transition_Eb_F);
    let audioBuffer_Transition_F_G = await audioCtx.decodeAudioData(AB_Transition_F_G);

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

    let chDataListForMixDown: { periodList: Period[], offset: number }[] = [];

    if (this.notesReadMode && this.notesToRender.length) {
      const zeroOffset = this.notesToRender[0].offset;

      let i = 0;
      this.notesToRender.forEach(item => {
        item.offset = item.offset - zeroOffset;
        let noteABTemp: AudioBuffer;
        let nextItem = this.notesToRender[i + 1];
        let nextNoteId = nextItem ? nextItem.noteId : null;
        let sampleName = getTransitionSampleName([
          item.noteId,
          nextNoteId
        ]);
        if (sampleName === 'Eb2 F') {
          noteABTemp = audioBuffer_Transition_Eb_F;
        } else if (sampleName === 'F G') {
          noteABTemp = audioBuffer_Transition_F_G;
        } else if (sampleName === 'Eb') {
          noteABTemp = audioBuffer_Note_A;
        } else if (sampleName === 'F') {
          noteABTemp = audioBuffer_Note_B;
        } else if (sampleName === 'G') {
          noteABTemp = audioBuffer_Note_C;
        }
        const periodList = this.getChanelDataList(noteABTemp.getChannelData(0));

        chDataListForMixDown.push({
          periodList: periodList,
          offset: item.offset,
        });
        i++;
      })
      this.notesToRender = [];
    } else {
      chDataListForMixDown = [
        {periodList: this.getChanelDataList(audioBuffer_Note_A.getChannelData(0)), offset: 0},
        {periodList: this.getChanelDataList(audioBuffer_Note_B.getChannelData(0)), offset: 6000}, // 1200
      ];
    }

    const outPutChDataTemp = this.mixDownChDatas(chDataListForMixDown);

    for (let i = 0; i < outPutChDataTemp.length; i++) {
      outPutChData[i] = outPutChDataTemp[i];
    }

    const wavFileData = WavFileEncoder.encodeWavFile(outPutAB, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    this.openSaveAsDialog(blob, `test ${this.getDateString(new Date())}.wav`);
  }

  mixDownChDatas(chDataList: { periodList: Period[], offset: number }[]): Float32Array {
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
          offset: chDataList[chDataNum].offset,
          target: nextChDataStart
        });

        usedPeriodsNum = this.getUsedPeriodsForNearestNextChDataStart({
          periodList: periodListTemp,
          offset: chDataList[chDataNum].offset,
          target: nextChDataStart
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
              let amplitude = crossfadePeriodCounter / numPeriodsToCrossfade;

              if (crossfadePeriodCounter < numPeriodsToCrossfade) {
                nextChDataTemp.periodList[crossfadePeriodCounter].chData =
                  this.getAdjustedChDataForPeriod({
                    chData: nextChDataTemp.periodList[crossfadePeriodCounter].chData,
                    targetLength: item.chData.length,
                    amplitude: amplitude
                  });
              }
              crossfadePeriodCounter++;
            }

            periodCounter++;
          })
        }
      }

      const drawNextChDataStart = true && this.drawMarkers;
      if (drawNextChDataStart && nextChDataStart) {
        const markerWidth = 30; // 8
        for (let i = 0; i < markerWidth; i++) {
          result[nextChDataStart + i] = -2;
        }
      }

      const offsetTemp = chDataList[chDataNum].offset
      let i = offsetTemp;
      let periodCounter = 0;
      periodListTemp.forEach(period => {
        if (!renderMono || !usedPeriodsNum || (periodCounter < (usedPeriodsNum + numPeriodsToCrossfade))) {
          let amplitude = 1;
          if (usedPeriodsNum && periodCounter >= usedPeriodsNum) {
            amplitude = (numPeriodsToCrossfade - (periodCounter - usedPeriodsNum)) / numPeriodsToCrossfade;
          }
          period.chData.forEach(chData => {
            if (i < maxLenght) {
              if (!result[i]) {
                result[i] = 0;
              }
              if (chData) {
                result[i] = result[i] + chData * amplitude;
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

  getChanelDataList(chData: Float32Array): Period[] {
    let result: Period[] = [];
    let found = false;
    const tracholdLength = 200;

    let lastValue = 0;

    let chDataTemp: number[] = [];
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
        result.push({chData: new Float32Array(chDataTemp)});
        chDataTemp = [];
        chDataTempCounter = 0;
        found = false;
      }
      lastValue = chData[i];
    }

    const drawEdges = true && this.drawMarkers;

    if (drawEdges) {
      result.forEach(item => {
        item.chData[0] = 1;
        item.chData[1] = -1;
      })
    }

    return result;
  }

  getUsedPeriodsForNearestNextChDataStart(dto: { periodList: Period[], offset: number, target: number }): number {
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

  getNearestNextChDataStart(dto: { periodList: Period[], offset: number, target: number }): number {
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

  generateWavFileButton_click(): void {
    try {
      this.generateWavFile();
    } catch (e) {
      alert(e);
    }
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
}
