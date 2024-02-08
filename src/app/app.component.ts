import {Component, HostListener, OnInit} from '@angular/core';
import * as WavFileEncoder from "wav-file-encoder";
import {Period} from "./period";
import {NoteLocal} from "./noteLocal";
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
import {legatoTypes} from "./legatoTypes";
import {RoundRobin} from "./roundRobin";
import {testNoteSet} from "./testNoteSet";
import {Midi, Track} from "@tonejs/midi";
import {Note} from "@tonejs/midi/dist/Note";
import {crossfadingWIthLinkedTailDTO} from "./crossfadingWIthLinkedTailDTO";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  channelData: Float32Array;
  patternChannelData: Float32Array;
  notesToRender: NoteLocal[] = [];
  notesReadMode = true;
  drawMarkers = false;
  roundRobin_Dictionary: { [key: string]: RoundRobin };
  periods_Transition_Array: Period[][] = [];
  periods_Transition_Name_To_Id_Dictionary: { [key: string]: number } = {};
  periods_Transition_Name_Global_Id = 1;
  onInitDateString: string;
  isDataReady = false;
  plt: Plotter;
  globalTestSwitch = false;

  legatoType = legatoTypes.noPairs;
  cursorType = 'crosshair';
  private storedMidi: Midi;
  private sampleRate = 44100;
  extendByRevertingTrim = {
    right: 0,
    left: 0,
  }
  logExtendByRevertingFade = 300;
  logExtendByRevertingCCNum = 21;
  logExtendByRevertingVelocity = 58;
  logExtendByRevertingChannelName = 'L';
  cycleGoBackForthDepth = 30;
  logExtendByRevertingTailDataShift = 0;
  showExtendByRevertingButtons = false;
  showCrossfadingWIthLinkedTailButtons = true;
  crossfadingWIthLinkedTailTrim = 0;
  crossfadingWIthLinkedTailExtraLength = 0;
  crossfadingWIthLinkedTailYAxisScale = 1;
  crossfadingWIthLinkedTailUseYAxisScale = true;
  crossfadingWIthLinkedTailUseDataWithNewSampleRate = false;
  crossfadingWIthLinkedTailUseStoredAmpMultiplyer = false;
  crossfadingWIthLinkedTailUseNormal = false;
  crossfadingWIthLinkedTailAmpMultiplyer = 0;
  crossfadingWIthLinkedTailMixType = 'A';
  crossfadingWIthLinkedTailFunctionsSum = 0;

  constructor() {
  }

  async ngOnInit() {
    this.crossfadingWIthLinkedTail(true);
    this.initPlt();
    return;
    this.getMidiFileFromUrl();
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
    await this.loadAudioBufferForSamples();

    this.isDataReady = true;
    this.processStoredMid();
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

  // @HostListener('document:keypress', ['$event'])
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.isDataReady) {
      console.log(`Data hasn't been loaded`);
      return;
    }

    let key = event.code;

    if (key === "ArrowRight") {
      this.moveRight();
    } else if (key === 'ArrowLeft') {
      this.moveLeft();
    } else if (key === 'ArrowDown') {
      this.zoomOut();
    } else if (key === 'ArrowUp') {
      this.zoomIn();
    }

    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(key)) {
      return;
    }

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

    if (this.notesToRender.length < maxNoteAmount) {
      this.notesToRender.push({
        offset: (new Date().getTime() * 0.001) * this.sampleRate,
        noteId: noteId,
      });
    }
  }

  async getArrayBufferFromUrl(url: string): Promise<ArrayBuffer> | null {
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

      const doForceNotesForTest = false;

      if (doForceNotesForTest) {
        let offsetConstTest = 4000;
        let offsetRunningSum = zeroOffset;

        const notesToRenderTemp: NoteLocal[] = [];
        // const testNoteSetTemp = testNoteSet.concat(testNoteSet);
        const testNoteSetTemp = testNoteSet;
        const testNoteSetTransposedTemp: number[] = [];

        testNoteSetTemp.forEach(item => {
          // testNoteSetTransposedTemp.push(item + 3)
          testNoteSetTransposedTemp.push(item + 5)
          // testNoteSetTransposedTemp.push(item + 0)
        })

        testNoteSetTransposedTemp.forEach(item => {
          notesToRenderTemp.push({
            offset: offsetRunningSum,
            noteId: item,
          });
          offsetRunningSum = offsetRunningSum + offsetConstTest;
        })
        this.notesToRender = notesToRenderTemp;
      }

      /**
       * Для соединения быстрых нот и вибрато
       */
      if (false && this.notesToRender[1]) {
        this.notesToRender[1].offset = this.notesToRender[0].offset + 1000;
      }

      let i = 0;
      const minPeriodLength = 3;
      this.notesToRender.forEach(item => {
        item.offset = item.offset - zeroOffset;
        let nextItem = this.notesToRender[i + 1];
        let nextNoteId = nextItem ? nextItem.noteId : null;
        // todo: solve it
        if (nextNoteId === 24) {
          nextNoteId = 52;
        }

        let previousItem = this.notesToRender[i - 1];
        let previousNoteId = previousItem ? previousItem.noteId : null;
        let sampleName = '';

        let rrKey = '';


        if (nextNoteId && Math.abs(nextNoteId - item.noteId) > 4) {
          const nearestOddValue = item.noteId - nextNoteId < 0 ? 4 : -4;

          rrKey = getTransitionSampleName({
            noteId: item.noteId,
            nextNoteId: item.noteId + nearestOddValue,
            previousNoteId: previousNoteId,
            legatoType: this.legatoType,
          });
        } else {
          rrKey = getTransitionSampleName({
            noteId: item.noteId,
            nextNoteId: nextNoteId,
            previousNoteId: previousNoteId,
            legatoType: this.legatoType,
          });
        }

        // todo: solve it
        if (item.noteId === 24) {
          rrKey = '56 vib';
        }

        let safeRRstring = 'RR';
        const rrKeyForConsoleLength = 20;

        if (rrKey) {
          safeRRstring = safeRRstring + `${this.roundRobin_Dictionary[rrKey].value}`;
          sampleName = `${rrKey} RR${this.roundRobin_Dictionary[rrKey].value}`;
          this.roundRobin_Dictionary[rrKey].up();
        }

        let constLengthRrKey = rrKey;
        if (rrKeyForConsoleLength > rrKey.length) {
          constLengthRrKey = constLengthRrKey + ' '.repeat(rrKeyForConsoleLength - rrKey.length);
        }


        // todo: solve it
        if (item.noteId === 24) {
          sampleName = `54 vib RR${this.roundRobin_Dictionary['54 vib'].value}`;
          this.roundRobin_Dictionary['54 vib'].up();
        }

        let periodList: Period[];
        let periodListId: number;
        if (sampleName) {
          periodListId = this.periods_Transition_Name_To_Id_Dictionary[sampleName];
        }

        let periodListId_BendTest: number;
        // todo: solve it
        if (item.noteId === 24) {
          // periodListId_BendTest = this.periods_Transition_Name_To_Id_Dictionary['56 vib RR5'];
          periodListId_BendTest = this.periods_Transition_Name_To_Id_Dictionary[`56 vib RR${this.roundRobin_Dictionary[rrKey].value}`];
        }

        if (periodListId) {
          periodList = this.periods_Transition_Array[periodListId];

          // todo: solve it
          if (item.noteId === 24) {
            // periodList.forEach(toAmp =>{
            //   for(let iLoc = 0; iLoc < toAmp.chData.length; iLoc++) {
            //     toAmp.chData[iLoc] = toAmp.chData[iLoc] * 0.33;
            //   }
            // });

            const periodList_BendTest = this.periods_Transition_Array[periodListId_BendTest];

            const curve = []
            const curveLength = 50;
            const step = 1 / curveLength;
            let runningSum = 0;
            // for (let iCurveCounter = 0; iCurveCounter < 50; iCurveCounter++) {
            //   curve.push(runningSum);
            // }
            // for (let iCurveCounter = 0; iCurveCounter < 15; iCurveCounter++) {
            //   curve.push(runningSum);
            //   runningSum = runningSum - step;
            // }
            // for (let iCurveCounter = 0; iCurveCounter < 10; iCurveCounter++) {
            //   curve.push(runningSum);
            // }
            for (let iCurveCounter = 0; iCurveCounter < curveLength; iCurveCounter++) {
              curve.push(runningSum);
              runningSum = runningSum + step;
            }
            const bend: Period[] = this.makeBend(periodList, periodList_BendTest, curve);
            // const bend: Period[] = this.makeBend(periodList_BendTest, periodList, curve);

            this.bendProcessor(bend);
            debugger
            periodList = bend;
          }

          if (!periodList?.length) {
            throw new Error(`No periods for sampleName "${sampleName}"`);
          } else if (periodList?.length < minPeriodLength) {
            console.log(`Low period length for sampleName "${sampleName}" source ${periodList[0].sourceFileName}`);
          }
          if (nextNoteId === midiNoteNumbers.N_C1_24_VibratoTrigger) {
            periodList = this.trimPeriodNFromEnd(periodList, 5); // last value 1500 samples
          }
          chDataListForMixDown.push({
            periodList: periodList,
            offset: item.offset,
          });

          console.log(`${constLengthRrKey} nextNoteId: ${nextNoteId} ${safeRRstring} str.: ${i} source: ${periodList[0].sourceFileName}`)
        } else {
          console.log(`${constLengthRrKey} nextNoteId: ${nextNoteId} ${safeRRstring} str.: ${i}`);
        }
        i++;
      })
      this.notesToRender = [];
    }

    let outPutChDataTemp: Float32Array;

    chDataListForMixDown.forEach(item => {
      console.log('item.offset ' + item.offset)
    })

    outPutChDataTemp = this.mixDownChDatas(chDataListForMixDown);

    const outPutAB: AudioBuffer = new AudioBuffer({
      length: outPutChDataTemp.length,
      numberOfChannels: 1, // 2
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

    const debugStartValues = [];

    for (let chDataNum = 0; chDataNum < chDataList.length; chDataNum++) {
      let periodListTemp = chDataList[chDataNum].periodList;

      let nextChDataStart = chDataList[chDataNum + 1] ? chDataList[chDataNum + 1]?.offset : 0;

      let usedPeriodsNum = 0;
      /**
       * Обычное значение 15
       * 5 для соединения короткой ноты и вибрато
       */
      const numPeriodsToCrossfade = 5; // 15;
      if (chDataList[chDataNum + 1]) {
        // todo: continue from there
        let totalItemLength = 0;
        let totalFirstNItemsLengthWithoutChanging = 0;
        const firstHalfPeriodsWithoutExtending = Math.floor(periodListTemp.length / 2)
        let periodCounter = 0;
        periodListTemp.forEach(item => {
          totalItemLength = totalItemLength + item.chData.length;
          if (periodCounter <= firstHalfPeriodsWithoutExtending) {
            totalFirstNItemsLengthWithoutChanging = totalFirstNItemsLengthWithoutChanging + item.chData.length;
          }
          periodCounter++;
        })

        let currentTotalItemLengthWithOffset = totalItemLength + chDataList[chDataNum].offset;
        const hasNoEnoughPeriodsUntilNextNote = currentTotalItemLengthWithOffset < nextChDataStart;

        const extendShortNotesIfTooShort = true;

        if (extendShortNotesIfTooShort && hasNoEnoughPeriodsUntilNextNote) {
          const extendedNote: Period[] = [];
          const diffTemp = nextChDataStart - currentTotalItemLengthWithOffset;
          let periodLength = 0;

          const alhorhytme = 0;

          if (alhorhytme == 0) {

            let xsomething = nextChDataStart - (firstHalfPeriodsWithoutExtending + chDataList[chDataNum].offset);
            let multiplyer = Math.floor(xsomething / (totalItemLength - totalFirstNItemsLengthWithoutChanging));

            let periodCounter = 0;
            periodListTemp.forEach(item => {
              if (periodCounter <= firstHalfPeriodsWithoutExtending) {
                extendedNote.push(item);
                periodLength = item.chData.length;
              } else {
                let i = multiplyer;
                while (i--) {
                  extendedNote.push(item);
                }
              }
              periodCounter++;
            })

            let extendedNoteLength = 0
            extendedNote.forEach(item => {
              extendedNoteLength = extendedNoteLength + item.chData.length;
            })

            if (extendedNoteLength + chDataList[chDataNum].offset < nextChDataStart) {
              debugger;
            }


          } else {
            const partWithoutExtendedCoeff = 2 / 3;
            let xsomething = diffTemp + totalItemLength * (1 - partWithoutExtendedCoeff);
            let multiplyer = Math.floor(xsomething / (totalItemLength * (1 + partWithoutExtendedCoeff)));

            let periodCounter = 0;
            periodListTemp.forEach(item => {
              if (periodCounter < periodListTemp.length * partWithoutExtendedCoeff) {
                extendedNote.push(item);
                periodLength = item.chData.length;
              } else {
                let i = multiplyer;
                while (i--) {
                  extendedNote.push(item);
                }
              }
              periodCounter++;
            })
          }

          periodListTemp = extendedNote;
        }

        let lengthTemp = 0;
        periodListTemp.forEach(item => {
          lengthTemp = lengthTemp + item.chData.length;
        })

        nextChDataStart = this.getNearestNextChDataStart({
          periodList: periodListTemp,
          offset: chDataList[chDataNum].offset,
          target: nextChDataStart
        });

        debugStartValues.push(nextChDataStart);

        usedPeriodsNum = this.getUsedPeriodsForNearestNextChDataStart({
          periodList: periodListTemp,
          offset: chDataList[chDataNum].offset,
          target: nextChDataStart
        });

        if (nextChDataStart) {
          const nextChDataTemp = chDataList[chDataNum + 1];
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

      const drawNextChDataStart = false && this.drawMarkers;
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
    const amplitude = dto.amplitude || dto.amplitude === 0 ? dto.amplitude : 1;
    for (let i = 0; i < result.length; i++) {
      result[i] = dto.chData[Math.round(i * multiplier)] * amplitude;
    }

    return result;
  }

  // async loadAudioBufferForSamples(): Promise<{ [key: string]: Period[] }> {
  async loadAudioBufferForSamples(): Promise<void> {
    console.log('start loadAudioBufferForSamples')

    let audioBuffer_FastSprite_Down_midiNum_List: Period[][][] = [];
    let audioBuffer_FastSprite_Up_midiNum_List: Period[][][] = [];

    /**
     * midi num [], rr [], note periods []
     */
    let audioBuffer_VibratoSprite_midiNum_List: Period[][][] = [];
    let audioBuffer_LegatoPairs_Up_01_midiNum_List: Period[][][] = [];

    /**
     * interval, midi num [], rr [], note periods []
     */
    let audioBuffer_Legato_Up_By_Interval_MidiNum_List: Period[][][][] = [];
    /**
     * interval, midi num [], rr [], note periods []
     */
    let audioBuffer_Legato_Down_By_Interval_MidiNum_List: Period[][][][] = [];

    const audioCtx = new AudioContext();

    const skipped = true;
    const pickupPath = 'Neck';
    const stringPath = '1st';

    if (!skipped) {
      for (let i = 35; i < 71; i++) {
        const fileName = `assets/lib/${pickupPath}/${stringPath}/Fast/Fast Sprite ${i}`;

        const audioBufferTemp = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`${fileName}.wav`));
        const periodsTemp = await this.getJsonFromUrl(`${fileName}.json`);

        const periodsFromChData = this.periodsFromChData(audioBufferTemp.getChannelData(0), periodsTemp);
        const period_FastSprite_Down_Up_midiNum_List: Period[][] = this.getNoteListFromSprites(periodsFromChData);
        audioBuffer_FastSprite_Down_midiNum_List[i] = this.getStrokesList(period_FastSprite_Down_Up_midiNum_List, 'Down');
        audioBuffer_FastSprite_Up_midiNum_List[i] = this.getStrokesList(period_FastSprite_Down_Up_midiNum_List, 'Up');
      }
    }

    for (let i = 42; i < 72; i++) {
      // const audioBufferTemp = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`assets/lib/Vibrato/Vibrato Sprite ${i}.wav`));
      // // todo: uncomment it
      // audioBuffer_VibratoSprite_midiNum_List[i] = this.trimNFromStartForArray(
      //   this.getPeriodListForNoteListFromSprites(audioBufferTemp.getChannelData(0)), trimVibFromStart
      // );
    }

    const intervalList = [1, 2, 3, 4]

    // let result: { [key: string]: Period[] } = {};
    this.roundRobin_Dictionary = {};

    for (let interval = intervalList[0]; interval < intervalList.length + 1; interval++) {
      audioBuffer_Legato_Up_By_Interval_MidiNum_List[interval] = [];
      audioBuffer_Legato_Down_By_Interval_MidiNum_List[interval] = [];
      // for (let i = 52; i < 60; i++) { // midiNoteNumbers.someHighNoteId
      for (let i = 52; i < midiNoteNumbers.someHighNoteId; i++) { // midiNoteNumbers.someHighNoteId
        const intervalStr = interval.toString().padStart(2, '0')
        const fileName = `assets/lib/${pickupPath}/${stringPath}/Legato/Legato Up ${intervalStr}/Legato Up ${intervalStr} Sprite ${i}`;

        const wavTemp = await this.getArrayBufferFromUrl(`${fileName}.wav`);

        if (wavTemp) {
          const audioBufferTemp = await audioCtx.decodeAudioData(wavTemp);
          const periodsTemp = await this.getJsonFromUrl(`${fileName}.json`);

          const periodsFromChData = this.periodsFromChData(audioBufferTemp.getChannelData(0), periodsTemp);

          const setSourceFileName = true;

          if (setSourceFileName) {
            periodsFromChData.forEach(item => {
              item.sourceFileName = fileName;
            })
          }

          if (i >= 52 && i <= midiNoteNumbers.someHighNoteId) {
            const markersTemp1 = await this.getJsonFromUrl(`${fileName} Marker.json`).catch(error => {
              throw new Error(error);
            });
            const markersTemp: number[] = markersTemp1 ? markersTemp1 : periodsTemp;
            const noteListTemp = this.splitPeriodListByMarkers(periodsFromChData, markersTemp);

            let directionUp = false;//false;

            let roundRobinUp = 0;
            let roundRobinDown = 0;

            audioBuffer_Legato_Up_By_Interval_MidiNum_List[interval][i + interval] = [];
            audioBuffer_Legato_Down_By_Interval_MidiNum_List[interval][i] = [];

            let arePeriodsBeforeFirstMarkersSkipped = false;

            // hotfix
            // todo: solve it
            // const noteListTempHotfixed: Period[][] = [];
            // const minPeriodsInNoteLength = 3;
            // let skipForPair = false;
            // noteListTemp.forEach(item => {
            //   if (skipForPair || item.length < minPeriodsInNoteLength) {
            //     if (item.length < minPeriodsInNoteLength) {
            //       skipForPair = true;
            //       // do nothing
            //     } else if (skipForPair) {
            //       skipForPair = false;
            //       // do nothing
            //     }
            //   } else {
            //     noteListTempHotfixed.push(item);
            //   }
            // })

            noteListTemp.forEach(item => {
              if (arePeriodsBeforeFirstMarkersSkipped) {
                let extendedNote: Period[] = [];
                let lastPeriodForExtend: Period;

                item.forEach(periodItem => {
                  extendedNote.push(periodItem);
                  lastPeriodForExtend = periodItem;
                })

                let minPeriodsLength = 100;
                const extendNote = false;
                if (extendNote && extendedNote.length < minPeriodsLength) {
                  const currentLegth = item.length;
                  const extendByReverse = false;
                  if (extendByReverse) {
                    let i2 = 0;
                    for (let i = 0; i < minPeriodsLength - currentLegth; i++) {
                      if (currentLegth > i2) {
                        extendedNote.push(item[currentLegth - i2 - 1]);
                      }
                      i2++;
                    }
                  } else {
                    extendedNote = [];
                    let i3 = 0;
                    item.forEach(periodItem => {
                      if (i3 < (item.length / 2)) {
                        extendedNote.push(periodItem);
                      } else {
                        extendedNote.push(periodItem);
                        extendedNote.push(periodItem);
                      }
                    })
                  }
                }

                if (directionUp) {
                  audioBuffer_Legato_Up_By_Interval_MidiNum_List[interval][i + interval][roundRobinUp] = extendedNote;
                  roundRobinUp++;
                } else {
                  audioBuffer_Legato_Down_By_Interval_MidiNum_List[interval][i][roundRobinDown] = extendedNote;
                  roundRobinDown++;
                }
                directionUp = !directionUp;
              } else {
                arePeriodsBeforeFirstMarkersSkipped = true;
              }
            })
          }

          // For plotting
          // if (true && i === midiNoteNumbers.someHighNoteId) {
          if (false && interval === 2 && i === 61) {
            this.drawWaveformWithMarkers({
              fileName: fileName,
              periodsFromChData: periodsFromChData,
              periodsTemp: periodsTemp,
            });
          }

          this.globalTestSwitch = false;
          if (i === 52) {
            this.globalTestSwitch = true;
          }

          // todo: из audioBuffer_Legato_Up_01_midiNum_List и audioBuffer_Legato_Down_01_midiNum_List сформировать пары,
          // если будет нужно
          // audioBuffer_LegatoPairs_Up_01_midiNum_List[i] = ...
        }

        let skipVibrato = false;
        const maxVibNoteNum = 56;
        /**
         * Vibrato
         */
        if (!skipVibrato && interval === 1 && i >= 53 && i <= maxVibNoteNum) {
          let roundRobinDownForVibrato = 0;
          const vibratoFileName = `assets/lib/${pickupPath}/${stringPath}/Vibrato/Vibrato Sprite ${i}`;
          const vibratoWavTemp = await this.getArrayBufferFromUrl(`${vibratoFileName}.wav`);

          if (vibratoWavTemp) {
            const vibratoAudioBufferTemp = await audioCtx.decodeAudioData(vibratoWavTemp);
            const vibratoPeriodsTemp = await this.getJsonFromUrl(`${vibratoFileName}.json`);
            const vibratoPeriodsFromChData = this.periodsFromChData(vibratoAudioBufferTemp.getChannelData(0), vibratoPeriodsTemp);

            const vibratoMarkersTemp1 = await this.getJsonFromUrl(`${vibratoFileName} Marker.json`).catch(error => {
              // throw new Error(error);
            });
            const vibratoMarkersTemp: number[] = vibratoMarkersTemp1 ? vibratoMarkersTemp1 : vibratoPeriodsTemp;
            const vibratoNoteListTemp = this.splitPeriodListByMarkers(vibratoPeriodsFromChData, vibratoMarkersTemp);

            audioBuffer_VibratoSprite_midiNum_List[i] = [];


            const trimVibFromStart = 25;
            let vibratoRoundRobinUp = 0;
            let arePeriodsBeforeFirstMarkersSkipped = false;

            vibratoNoteListTemp.forEach(note => {
              if (arePeriodsBeforeFirstMarkersSkipped) {
                const trimmedNote: Period[] = [];

                let noteCounter = 0;
                note.forEach(item => {
                  if (noteCounter > trimVibFromStart) {
                    trimmedNote.push(item);
                  }
                  noteCounter++;
                })

                audioBuffer_VibratoSprite_midiNum_List[i][vibratoRoundRobinUp] = trimmedNote;
                vibratoRoundRobinUp++;
              } else {
                arePeriodsBeforeFirstMarkersSkipped = true;
              }
            })

            if (true && i === maxVibNoteNum) {
              await this.drawWaveformWithMarkers({
                fileName: vibratoFileName,
                periodsFromChData: vibratoPeriodsFromChData,
                periodsTemp: vibratoPeriodsTemp,
              });
            }
          }
        }

        /**
         * End Of Vibrato
         */
      }

      audioBuffer_Legato_Down_By_Interval_MidiNum_List[interval].forEach((periodListList, index) => {
        if (periodListList) {
          let localRR = -1;
          periodListList.forEach(periodList => {
            localRR++;
            // result[getFormattedName({
            //   midiNum: index,
            //   art: articulations.legDown,
            //   rr: localRR,
            //   interval: interval,
            // })] =
            //   periodList;

            this.periods_Transition_Name_To_Id_Dictionary[getFormattedName({
              midiNum: index,
              art: articulations.legDown,
              rr: localRR,
              interval: interval,
            })] = this.periods_Transition_Name_Global_Id;

            this.periods_Transition_Array.push(periodList)
            this.periods_Transition_Name_Global_Id++;
          })

          this.roundRobin_Dictionary[getFormattedName({
            midiNum: index,
            art: articulations.legDown,
            noRr: true,
            interval: interval,
          })] = new RoundRobin(localRR);
        }
      })


      audioBuffer_Legato_Up_By_Interval_MidiNum_List[interval].forEach((periodListList, index) => {
        if (periodListList) {
          let localRR = -1;
          periodListList.forEach(periodList => {
            localRR++;
            // result[getFormattedName({
            //   midiNum: index,
            //   art: articulations.legUp,
            //   rr: localRR,
            //   interval: interval,
            // })] =
            //   periodList;

            this.periods_Transition_Name_To_Id_Dictionary[getFormattedName({
              midiNum: index,
              art: articulations.legUp,
              rr: localRR,
              interval: interval,
            })] = this.periods_Transition_Name_Global_Id;

            this.periods_Transition_Array.push(periodList)
            this.periods_Transition_Name_Global_Id++;
          })

          this.roundRobin_Dictionary[getFormattedName({
            midiNum: index,
            art: articulations.legUp,
            noRr: true,
            interval: interval,
          })] = new RoundRobin(localRR);
        }
      })
    }

    audioBuffer_FastSprite_Down_midiNum_List.forEach((periodListList, index) => {
      if (periodListList) {
        let localRR = 0;
        periodListList.forEach(periodList => {
          // result[getFormattedName({
          //   midiNum: index,
          //   art: articulations.fastDown,
          //   rr: localRR
          // })] =
          //   periodList;
          // localRR++;
        })
      }
    })

    audioBuffer_FastSprite_Up_midiNum_List.forEach((periodListList, index) => {
      if (periodListList) {
        let localRR = 0;
        periodListList.forEach(periodList => {
          // result[getFormattedName({
          //   midiNum: index,
          //   art: articulations.fastUp,
          //   rr: localRR
          // })] =
          //   periodList;
          // localRR++;
        })
      }
    })

    // audioBuffer_VibratoSprite_midiNum_List.forEach((periodListList, index) => {
    //   if (periodListList) {
    //     let localRR = 0;
    //     periodListList.forEach(periodList => {
    //       result[getFormattedName({
    //         midiNum: index,
    //         art: articulations.vib,
    //         rr: localRR
    //       })] =
    //         periodList;
    //       localRR++;
    //     })
    //   }
    // })

    audioBuffer_LegatoPairs_Up_01_midiNum_List.forEach((periodList, index) => {
      if (periodList) {
        const interval = 1;
        let localRR = 0;
        periodList.forEach(periodList => {
          // result[getFormattedName({
          //   midiNum: index,
          //   midiNumSecond: index + interval,
          //   art: articulations.leg,
          //   rr: localRR
          // })] =
          //   periodList;
          // localRR++;
        })
      }
    })

    audioBuffer_VibratoSprite_midiNum_List.forEach((periodListList, index) => {
      if (periodListList) {
        let localRR = -1;
        periodListList.forEach(periodList => {
          localRR++;
          // result[getFormattedName({
          //   midiNum: index,
          //   midiNumSecond: null,
          //   art: articulations.vib,
          //   rr: localRR
          // })] =
          //   periodList;

          this.periods_Transition_Name_To_Id_Dictionary[getFormattedName({
            midiNum: index,
            midiNumSecond: null,
            art: articulations.vib,
            rr: localRR
          })] = this.periods_Transition_Name_Global_Id;

          this.periods_Transition_Array.push(periodList)
          this.periods_Transition_Name_Global_Id++;
        })

        this.roundRobin_Dictionary[getFormattedName({
          midiNum: index,
          art: articulations.vib,
          noRr: true,
          interval: null,
        })] = new RoundRobin(localRR);
      }
    })

    console.log('end loadAudioBufferForSamples')

    // return result;
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
          // period.chData[0] = -0.25;
        }
        periodsForCurrentNote.push(period);
      } else if (currentMax - delta <= lastPeriodMax || periodCounter < minPeriodsInNote) {
        /**
         * Нужно писать chData ноты в текущую ноту в result
         */
        if (drawMarker) {
          // period.chData[0] = 0.5;
        }
        periodsForCurrentNote.push(period);
      } else {
        /**
         * Началась новая нота
         */
        result.push(periodsForCurrentNote);
        periodsForCurrentNote = [];

        if (drawMarker) {
          // period.chData[0] = -0.75;
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


  splitPeriodListByMarkers(periods: Period[], markers: number[]): Period[][] {
    let result: Period[][] = [];

    let runningSum = 0;
    let currentNote: Period[] = [];


    periods.forEach(item => {
      if (markers.includes(runningSum)) {
        result.push(currentNote);
        currentNote = [];
      }
      currentNote.push(item);
      runningSum = runningSum + item.chData.length;
    })

    return result;
  }

  drawRawLineForMakingMarkers(periodsFromChData: Period[]): void {
    let iRunningSum = 0;
    let iLocal = 1;
    periodsFromChData.forEach((period, i) => {
      let textOffsetY = iLocal * 0.05;
      this.plt.plotVerticalLine(iRunningSum, 'red');
      this.plt.plot(period.chData, iRunningSum);
      this.plt.plotText(period.chData.length.toString(), iRunningSum, 0.5 - textOffsetY, 'red', '#8ec5ba');
      iLocal++;
      if (textOffsetY > 0.4) {
        iLocal = 1;
      }
      iRunningSum = iRunningSum + period.chData.length;
    })
  }

  undoMaxXYChange(): void {
    this.plt.undoMaxXYChange();
  }

  setDragMode(): void {
    this.cursorType = 'grab';
    this.plt.setDragMode();
  }

  setZoomMode(): void {
    this.cursorType = 'crosshair';
    this.plt.setZoomMode();
  }

  zoomOut(): void {
    this.plt.zoomOut();
  }

  zoomIn(): void {
    this.plt.zoomIn();
  }

  setDrawMarkersMode(): void {
    this.cursorType = 'pointer';
    this.plt.setDrawMarkersMode();
  }

  setRemoveMarkersMode(): void {
    this.cursorType = 'pointer';
    this.plt.setRemoveMarkersMode();
  }

  saveMarkers(): void {
    this.plt.saveMarkers('markers');
  }

  moveRight(): void {
    this.plt.moveRight();
  }

  moveLeft(): void {
    this.plt.moveLeft();
  }

  saveView(id?: number): void {
    this.plt.saveView(id);
  }

  loadView(id?: number): void {
    this.plt.loadView(id);
  }

  async getMidiFileFromUrl(): Promise<void> {
    let url = 'assets/test.mid';
    let response = await fetch(url);

    let ab = await response.arrayBuffer();

    this.storedMidi = this.prepareMidi(new Midi(ab));
  }

  private prepareMidi(midi: Midi) {
    const result = midi;
    if (midi.tracks.length > 1) {
      if (midi.tracks[0].notes.length == 0 && midi.tracks[1].notes.length !== 0) {
        midi.tracks[0].notes = midi.tracks[1].notes;
      }
      midi.tracks.splice(1);
    }
    return result;
  }

  processStoredMid(): void {
    //get the tracks
    this.storedMidi.tracks.forEach((track: Track) => {
      //tracks have notes and controlChanges
      //notes are an array
      const notes = track.notes;
      this.notesToRender = [];
      notes.forEach((note: Note) => {
        const offset = this.secondsToOffset(this.storedMidi.header.ticksToSeconds(note.ticks));

        console.log(`midi ${this.adaptMidiForGuitar(note.midi)} note bar: ${note.bars} tick ${note.ticks} ` +
          `seconds ${this.storedMidi.header.ticksToSeconds(note.ticks)} offset ${offset}`);
        this.notesToRender.push({
          noteId: this.adaptMidiForGuitar(note.midi),
          offset: offset,
        });
      });

      console.log('track.instrument.name ' + track.instrument.name);
    });
  }

  adaptMidiForGuitar(midi: number): number {
    return midi - 12;
  }

  secondsToOffset(seconds: number): number {
    return seconds * this.sampleRate;
  }

  ticksToSeconds(ticks: number): number {
    const ppq = 480;
    const beats = ticks / ppq;
    return (60 / 120) * beats;
  }

  async drawWaveformWithMarkers(dto: DrawWaveformWithMarkersDTO) {
    const markersTemp1 = await this.getJsonFromUrl(`${dto.fileName} Marker.json`).catch(error => {
      // throw new Error(error);
    });
    const markersTemp: number[] = markersTemp1 ? markersTemp1 : dto.periodsTemp;
    const noteListTemp = this.splitPeriodListByMarkers(dto.periodsFromChData, markersTemp);

    let iRunningSum = 0;


    noteListTemp.forEach(item => {
      item.forEach(period => {
        this.plt.plot(period.chData, iRunningSum);
        iRunningSum = iRunningSum + period.chData.length;
      })

      this.plt.plotVerticalLine(iRunningSum, 'red');
    })

    this.plt.show();
  }

  makeBend(a: Period[], target: Period[], curve: number[]): Period[] {
    const result: Period[] = [];

    // todo: solve it
    const lengthTrimForTest = 300;

    let i = 0;
    let currentLength: number;
    target.forEach(item => {
      let chDataTemp: Float32Array;
      if (i > curve.length || i > a.length - 1) {
        chDataTemp = item.chData;
      } else {
        currentLength = Math.floor(a[i].chData.length * (1 - curve[i]) + item.chData.length * (curve[i]));

        const chDataTempA = this.getAdjustedChDataForPeriod({
          chData: a[i].chData,
          targetLength: currentLength,
          amplitude: 1 - curve[i],
        });

        const chDataTempB = this.getAdjustedChDataForPeriod({
          chData: item.chData,
          targetLength: currentLength,
          amplitude: curve[i],
        });

        chDataTemp = new Float32Array(chDataTempB);

        let chDataValueCounter = 0;
        chDataTempB.forEach(chDataValue => {
          chDataTemp[chDataValueCounter] = chDataTempA[chDataValueCounter] + chDataTempB[chDataValueCounter];
          chDataValueCounter++;
        })
      }
      const periodTemp: Period = {chData: chDataTemp}
      if (i < lengthTrimForTest) {
        result.push(periodTemp)
      }
      i++;
    })

    return result;
  }

  bendProcessor(a: Period[]): Period[] {
    const result: Period[] = [];
    const firstNPeriodsForSkipping = Math.floor(a.length / 4);
    let minLength = 0;
    let maxLength = 0;
    let lastLength = 0;
    let previousLength = 0;
    let previousLength2 = 0;
    let goUp = true;

    let lastMin = 0;
    let lastMax = 0;


    let i = 0;
    let bendCounter = 0;
    const threshold = 5;

    a.forEach(item => {
      lastLength = item.chData.length;

      if (i > firstNPeriodsForSkipping) {
        if (maxLength < lastLength) {
          maxLength = lastLength;
        }

        if (minLength === 0 || minLength > lastLength) {
          minLength = lastLength;
        }

        if (goUp && lastLength > previousLength && previousLength > previousLength2) {
          goUp = false;
          console.log('Найден разворот вниз')
        }

        if (!goUp && lastLength < previousLength && previousLength < previousLength2) {
          goUp = true;
          console.log('Найден разворот вверх')
        }
        console.log('lastLength: ' + lastLength)
      }

      previousLength = lastLength;
      previousLength2 = previousLength;
      i++;
    })

    console.log('bendCounter: ' + bendCounter)
    console.log('minLength: ' + minLength)
    console.log('maxLength: ' + maxLength)
    debugger;
    return result;
  }

  extendByRevertingTrimLeft(direction: number): void {
    if (direction === 1) {
      this.extendByRevertingTrim.left = this.extendByRevertingTrim.left + 1;
    } else {
      this.extendByRevertingTrim.left = this.extendByRevertingTrim.left - 1;
    }
    this.plt.resetView();
    this.extendByReverting(true);
  }

  extendByRevertingTrimRight(direction: number): void {
    if (direction === 1) {
      this.extendByRevertingTrim.right = this.extendByRevertingTrim.right + 1;
    } else {
      this.extendByRevertingTrim.right = this.extendByRevertingTrim.right - 1;
    }
    this.plt.resetView();
    this.extendByReverting(true);
  }

  extendByRevertingSave(): void {
    this.plt.resetView();
    this.extendByReverting();
  }

  logExtendByRevertingTrim(): void {
    console.log(`Trim ${this.extendByRevertingTrim.left} ${this.extendByRevertingTrim.right} Fade ${this.logExtendByRevertingFade} `
      + `CCNum ${this.logExtendByRevertingCCNum} ${this.logExtendByRevertingChannelName} Cycle length ${this.cycleGoBackForthDepth}`);
  }

  logExtendByRevertingFadeChange(direction: number): void {
    if (direction === 1) {
      this.logExtendByRevertingFade++;
    } else {
      this.logExtendByRevertingFade--;
    }
    this.plt.resetView();
    this.extendByReverting(true);
  }

  logExtendByRevertingCCChange(direction: number): void {
    this.logExtendByRevertingChannelName = 'L';
    if (direction === 1) {
      this.logExtendByRevertingCCNum++;
    } else {
      this.logExtendByRevertingCCNum--;
    }
    this.plt.resetView();
    this.extendByReverting(true);
  }

  extendByRevertingCycleLengthChange(value: number): void {
    this.cycleGoBackForthDepth = this.cycleGoBackForthDepth + value;
    this.plt.resetView();
    this.extendByReverting(true);
  }

  extendByRevertingTailShiftChange(value: number): void {
    this.logExtendByRevertingTailDataShift = this.logExtendByRevertingTailDataShift + value;
    this.plt.resetView();
    this.extendByReverting(true);
  }

  extendByRevertingSaveBoth(): void {
    this.extendByReverting(false, 'L');
    this.extendByReverting(false, 'R');
    this.plt.resetView();
  }

  logExtendByRevertingChannelChange(channelName: string): void {
    this.logExtendByRevertingChannelName = channelName;
    this.plt.resetView();
    this.extendByReverting(true);
  }

  crossfadingWIthLinkedTailTrimChange(value: number): void {
    this.crossfadingWIthLinkedTailTrim = this.crossfadingWIthLinkedTailTrim + value;
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailSaveTrim(): void {
    localStorage.setItem('crossfadingWIthLinkedTailTrim', JSON.stringify(this.crossfadingWIthLinkedTailTrim));
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailLoadTrim(): void {
    const trimTemp = JSON.parse(localStorage.getItem('crossfadingWIthLinkedTailTrim'));

    if (trimTemp) {
      this.crossfadingWIthLinkedTailTrim = trimTemp
      this.plt.resetView();
      this.crossfadingWIthLinkedTail(true);
    }
  }

  crossfadingWIthLinkedTailStoreAllData(): void {
    let data = JSON.parse(localStorage.getItem('crossfadingWIthLinkedTailAllData'));
    if (!data) {
      data = {};
    }

    data[this.logExtendByRevertingCCNum + '_' + this.logExtendByRevertingVelocity] = {
      extraLength: this.crossfadingWIthLinkedTailExtraLength,
      trim: this.crossfadingWIthLinkedTailTrim,
    };

    localStorage.setItem('crossfadingWIthLinkedTailAllData', JSON.stringify(data));
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailReadDataForCCNum(): void {
    debugger;
    let data = JSON.parse(localStorage.getItem('crossfadingWIthLinkedTailAllData'));
    const dataForCurrentSettings = data?.[this.logExtendByRevertingCCNum + '_' + this.logExtendByRevertingVelocity];
    if (!dataForCurrentSettings) {
      return;
    }

    this.crossfadingWIthLinkedTailExtraLength = dataForCurrentSettings.extraLength;
    this.crossfadingWIthLinkedTailTrim = dataForCurrentSettings.trim;

    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailSaveDelta(): void {
    localStorage.setItem('crossfadingWIthLinkedTailExtraLength', JSON.stringify(this.crossfadingWIthLinkedTailExtraLength));
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailLoadDelta(): void {
    const delta = JSON.parse(localStorage.getItem('crossfadingWIthLinkedTailExtraLength'));

    if (delta) {
      this.crossfadingWIthLinkedTailExtraLength = delta
      this.plt.resetView();
      this.crossfadingWIthLinkedTail(true);
    }
  }

  crossfadingWIthLinkedTailDeltaChange(value: number): void {
    if (this.crossfadingWIthLinkedTailExtraLength == 0) {
      this.crossfadingWIthLinkedTailExtraLength = 1 * Math.sign(value);
    }

    this.crossfadingWIthLinkedTailExtraLength = this.crossfadingWIthLinkedTailExtraLength +
      (Math.abs(this.crossfadingWIthLinkedTailExtraLength) / 100 * value);

    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailYAxisScaleChange(value: number): void {
    if (value > 0) {
      this.crossfadingWIthLinkedTailYAxisScale = this.crossfadingWIthLinkedTailYAxisScale * 3;
    } else {
      this.crossfadingWIthLinkedTailYAxisScale = this.crossfadingWIthLinkedTailYAxisScale / 3;
    }
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailSave(): void {
    this.plt.resetView();
    this.crossfadingWIthLinkedTail();
  }

  crossfadingWIthLinkedTailSaveBoth(): void {
    this.crossfadingWIthLinkedSaveBothLocal();
  }

  crossfadingWIthLinkedTailUseLR(channelName: string): void {
    this.logExtendByRevertingChannelName = channelName;
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailUseSRDataToggle(): void {
    this.crossfadingWIthLinkedTailUseDataWithNewSampleRate = !this.crossfadingWIthLinkedTailUseDataWithNewSampleRate;
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailMixTypeToggle(): void {
    if (this.crossfadingWIthLinkedTailMixType === 'A') {
      this.crossfadingWIthLinkedTailMixType = 'B'
    } else if (this.crossfadingWIthLinkedTailMixType === 'B') {
      this.crossfadingWIthLinkedTailMixType = 'A'
    }
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadingWIthLinkedTailUseYScaleToggle(): void {
    this.crossfadingWIthLinkedTailUseYAxisScale = !this.crossfadingWIthLinkedTailUseYAxisScale;
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  setMultiplyer(): void {
    this.crossfadingWIthLinkedTailUseStoredAmpMultiplyer = !this.crossfadingWIthLinkedTailUseStoredAmpMultiplyer;
  }

  setUseNormal(): void {
    this.crossfadingWIthLinkedTailUseNormal = !this.crossfadingWIthLinkedTailUseNormal;
    this.plt.resetView();
    this.crossfadingWIthLinkedTail(true);
  }

  crossfadePeriodChDataWithPrevious(
    chData: Float32Array | number[],
    previousTarget: Float32Array | number[],
    fadeLength: number
  ): number[] {
    let result: number[] = [];

    let i = 0;
    let amplitude = 0;

    previousTarget.forEach(item => {
      amplitude = i / fadeLength;
      const test = false;
      if (!test) {
        if (i < fadeLength) {
          result.push(item * amplitude + chData[i] * (1 - amplitude));
        } else {
          result.push(item);
        }
      } else {
        if (i < fadeLength) {
          result.push(chData[i]);
        } else if (i < (fadeLength + 10)) {
          result.push(0);
        } else {
          result.push(item);
        }
      }

      i++;
    })

    return result;
  }


  async crossfadingWIthLinkedSaveBothLocal(): Promise<void> {
    const velocity = this.logExtendByRevertingVelocity;

    const periodResultChDataL = await this.getCrossfadingWIthLinkedTailChData({
      fileChannelNum: 0,
      velocity: velocity,
    });

    this.crossfadingWIthLinkedTailUseStoredAmpMultiplyer = true;

    const periodResultChDataR = await this.getCrossfadingWIthLinkedTailChData({
      fileChannelNum: 1,
      velocity: velocity,
    });

    const uiParms = getUiParams();
    const chDataListForMixDownL: { periodList: Period[], offset: number }[] = [];
    const chDataListForMixDownR: { periodList: Period[], offset: number }[] = [];

    chDataListForMixDownL.push({periodList: [{chData: periodResultChDataL}], offset: 0});
    chDataListForMixDownR.push({periodList: [{chData: periodResultChDataR}], offset: 0});

    const outPutChDataTempL: Float32Array = this.mixDownChDatas(chDataListForMixDownL);
    const outPutChDataTempR: Float32Array = this.mixDownChDatas(chDataListForMixDownR);

    const outPutAB: AudioBuffer = new AudioBuffer({
      length: outPutChDataTempL.length,
      numberOfChannels: 2,
      sampleRate: uiParms.sampleRate,
    });

    outPutAB.copyToChannel(outPutChDataTempL, 0);
    outPutAB.copyToChannel(outPutChDataTempR, 1);

    const wavFileData = WavFileEncoder.encodeWavFile(outPutAB, uiParms.wavFileType);
    const blob = new Blob([wavFileData], {type: "audio/wav"});
    this.openSaveAsDialog(blob, `test ${getDateString(new Date())} CC ${this.logExtendByRevertingCCNum} LR.wav`);
  }

  async crossfadingWIthLinkedTail(noDownload = false): Promise<void> {
    const channelNameLocal = this.logExtendByRevertingChannelName;
    const velocity = this.logExtendByRevertingVelocity;

    const periodResultChData = await this.getCrossfadingWIthLinkedTailChData({
      fileChannelNum: 0,
      velocity: velocity,
    });

    if (!noDownload) {
      const uiParms = getUiParams();
      let chDataListForMixDown: { periodList: Period[], offset: number }[] = [];

      chDataListForMixDown.push({periodList: [{chData: periodResultChData}], offset: 0});

      let outPutChDataTemp: Float32Array = this.mixDownChDatas(chDataListForMixDown);

      const outPutAB: AudioBuffer = new AudioBuffer({
        length: outPutChDataTemp.length,
        numberOfChannels: 1,
        sampleRate: uiParms.sampleRate,
      });

      outPutAB.copyToChannel(outPutChDataTemp, 0);

      const wavFileData = WavFileEncoder.encodeWavFile(outPutAB, uiParms.wavFileType);
      const blob = new Blob([wavFileData], {type: "audio/wav"});
      this.openSaveAsDialog(blob, `test ${getDateString(new Date())} CC ${this.logExtendByRevertingCCNum} ${channelNameLocal}.wav`);
    }
  }

  private async getCrossfadingWIthLinkedTailChData(dto: crossfadingWIthLinkedTailDTO): Promise<Float32Array> {
    const audioCtx = new AudioContext();
    const ccId = this.logExtendByRevertingCCNum;
    const channelNameLocal = dto.channelName ? '_' + dto.channelName : '';
    const fileName = `assets/forReverse/${dto.velocity}_5dB/Kurcy_${dto.velocity}_${ccId}${channelNameLocal}`;
    const audioBufferTemp = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`${fileName}.wav`));

    const periodContainer: Period = {chData: audioBufferTemp.getChannelData(dto.fileChannelNum)};
    const SR_data = this.crossfadingWIthLinkedTailUseDataWithNewSampleRate ? '_SR' : '';

    let fileNameSecond = `assets/forReverse/${dto.velocity}_5dB/Ruben_Tail_${dto.velocity}_${ccId}${channelNameLocal}${SR_data}`;
    if (this.crossfadingWIthLinkedTailUseNormal) {
      fileNameSecond = `assets/forReverse/${dto.velocity}_5dB/normal/Ruben_Tail_${dto.velocity}_${ccId}${channelNameLocal}${SR_data}`;
    }

    const audioBufferTempSecond = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`${fileNameSecond}.wav`));

    const tailPeriodContainer: Period = {chData: audioBufferTempSecond.getChannelData(dto.fileChannelNum)};

    const tailTrimmedChData: number[] = [];
    const readMultiplyerFromStartLength = 150;

    const trimTailFromRight = 1500 * 2;
    const fadeTailFromRight = 100 * 5;
    let fadeTailFromRightCounter = 0;
    let fadeTailFromRightAmp = 1;
    let i = 0;
    tailPeriodContainer.chData.forEach(item => {
      if (i >= this.crossfadingWIthLinkedTailTrim) {
        if (i < (tailPeriodContainer.chData.length - trimTailFromRight - fadeTailFromRight)) {
          tailTrimmedChData.push(item);
        } else if (i < (tailPeriodContainer.chData.length - trimTailFromRight)) {
          fadeTailFromRightAmp = 1 - fadeTailFromRightCounter / fadeTailFromRight;
          tailTrimmedChData.push(item * fadeTailFromRightAmp);
          fadeTailFromRightCounter++;
        }
      }
      i++;
    })

    // for (let i = 0; i < tailTrimmedChData.length - 1; i++) {
    //   if (i > readMultiplyerFromStartLength) {
    //     // tailTrimmedChData[i] = 0;
    //   }
    // }

    const trimOriginFromRight = 5000//4000;

    let fadeStart = periodContainer.chData.length * 0.75 - trimOriginFromRight;
    let fadeLength = periodContainer.chData.length * 0.22 - trimOriginFromRight;

    if (this.crossfadingWIthLinkedTailMixType === 'A') {
      /**
       * Do nothing
       */
    } else if (this.crossfadingWIthLinkedTailMixType === 'B') {
      fadeStart = periodContainer.chData.length * 0.65 - trimOriginFromRight;
      fadeLength = periodContainer.chData.length * 0.32 - trimOriginFromRight;
    }


    // const fadeStart = periodContainer.chData.length * 0.65;
    // const fadeLength = periodContainer.chData.length * 0.22;

    // const fadeStart = periodContainer.chData.length * 0.55;
    // const fadeLength = periodContainer.chData.length - fadeStart;

    // const fadeStart = periodContainer.chData.length * 0.55;
    // const fadeLength = periodContainer.chData.length * 0.22;


    // const fadeStart = periodContainer.chData.length * 0.35;
    // const fadeLength = periodContainer.chData.length * 0.42;

    // const fadeStart = periodContainer.chData.length * 0.35;
    // const fadeLength = periodContainer.chData.length * 0.22;

    // const fadeStart = periodContainer.chData.length * 0.65;
    // const fadeLength = periodContainer.chData.length * 0.32;
    // cc 30 - переделать
    // const fadeStart = periodContainer.chData.length * 0.25;
    // const fadeLength = periodContainer.chData.length * 0.22;

    // const fadeStart = periodContainer.chData.length - (periodContainer.chData.length / 12);
    // const fadeLength = periodContainer.chData.length - fadeStart;

    // const fadeStart = periodContainer.chData.length * 0.55;
    // const fadeLength = periodContainer.chData.length * 0.42;
    let maxForTarget = 0;
    let maxForTail = 0;
    let ampMultiplyer = 0;

    if (channelNameLocal === 'R') {
      this.crossfadingWIthLinkedTailUseStoredAmpMultiplyer = true;
    }

    if (!this.crossfadingWIthLinkedTailUseStoredAmpMultiplyer) {
      for (let i = Math.floor(fadeStart + fadeLength * 0.85); i < fadeStart + fadeLength; i++) {
        if (maxForTail < tailTrimmedChData[i]) {
          maxForTail = tailTrimmedChData[i];
        }
        if (maxForTarget < periodContainer.chData[i]) {
          maxForTarget = periodContainer.chData[i];
        }
      }

      ampMultiplyer = maxForTarget / maxForTail;
      this.crossfadingWIthLinkedTailAmpMultiplyer = maxForTarget / maxForTail;
    } else {
      ampMultiplyer = this.crossfadingWIthLinkedTailAmpMultiplyer;
    }

    let tailTrimmedAdjustedChData: Float32Array = new Float32Array(tailTrimmedChData);

    if (this.crossfadingWIthLinkedTailExtraLength && !this.crossfadingWIthLinkedTailUseDataWithNewSampleRate) {
      tailTrimmedAdjustedChData = this.getAdjustedChDataForPeriod({
        chData: new Float32Array(tailTrimmedChData),
        targetLength: tailTrimmedChData.length + this.crossfadingWIthLinkedTailExtraLength,
      });
    }

    /**
     * 44100 samples per 1 second
     *
     *     N samples per Q length
     *     x samples per New length
     *     x = new Length * N / Q
     *
     *     Q length New length
     *     old sr   new sr
     *
     *     new SR = old sr * new l / old l
     *
     */

    const newSampleRate = 44100 * tailTrimmedChData.length / tailTrimmedAdjustedChData.length;

    console.log(`newSampleRate ${newSampleRate}`);

    if (this.crossfadingWIthLinkedTailTrim < 0) {
      const arrayTemp: number[] = [];

      for (let i = 0; i < Math.abs(this.crossfadingWIthLinkedTailTrim); i++) {
        arrayTemp.push(0);
      }
      tailTrimmedAdjustedChData.forEach(item => {
        arrayTemp.push(item);
      })

      tailTrimmedAdjustedChData = new Float32Array(arrayTemp);
    }

    const tailPeriodContainerPlottingChData: number[] = [];
    const yAxisScale = this.crossfadingWIthLinkedTailUseYAxisScale ? this.crossfadingWIthLinkedTailYAxisScale : 1;

    tailTrimmedAdjustedChData.forEach(dataItem => {
      tailPeriodContainerPlottingChData.push(dataItem * ampMultiplyer * yAxisScale + 0.5);
    })
    this.plt.plot(tailPeriodContainerPlottingChData, 0);

    const chDataResultTemp: number[] = [];
    let fadeMultiplyer = 0;
    let fadeCounter = 0;
    let i2 = 0;

    const crossFadeMarker: number[] = [];

    this.crossfadingWIthLinkedTailFunctionsSum = 0;

    tailTrimmedAdjustedChData.forEach(item => {
      if (i2 < fadeStart + fadeLength) {
        this.crossfadingWIthLinkedTailFunctionsSum = this.crossfadingWIthLinkedTailFunctionsSum
          + Math.abs(item - periodContainer.chData[i2]);
      }

      if (i2 < fadeStart) {
        chDataResultTemp.push(periodContainer.chData[i2]);
        crossFadeMarker.push(-1);
        // } else if (i2 < fadeStart + fadeLength && periodContainer.chData[i2]) {
      } else if (i2 < fadeStart + fadeLength) {
        fadeMultiplyer = fadeCounter / fadeLength;

        chDataResultTemp.push(periodContainer.chData[i2] * (1 - fadeMultiplyer) + item * ampMultiplyer * fadeMultiplyer);
        // chDataResultTemp.push(item * ampMultiplyer * fadeMultiplyer);
        crossFadeMarker.push(periodContainer.chData[i2] * yAxisScale - 0.5);
        fadeCounter++;
      } else {
        chDataResultTemp.push(item * ampMultiplyer);
      }
      i2++;
    })
    const periodResult: Period = {chData: new Float32Array(chDataResultTemp)};
    const periodResultPlottingChData: number[] = [];

    periodResult.chData.forEach(item => {
      periodResultPlottingChData.push(item * yAxisScale);
    })

    this.plt.plot(periodResultPlottingChData, 0);

    const periodBeforePlottingChData: number[] = [];

    periodContainer.chData.forEach(dataItem => {
      periodBeforePlottingChData.push(dataItem * yAxisScale + 1);
    })
    this.plt.plot(periodBeforePlottingChData, 0);

    this.plt.plot(crossFadeMarker, 0);

    this.plt.show();

    const revertResult = false;
    let revertedResultTemp: Float32Array;

    if (revertResult) {
      const arrayTemp: number[] = [];
      periodResult.chData.forEach(item => {
        arrayTemp.push(-item);
      });
      revertedResultTemp = new Float32Array(arrayTemp);
    } else {
      revertedResultTemp = periodResult.chData;
    }

    // return periodResult.chData;
    return revertedResultTemp;
  }

  async extendByReverting(noDownload = false, channelName?: string): Promise<void> {
    const audioCtx = new AudioContext();
    const ccId = this.logExtendByRevertingCCNum;
    const channelNameLocal = channelName ? channelName : this.logExtendByRevertingChannelName;
    const fileName = `assets/forReverse/127_5dB/Kurcy_127_0${ccId}_${channelNameLocal}`;
    const fileNameJson = `assets/forReverse/127_5dB/Kurcy_127_0${ccId}_L`;
    const audioBufferTemp = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`${fileName}.wav`));
    const periodsTemp = await this.getJsonFromUrl(`${fileNameJson}.json`);
    const periodsFromChData = this.periodsFromChData(audioBufferTemp.getChannelData(0), periodsTemp);
    const periodsResult: Period[] = [];
    const periodsForCheckLine: Period[] = [];
    const periodsFromChDataTrimmedFromRight: Period[] = [];


    const fileNameSecond = `assets/forReverse/127_5dB/Tail_127_${ccId}_${channelNameLocal}`;
    const fileNameJsonSecond = `assets/forReverse/127_5dB/Tail_127_${ccId}_L`;
    const audioBufferTempSecond = await audioCtx.decodeAudioData(await this.getArrayBufferFromUrl(`${fileNameSecond}.wav`));
    let periodsTempSecond = await this.getJsonFromUrl(`${fileNameJsonSecond}.json`);

    if (this.logExtendByRevertingTailDataShift) {
      const periodsTemp: number[] = [];
      periodsTempSecond.forEach(item => {
        periodsTemp.push(item + this.logExtendByRevertingTailDataShift);
      })

      periodsTempSecond = periodsTemp;
    }

    const periodsFromChDataSecond = this.periodsFromChData(audioBufferTempSecond.getChannelData(0), periodsTempSecond);

    const trimNLastPeriodsNum = 5;
    let i1 = 0;
    periodsFromChData.forEach(item => {
      if (i1 < (periodsFromChData.length - trimNLastPeriodsNum)) {
        periodsFromChDataTrimmedFromRight.push(item);
      }
      i1++;
    });

    const lastNWrongPeriods = 0; //2;
    let checkingLineStart = 0;
    // последний период состоит из кроссфейда последнего и предпоследнего,
    // поэтому из основной волны убирается последний период,
    // чтобы волна заканчивалась на предпоследнем периоде
    const extraTrimNumForFade = 1;
    const renderMainData = true;
    if (renderMainData) {
      periodsFromChDataTrimmedFromRight.forEach(item => {
        if (periodsResult.length < periodsFromChDataTrimmedFromRight.length - lastNWrongPeriods - extraTrimNumForFade) {
          periodsResult.push(item);
          checkingLineStart = checkingLineStart + item.chData.length;
        }
      })
    }

    let chDataOfLastTemp: number[] = [];
    const twoPeriodsChData: number[] = [];
    let additionalPeriodLength = 0;
    const useTwoPeriodsChData = false;

    if (useTwoPeriodsChData) {

      periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 2].chData.forEach(item => {
        twoPeriodsChData.push(item);
        additionalPeriodLength++;
      })
      periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 1].chData.forEach(item => {
        twoPeriodsChData.push(item);
      })
      // const tresholdTemp = 3;
      const tresholdTemp = additionalPeriodLength + this.extendByRevertingTrim.left;
      const trimFromRight = this.extendByRevertingTrim.right;
      let i = 0;
      twoPeriodsChData.forEach(item => {
        if (i > tresholdTemp &&
          i < (twoPeriodsChData.length - trimFromRight)) {
          chDataOfLastTemp.push(item);
        }
        i++;
      })
    } else {
      periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 1].chData.forEach(item => {
        twoPeriodsChData.push(item);
      })
      chDataOfLastTemp = this.crossfadePeriodChDataWithPrevious(twoPeriodsChData, periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 2].chData, this.logExtendByRevertingFade);
    }


    periodsForCheckLine.push(periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 3]);
    periodsForCheckLine.push(periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 2]);
    periodsForCheckLine.push(periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 1]);

    const lastPeriod: Period = {chData: new Float32Array(chDataOfLastTemp)};


    for (let i = 0; i < 10; i++) {
      // periodsResult.push(lastPeriod);
    }

    const periodsResultBeforeMixing: Period[] = [];
    periodsResult.forEach(item => {
      periodsResultBeforeMixing.push(item);
    })

    const useGoForwardBackCycle = true;
    const targetPeriodsNum = (periodsFromChDataTrimmedFromRight.length - 1) * 2;
    let runningPeriodSum = 0;
    const mixWithSecond = true;
    const addjustTailPeriods = false;
    // const blendPeriodStart = periodsResult.length - 1;
    const blendPeriodStart = 25;
    const blendPeriodsToCrossfade = 5;
    let ampMultiplyer = 1;
    const tailPeriodsAdjusted: Period[] = [];
    if (!mixWithSecond) {
      if (useGoForwardBackCycle) {
        const cycleNum = 10;
        const max = this.cycleGoBackForthDepth;
        const min = 0;
        for (let iCycle = 0; runningPeriodSum < targetPeriodsNum; iCycle++) {
          for (let i = min; i < max && runningPeriodSum < targetPeriodsNum; i++) {
            const crossfadedTemp = this.crossfadePeriodChDataWithPrevious(
              periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 1 - i].chData,
              periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 1 - i - 2].chData,
              this.logExtendByRevertingFade
            );

            periodsResult.push({chData: new Float32Array(crossfadedTemp)});

            runningPeriodSum++;
          }

          periodsResult.push(periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 1 - max]);
          runningPeriodSum++;

          for (let i2 = max - 1; i2 > 0 && runningPeriodSum < targetPeriodsNum; i2--) {
            periodsResult.push(periodsFromChDataTrimmedFromRight[periodsFromChDataTrimmedFromRight.length - 1 - i2]);
            runningPeriodSum++;
          }
        }
      } else {
        for (let i = targetPeriodsNum; i >= 0; i--) {
          periodsResult.push(lastPeriod);
        }
      }
    } else {
      let iTailPeriodsAdjusted = 0
      periodsFromChDataSecond.forEach(item => {
        if (addjustTailPeriods && periodsResult[iTailPeriodsAdjusted]) {
          const chDataTailTemp = this.getAdjustedChDataForPeriod({
            chData: periodsFromChDataSecond[iTailPeriodsAdjusted].chData,
            targetLength: periodsResult[iTailPeriodsAdjusted].chData.length
          });

          tailPeriodsAdjusted.push({chData: chDataTailTemp});
        } else {
          tailPeriodsAdjusted.push(item);
        }
        iTailPeriodsAdjusted++;
      })

      const newResult: Period[] = [];

      let i = 0;

      let crossfadePeriodCounter = 0;
      tailPeriodsAdjusted.forEach(item => {
        if (i < blendPeriodStart) {
          newResult.push(periodsResult[i]);

          let maxTarget = 0;
          periodsResult[i].chData.forEach(chItem => {
            if (chItem > maxTarget) {
              maxTarget = chItem;
            }
          })

          let maxSecond = 0;
          item.chData.forEach(chItem => {
            if (chItem > maxSecond) {
              maxSecond = chItem;
            }
          });

          ampMultiplyer = maxTarget / maxSecond;
          // ampMultiplyer = 0.1
        } else if (addjustTailPeriods && i >= blendPeriodStart && i < blendPeriodStart + blendPeriodsToCrossfade) {
          const chDataTempAmped: number[] = [];
          item.chData.forEach(chItem => {
            chDataTempAmped.push(chItem * ampMultiplyer);
          });

          let amplitude = crossfadePeriodCounter / blendPeriodsToCrossfade;

          const chDataTailTemp = this.getAdjustedChDataForPeriod({
            chData: new Float32Array(chDataTempAmped),
            targetLength: periodsResult[i].chData.length
          });

          const chDataTemp: number[] = [];

          let ch02_i = 0;
          periodsResult[i].chData.forEach(ch02 => {
            chDataTemp.push(ch02 * (1 - amplitude) + chDataTailTemp[ch02_i] * amplitude);
            ch02_i++;
          })

          newResult.push({chData: new Float32Array(chDataTemp)});
          crossfadePeriodCounter++;
        } else if (!addjustTailPeriods && i === blendPeriodStart) {
          const chDataTempAmped: number[] = [];
          item.chData.forEach(chItem => {
            chDataTempAmped.push(chItem * ampMultiplyer);
          });

          const crossfadedTemp = this.crossfadePeriodChDataWithPrevious(
            periodsResult[i].chData,
            chDataTempAmped,
            this.logExtendByRevertingFade
          );
          newResult.push({chData: new Float32Array(crossfadedTemp)});
        } else {
          const chDataTempAmped: number[] = [];
          item.chData.forEach(chItem => {
            chDataTempAmped.push(chItem * ampMultiplyer);
          });
          newResult.push({chData: new Float32Array(chDataTempAmped)});
        }
        i++;
      })

      let i2 = 0;
      newResult.forEach(item => {
        periodsResult[i2] = item;
        i2++;
      })
    }


    const periodsTempForPlotting: number[] = [];
    periodsTemp.forEach(item => {
      periodsTempForPlotting.push(item);
    })
    debugger;
    periodsTempForPlotting.push(periodsTempForPlotting[periodsTemp.length - 1] * 2);

    // this.drawWaveformWithMarkers({
    //   fileName: fileName,
    //   periodsFromChData: periodsResult,
    //   periodsTemp: periodsTempForPlotting,
    // });

    let iPlotRunningSum = 0;
    let tailPlotStart = 0;
    let i = 0;
    periodsResult.forEach(period => {
      const chDataTemp: number[] = [];
      period.chData.forEach(dataItem => {
        chDataTemp.push(dataItem);
      })
      // if (i < limit) {
      this.plt.plot(chDataTemp, iPlotRunningSum);
      this.plt.plotVerticalLine(iPlotRunningSum);
      // }
      if (i === blendPeriodStart) {
        tailPlotStart = iPlotRunningSum;
      }
      i++;
      iPlotRunningSum = iPlotRunningSum + period.chData.length;
    })
    let iRunningSumForCheckLine = 0;
    periodsForCheckLine.forEach(period => {
      const chDataForCheckLine: number[] = [];
      period.chData.forEach(dataItem => {
        chDataForCheckLine.push(dataItem + 0.01);
      })
      this.plt.plot(chDataForCheckLine, iRunningSumForCheckLine + checkingLineStart);
      iRunningSumForCheckLine = iRunningSumForCheckLine + period.chData.length;
    })

    let iRunningSumForTailLine = tailPlotStart;
    const limitTailDraw = 29;
    let iTail = 0;

    //blendPeriodStart
    tailPeriodsAdjusted.forEach(period => {
      const chDataTemp: number[] = [];
      period.chData.forEach(dataItem => {
        chDataTemp.push(dataItem * ampMultiplyer + 0.5);
      })
      if (iTail >= blendPeriodStart) {
        this.plt.plot(chDataTemp, iRunningSumForTailLine);
        this.plt.plotVerticalLine(iRunningSumForTailLine, 'red');
        iRunningSumForTailLine = iRunningSumForTailLine + period.chData.length;
      }
      iTail++;
    })

    const drawBeforeMixing = true;
    if (drawBeforeMixing) {
      let iPlotBeforeMixingRunningSum = 0;
      let iBeforeMixing = 0;
      periodsResultBeforeMixing.forEach(period => {
        const chDataTemp: number[] = [];
        period.chData.forEach(dataItem => {
          chDataTemp.push(dataItem + 1);
        })
        this.plt.plot(chDataTemp, iPlotBeforeMixingRunningSum);
        iBeforeMixing++;
        iPlotBeforeMixingRunningSum = iPlotBeforeMixingRunningSum + period.chData.length;
      })
    }

    this.plt.show();

    if (!noDownload) {
      const uiParms = getUiParams();
      let chDataListForMixDown: { periodList: Period[], offset: number }[] = [];

      chDataListForMixDown.push({periodList: periodsResult, offset: 0});

      let outPutChDataTemp: Float32Array = this.mixDownChDatas(chDataListForMixDown);

      const outPutAB: AudioBuffer = new AudioBuffer({
        length: outPutChDataTemp.length,
        numberOfChannels: 1, // 2
        sampleRate: uiParms.sampleRate,
      });

      outPutAB.copyToChannel(outPutChDataTemp, 0);

      const wavFileData = WavFileEncoder.encodeWavFile(outPutAB, uiParms.wavFileType);
      const blob = new Blob([wavFileData], {type: "audio/wav"});
      this.openSaveAsDialog(blob, `test ${getDateString(new Date())} CC ${this.logExtendByRevertingCCNum} ${channelNameLocal}.wav`);
    }
  }
}

export class DrawWaveformWithMarkersDTO {
  fileName: string;
  periodsFromChData: Period[];
  periodsTemp: number[];
}
