import {Component, HostListener, OnInit} from '@angular/core';
import * as WavFileEncoder from "wav-file-encoder";
import {Period} from "./period";
import {Note} from "./note";
import {getTransitionSampleName} from "./getTransitionSampleName";
import {midiNoteNumbers} from "./midiNoteNumbers";
import {articulations} from "./articulations";
import {getFormattedName} from "./getFormattedName";
import {getArrayBufferFromUrl} from "./getArrayBufferFromUrl";
import {openSaveAsDialog} from "./openSaveAsDialog";
import {getDateString} from "./getDateString";
import {getUiParams} from "./getUiParams";
import {getJsonFromUrl} from "./getJsonFromUrl";
import {Plotter} from "./plotter";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  channelData: Float32Array;
  patternChannelData: Float32Array;
  notesToRender: Note[] = [];
  notesReadMode = true;
  drawMarkers = false;
  periods_Transition_Dictionary: { [key: string]: Period[] };
  onInitDateString: string;
  isDataReady = false;
  plt: Plotter;
  globalTestSwitch = false;

  constructor() {
  }

  async ngOnInit() {
    this.testSave();
    this.initPlt();
    await this.loadData();
    this.initMidi();
    this.onInitDateString = getDateString(new Date());
  }

  initPlt(): void {
    this.plt = new Plotter();
    this.plt.setMinAxisValues(0, 0);
    this.plt.setMaxAxisValues(20000, 1.2);
  }

  async loadData() {
    this.periods_Transition_Dictionary = await this.loadAudioBufferForSamples();
    this.isDataReady = true;
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
    if (!this.isDataReady) {
      console.log(`Data hasn't been loaded`);
      return;
    }

    let key = event.code;

    const maxNoteAmount = 30;
    let noteId = 0;
    if (key === "KeyK") {
      noteId = midiNoteNumbers.N_A2_45;
    } else if (key === "KeyJ") {
      noteId = midiNoteNumbers.N_Ab2_44;
    } else if (key === "KeyH") {
      noteId = midiNoteNumbers.N_G2_43;
    } else if (key === "KeyG") {
      noteId = midiNoteNumbers.N_F2_41;
    } else if (key === "KeyD") {
      noteId = midiNoteNumbers.N_Eb2_39;
    } else if (key === "KeyA") {
      noteId = midiNoteNumbers.N_B1_35;
    } else if (key === "KeyP") {
      noteId = midiNoteNumbers.N_C1_24_VibratoTrigger;
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

  async getArrayBufferFromUrl(url: string): Promise<ArrayBuffer> {
    return getArrayBufferFromUrl(url);
  }

  async getJsonFromUrl(url: string): Promise<number[]> {
    return getJsonFromUrl(url);
  }

  openSaveAsDialog(blob: Blob, fileName: string): void {
    openSaveAsDialog(blob, fileName);
  }

  async generateWavFile() {
    console.log('start generateWavFile')

    const uiParms = getUiParams();

    let chDataListForMixDown: { periodList: Period[], offset: number }[] = [];

    if (this.notesReadMode && this.notesToRender.length) {
      const zeroOffset = this.notesToRender[0].offset;

      /**
       * Для соединения быстрых нот и вибрато
       */
      if (false && this.notesToRender[1]) {
        this.notesToRender[1].offset = this.notesToRender[0].offset + 1000;
      }

      let i = 0;
      this.notesToRender.forEach(item => {
        item.offset = item.offset - zeroOffset;
        let periodList: Period[];
        let nextItem = this.notesToRender[i + 1];
        let nextNoteId = nextItem ? nextItem.noteId : null;
        let previousItem = this.notesToRender[i - 1];
        let previousNoteId = previousItem ? previousItem.noteId : null;
        let sampleName = getTransitionSampleName([
          item.noteId,
          nextNoteId,
          previousNoteId,
        ]);

        if (sampleName) {
          periodList = this.periods_Transition_Dictionary[sampleName];
          if (nextNoteId === midiNoteNumbers.N_C1_24_VibratoTrigger) {
            periodList = this.trimPeriodNFromEnd(periodList, 5); // last value 1500 samples
          }

          chDataListForMixDown.push({
            periodList: periodList,
            offset: item.offset,
          });
        }
        i++;
      })
      this.notesToRender = [];
    }

    let outPutChDataTemp: Float32Array;
    let test = true;
    // hotfix
    if (!test) {
      outPutChDataTemp = this.mixDownChDatas(chDataListForMixDown);
    }

    if (test) {
      // @ts-ignore
      outPutChDataTemp = [];
      let counter = 0;
      // 35 ArtFastDown RR1

      const drawMarker = true;

      // const indexTemp = 52;
      // const interval = 1;
      // let periodsTest = this.periods_Transition_Dictionary[getFormattedName({
      //   midiNum: indexTemp,
      //   midiNumSecond: indexTemp + interval,
      //   art: articulations.leg,
      //   rr: 1
      // })];
      //
      // let xTemp = [];
      //
      // periodsTest.forEach(item => {
      //   item.chData.forEach(ch => {
      //     xTemp.push(ch);
      //   })
      // })
      //
      // this.plt.plot(xTemp);

      const lengthTemp = 10;
      for (let i = 1; i < lengthTemp; i++) {
        if (drawMarker) {
          outPutChDataTemp[counter] = 1;
          counter++;
          outPutChDataTemp[counter] = 1;
          counter++;
          outPutChDataTemp[counter] = 1;
          counter++;
          outPutChDataTemp[counter] = 1;
          counter++;
          outPutChDataTemp[counter] = 1;
          counter++;
        }

        const indexTemp = 52;
        const interval = 1;
        let periods = this.periods_Transition_Dictionary[getFormattedName({
          midiNum: indexTemp,
          midiNumSecond: indexTemp + interval,
          art: articulations.leg,
          rr: i
        })];

        let notePairLengthTemp = 0;
        periods.forEach(period => {
          period.chData.forEach(item => {
            outPutChDataTemp[counter] = item;
            counter++;
          })

          // notePairLengthTemp = notePairLengthTemp + period.chData.length;
        })

        notePairLengthTemp = periods[0].chData.length;

        if (false) {
          this.plt.plot(outPutChDataTemp);
          this.plt.plotVerticalLine(outPutChDataTemp.length, 'red');
          this.plt.plotText(notePairLengthTemp.toString(), outPutChDataTemp.length, 0.2 + i * 0.1, 'red', '#8ec5ba');
          this.plt.show();
        }

        if (drawMarker) {
          outPutChDataTemp[counter] = -1;
          counter++;
          outPutChDataTemp[counter] = -1;
          counter++;
          outPutChDataTemp[counter] = -1;
          counter++;
          outPutChDataTemp[counter] = -1;
          counter++;
          outPutChDataTemp[counter] = -1;
          counter++;
        }
      }

      outPutChDataTemp = new Float32Array(outPutChDataTemp);
    }

    const outPutAB: AudioBuffer = new AudioBuffer({
      length: outPutChDataTemp.length,
      numberOfChannels: 2,
      sampleRate: uiParms.sampleRate,
    });

    outPutAB.copyToChannel(outPutChDataTemp, 0);

    const wavFileData = WavFileEncoder.encodeWavFile(outPutAB, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    this.openSaveAsDialog(blob, `test ${getDateString(new Date())}.wav`);
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
      /**
       * Обычное значение 15
       * 5 для соединения короткой ноты и вибрато
       */
      const numPeriodsToCrossfade = 5; // 15;
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


  getChanelDataList_02(chData: Float32Array): Period[] {
    let result: Period[] = [];

    if (!chData) {
      return result;
    }

    const scanDataLength = 100;
    const scanRoadLength = 200;
    const diffTrashold = 10;

    for (let i = 0; i < chData.length - scanRoadLength; i++) {
      let scanData: number[] = [];
      for (let x = i; x < scanDataLength; x++) {
        scanData[x] = chData[x];
      }
      let diff = 0;
      let scanDataIterator = 0;
      for (let x = i; x < scanRoadLength; x++) {
        diff = chData[x] - scanData[scanDataIterator]
        scanDataIterator++;
      }

      // todo

    }

    let found = false;
    const tracholdLength = 300; // 200

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

  periodsFromChData(chData: Float32Array, periods: number[]): Period[] {
    let result: Period[] = [];

    let previousIndex = 0;
    periods.forEach(periodIndex => {
      let chDateTemp = new Float32Array(chData.slice(previousIndex, periodIndex));
      result.push({chData: chDateTemp});
      previousIndex = periodIndex;
    })

    return result;
  }

  // Deprecated
  getChanelDataList_Old(chData: Float32Array): Period[] {
    let result: Period[] = [];

    if (!chData) {
      return result;
    }

    let found = false;
    const tracholdLength = 300; // 200

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

  async loadAudioBufferForSamples(): Promise<{ [key: string]: Period[] }> {
    console.log('start loadAudioBufferForSamples')

    let audioBuffer_FastSprite_Down_midiNum_List: Period[][][] = [];
    let audioBuffer_FastSprite_Up_midiNum_List: Period[][][] = [];
    let audioBuffer_VibratoSprite_midiNum_List: Period[][][] = [];
    let audioBuffer_LegatoPairs_Up_01_midiNum_List: Period[][][] = [];

    const audioCtx = new AudioContext();

    const skipped = true;

    if (!skipped) {
      for (let i = 35; i < 71; i++) {
        const fileName = `assets/lib/Fast/Fast Sprite ${i}`;

        const audioBufferTemp = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`${fileName}.wav`));
        const periodsTemp = await this.getJsonFromUrl(`${fileName}.json`);

        const periodsFromChData = this.periodsFromChData(audioBufferTemp.getChannelData(0), periodsTemp);
        const period_FastSprite_Down_Up_midiNum_List: Period[][] = this.getNoteListFromSprites(periodsFromChData);
        audioBuffer_FastSprite_Down_midiNum_List[i] = this.getStrokesList(period_FastSprite_Down_Up_midiNum_List, 'Down');
        audioBuffer_FastSprite_Up_midiNum_List[i] = this.getStrokesList(period_FastSprite_Down_Up_midiNum_List, 'Up');
      }

      const trimVibFromStart = 2500;
      for (let i = 42; i < 72; i++) {
        const audioBufferTemp = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`assets/lib/Vibrato/Vibrato Sprite ${i}.wav`));
        // todo: uncomment it
        // audioBuffer_VibratoSprite_midiNum_List[i] = this.trimNFromStartForArray(
        //   this.getPeriodListForNoteListFromSprites(audioBufferTemp.getChannelData(0)), trimVibFromStart
        // );
      }
    }

    for (let i = 52; i < 71; i++) {
      const fileName = `assets/lib/Legato/Legato Up 01/Legato Up 01 Sprite ${i}`;
      const audioBufferTemp = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`${fileName}.wav`));
      const periodsTemp = await this.getJsonFromUrl(`${fileName}.json`);
      const periodsFromChData = this.periodsFromChData(audioBufferTemp.getChannelData(0), periodsTemp);

      this.globalTestSwitch = false;
      if (i === 52) {
        debugger;
        this.globalTestSwitch = true;
      }
      audioBuffer_LegatoPairs_Up_01_midiNum_List[i] = this.getLegatoNotePairListFromSprite(periodsFromChData);
    }

    let result: { [key: string]: Period[] } = {};

    audioBuffer_FastSprite_Down_midiNum_List.forEach((periodListList, index) => {
      if (periodListList) {
        let localRR = 0;
        periodListList.forEach(periodList => {
          result[getFormattedName({
            midiNum: index,
            art: articulations.fastDown,
            rr: localRR
          })] =
            periodList;
          localRR++;
        })
      }
    })

    audioBuffer_FastSprite_Up_midiNum_List.forEach((periodListList, index) => {
      if (periodListList) {
        let localRR = 0;
        periodListList.forEach(periodList => {
          result[getFormattedName({
            midiNum: index,
            art: articulations.fastUp,
            rr: localRR
          })] =
            periodList;
          localRR++;
        })
      }
    })

    audioBuffer_VibratoSprite_midiNum_List.forEach((periodListList, index) => {
      if (periodListList) {
        let localRR = 0;
        periodListList.forEach(periodList => {
          result[getFormattedName({
            midiNum: index,
            art: articulations.vib,
            rr: localRR
          })] =
            periodList;
          localRR++;
        })
      }
    })

    audioBuffer_LegatoPairs_Up_01_midiNum_List.forEach((periodList, index) => {
      if (periodList) {
        const interval = 1;
        let localRR = 0;
        periodList.forEach(periodList => {
          result[getFormattedName({
            midiNum: index,
            midiNumSecond: index + interval,
            art: articulations.leg,
            rr: localRR
          })] =
            periodList;
          localRR++;
        })
      }
    })

    console.log('end loadAudioBufferForSamples')

    return result;
  }

  getNoteListFromSprites(periodsFromChData: Period[]): Period[][] {
    let lastPeriodMax = 0;
    const minPeriodsInNote = 4;
    let periodsForCurrentNote: Period[] = [];
    let periodCounter = 0;
    const delta = 0.05;
    const drawMarker = false;

    let result: Period[][] = [];

    periodsFromChData.forEach(period => {
      let currentMax = 0;

      period.chData.forEach(chDataItem => {
        if (chDataItem > currentMax) {
          currentMax = chDataItem;
        }
      })

      if (periodCounter <= 1) {
        if (drawMarker) {
          period.chData[0] = -0.25;
        }
        periodsForCurrentNote.push(period);
      } else if (currentMax - delta <= lastPeriodMax || periodCounter < minPeriodsInNote) {
        /**
         * Нужно писать chData ноты в текущую ноту в result
         */
        if (drawMarker) {
          period.chData[0] = 0.5;
        }
        periodsForCurrentNote.push(period);
      } else {
        /**
         * Началась новая нота
         */
        result.push(periodsForCurrentNote);
        periodsForCurrentNote = [];

        if (drawMarker) {
          period.chData[0] = -0.75;
        }

        periodsForCurrentNote.push(period);

        lastPeriodMax = 0;
        periodCounter = 0;
      }

      lastPeriodMax = currentMax;
      periodCounter++;
    })

    return result;
  }

  private getStrokesList(dataList: Period[][], stroke: string): Period[][] {
    let result: Period[][] = [];

    let i = 0;
    dataList.forEach(item => {
      if (stroke === 'Down') {
        if (!(i & 1)) {
          result.push(item);
        }
      } else if (stroke === 'Up') {
        if (i & 1) {
          result.push(item);
        }
      }
      i++;
    })

    return result;
  }

  trimNFromStartForArray(chData: Float32Array[], length: number): Float32Array[] {
    let result: Float32Array[] = [];

    chData.forEach(item => {
      result.push(this.trimNFromStart(item, length));
    })

    return result;
  }

  trimNFromStart(chData: Float32Array, length: number): Float32Array {
    let result: number[] = [];

    for (let i = length; i < chData.length; i++) {
      result.push(chData[i]);
    }

    return new Float32Array(result);
  }

  trimNFromEnd(chData: Float32Array, length: number): Float32Array {
    let result: number[] = [];

    for (let i = 0; i < chData.length - length; i++) {
      result.push(chData[i]);
    }

    return new Float32Array(result);
  }


  trimPeriodNFromEnd(periods: Period[], length: number): Period[] {
    let result: Period[] = [];

    for (let i = 0; i < periods.length - length; i++) {
      result.push(periods[i]);
    }

    return result;
  }

  getLegatoNotePairListFromSprite(periodsFromChData: Period[]): Period[][] {
    let endOfTrimming = false;
    const trimTrashold = 0.2;

    let periodListTrimmed: Period[] = [];

    periodsFromChData.forEach(period => {
      let currentMax = 0;
      period.chData.forEach(item => {
        if (item > currentMax) {
          currentMax = item;
        }
      })

      if (!endOfTrimming) {
        if (currentMax < trimTrashold) {
          /**
           * Do nothing
           */
        } else {
          endOfTrimming = true;
        }
      } else {
        periodListTrimmed.push(period);
      }
    })

    const noteChangeLenghtTrashold = 2; // 10
    let previousPeriodLength = 0;
    let previousNPeriodSum = 0;
    let nForSum = 10;

    let periodsForCurrentNotePair: Period[] = [];
    let notesPairSet: Period[][] = [];
    let firstNoteOfPairFound = false;

    let iRunningSum = 0;
    let iLocal = 1;
    periodListTrimmed.forEach((period, i) => {
      let textOffsetY = iLocal * 0.05;
      if (true && this.globalTestSwitch) {
        this.plt.plot(period.chData, iRunningSum);
        this.plt.plotText(period.chData.length.toString(), iRunningSum, 0.5 - textOffsetY, 'red', '#8ec5ba');
        iLocal++;
        if (textOffsetY > 0.4) {
          iLocal = 1;
        }

        // this.plt.plotVerticalLine(outPutChDataTemp.length, 'red');
        // this.plt.plotText(notePairLengthTemp.toString(), outPutChDataTemp.length, 0.2 + i * 0.1, 'red', '#8ec5ba');
      }

      let currentNPeriodSum = 0;

      for (let i2 = i; i2 < i + nForSum; i2++) {
        if (periodListTrimmed[i2]) {
          currentNPeriodSum = currentNPeriodSum + periodListTrimmed[i2].chData.length;
        }
      }


      if (false && Math.abs(period.chData.length - previousPeriodLength) > noteChangeLenghtTrashold) {
        if (this.globalTestSwitch) {
          // this.plt.plotText(currentNPeriodSum.toString(), iRunningSum, -0.5 - textOffsetY, 'red', '#8ec5ba');
          // this.plt.plotVerticalLine(iRunningSum, 'red');

          let diff = 0;
          // if (periodListTrimmed[i + 1]) {
          if (periodListTrimmed[i - 1]) {
            periodListTrimmed[i].chData.forEach((itemLocal, iLocal) => {
              let diffTemp = (itemLocal - periodListTrimmed[i - 1].chData[iLocal]);
              if (diffTemp) {
                diff = diff + diffTemp * diffTemp;
              }
            })

            if (diff >= 0.1) {
              this.plt.plotVerticalLine(iRunningSum, 'red');
              this.plt.plotText(diff.toString(), iRunningSum, -0.5 - textOffsetY, 'red', '#c5968e');
            } else {
              this.plt.plotText(diff.toString(), iRunningSum, -0.5 - textOffsetY, 'red', '#8ec5ba');
            }
          }
        }
      }

      if (Math.abs(period.chData.length - previousPeriodLength) > noteChangeLenghtTrashold) {

        if (this.globalTestSwitch) {
          this.plt.plotVerticalLine(iRunningSum, 'red');
        }
        if (false && !firstNoteOfPairFound) {
          firstNoteOfPairFound = true;
        } else {
          notesPairSet.push(periodsForCurrentNotePair);
          periodsForCurrentNotePair = [];
          firstNoteOfPairFound = false;
        }
      } else {
        /**
         * Do nothing
         */
      }

      periodsForCurrentNotePair.push(period);
      previousPeriodLength = period.chData.length;

      iRunningSum = iRunningSum + period.chData.length;

      previousNPeriodSum = 0;

      for (let i2 = 0; i2 < nForSum; i2++) {
        if (periodListTrimmed[i2]) {
          previousNPeriodSum = previousNPeriodSum + periodListTrimmed[i2].chData.length;
        }
      }
    })

    if (true && this.globalTestSwitch) {
      this.plt.show();
    }

    let result: Period[][] = [];

    notesPairSet.forEach(notePair => {
      result.push(notePair);
    })

    return result;
  }

  undoMaxXYChange(): void {
    this.plt.undoMaxXYChange();
  }

  setDragMode(): void {
    this.plt.setDragMode();
  }

  setZoomMode(): void {
    this.plt.setZoomMode();
  }

  setDrawMarkersMode(): void {
    this.plt.setDrawMarkersMode();
  }

  testSave(): void {
    const jsonData = JSON.stringify([
      1, 2 ,
      3]);
    const blob = new Blob([jsonData], {type: 'text/plain'});
    this.openSaveAsDialog(blob, `test ${getDateString(new Date())}.json`);
  }
}
