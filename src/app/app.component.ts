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
import {Header, Midi, Track} from "@tonejs/midi";
import {Note, NoteOffEvent, NoteOnEvent} from "@tonejs/midi/dist/Note";

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

  constructor() {
  }

  async ngOnInit() {
    this.initPlt();
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
}

export class DrawWaveformWithMarkersDTO {
  fileName: string;
  periodsFromChData: Period[];
  periodsTemp: number[];
}
