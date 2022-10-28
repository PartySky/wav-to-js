import {Component, HostListener, OnInit} from '@angular/core';
import * as WavFileEncoder from "wav-file-encoder";
import {UiParms} from "./uiParms";
import {Period} from "./period";
import {Note} from "./note";
import {getTransitionSampleName} from "./getTransitionSampleName";
import {midiNoteNumbers} from "./midiNoteNumbers";
import {articulations} from "./articulations";
import {getFormattedName} from "./getFormattedName";
import {getFileFromUrl} from "./getFileFromUrl";
import {PitchDetector} from "./pitchDetector";
import {openSaveAsDialog} from "./openSaveAsDialog";
import {getDateString} from "./getDateString";
import {getUiParams} from "./getUiParams";

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
  channelData_Transition_Dictionary: { [key: string]: Float32Array };
  onInitDateString: string;
  isDataReady = false;
  testPitches = [31.772334293948127, 34.53406421299922, 22.295247724974722, 42.0, 46.91489361702128, 89.45233265720081, 115.44502617801047, 163.33333333333334, 33.13298271975958, 36.1771944216571, 39.83739837398374, 44.232698094282846, 49.71815107102593, 165.1685393258427, 1520.6896551724137, 139.55696202531647, 1520.6896551724137, 112.21374045801527, 252.0, 40.87117701575533, 286.3636363636364, 1470.0, 71.01449275362319, 344.53125, 146.02649006622516, 118.54838709677419, 551.25, 525.0, 400.90909090909093, 416.0377358490566, 512.7906976744187, 420.0, 432.3529411764706, 450.0, 445.45454545454544, 454.63917525773195, 464.2105263157895, 459.375, 469.1489361702128, 479.3478260869565, 474.19354838709677, 479.3478260869565, 474.19354838709677, 474.19354838709677, 469.1489361702128, 469.1489361702128, 469.1489361702128, 474.19354838709677, 469.1489361702128, 474.19354838709677, 474.19354838709677, 474.19354838709677, 469.1489361702128, 474.19354838709677, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 464.2105263157895, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 464.2105263157895, 464.2105263157895, 469.1489361702128, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 900.0, 918.75, 918.75, 918.75, 918.75, 918.75, 918.75, 918.75, 918.75, 454.63917525773195, 454.63917525773195, 450.0, 450.0, 450.0, 450.0, 450.0, 445.45454545454544, 445.45454545454544, 441.0, 432.3529411764706, 420.0, 82.12290502793296, 81.97026022304833, 101.84757505773672, 101.37931034482759, 101.61290322580645, 135.69230769230768, 412.14953271028037, 404.58715596330273, 404.58715596330273, 416.0377358490566, 408.3333333333333, 393.75, 404.58715596330273, 408.3333333333333, 404.58715596330273, 408.3333333333333, 412.14953271028037, 404.58715596330273, 404.58715596330273, 408.3333333333333, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 400.90909090909093, 404.58715596330273, 400.90909090909093, 404.58715596330273, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 404.58715596330273, 400.90909090909093, 404.58715596330273, 404.58715596330273, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 404.58715596330273, 400.90909090909093, 400.90909090909093, 400.90909090909093, 397.2972972972973, 393.75, 88.37675350701403, 23.58288770053476, 404.58715596330273, 397.2972972972973, 390.2654867256637, 393.75, 397.2972972972973, 397.2972972972973, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 397.2972972972973, 400.90909090909093, 400.90909090909093, 404.58715596330273, 400.90909090909093, 400.90909090909093, 404.58715596330273, 404.58715596330273, 416.0377358490566, 400.90909090909093, 412.14953271028037, 408.3333333333333, 420.0, 424.03846153846155, 432.3529411764706, 441.0, 441.0, 469.1489361702128, 122.1606648199446, 454.63917525773195, 454.63917525773195, 454.63917525773195, 459.375, 459.375, 459.375, 459.375, 459.375, 459.375, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 469.1489361702128, 464.2105263157895, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 464.2105263157895, 469.1489361702128, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 469.1489361702128, 464.2105263157895, 464.2105263157895, 464.2105263157895, 464.2105263157895, 469.1489361702128, 469.1489361702128, 464.2105263157895, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 469.1489361702128, 464.2105263157895, 464.2105263157895, 454.63917525773195, 464.2105263157895, 464.2105263157895, 469.1489361702128, 464.2105263157895, 464.2105263157895, 464.2105263157895, 469.1489361702128, 469.1489361702128, 464.2105263157895, 469.1489361702128, 469.1489361702128, 484.61538461538464, 484.61538461538464, 484.61538461538464, 490.0, 490.0, 484.61538461538464, 495.5056179775281, 490.0, 495.5056179775281, 512.7906976744187, 518.8235294117648, 518.8235294117648, 525.0, 525.0, 525.0, 525.0, 525.0, 525.0, 531.3253012048193, 525.0, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 537.8048780487804, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 537.8048780487804, 537.8048780487804, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 531.3253012048193, 525.0, 525.0, 525.0, 518.8235294117648, 525.0, 512.7906976744187, 506.8965517241379, 512.7906976744187, 501.1363636363636, 484.61538461538464, 26.18764845605701, 44.680851063829785, 495.5056179775281, 518.8235294117648, 525.0, 518.8235294117648, 518.8235294117648, 512.7906976744187, 1025.5813953488373, 506.8965517241379, 106.77966101694915, 106.00961538461539, 104.75059382422803, 105.50239234449761, 104.00943396226415, 135.27607361963192, 370.5882352941176, 400.90909090909093, 209.0047393364929, 390.2654867256637, 386.8421052631579, 420.0, 432.3529411764706, 428.15533980582524, 432.3529411764706, 432.3529411764706, 424.03846153846155, 432.3529411764706, 450.0, 454.63917525773195, 214.07766990291262, 436.63366336633663, 432.3529411764706, 432.3529411764706, 436.63366336633663, 436.63366336633663, 428.15533980582524, 428.15533980582524, 428.15533980582524, 428.15533980582524, 424.03846153846155, 420.0, 416.0377358490566, 416.0377358490566, 416.0377358490566, 412.14953271028037, 412.14953271028037, 412.14953271028037, 412.14953271028037, 408.3333333333333, 408.3333333333333, 408.3333333333333, 408.3333333333333, 408.3333333333333, 412.14953271028037, 412.14953271028037, 412.14953271028037, 412.14953271028037, 416.0377358490566, 416.0377358490566, 416.0377358490566, 416.0377358490566, 416.0377358490566, 420.0, 424.03846153846155, 424.03846153846155, 428.15533980582524, 428.15533980582524, 428.15533980582524, 432.3529411764706, 432.3529411764706, 432.3529411764706, 436.63366336633663, 436.63366336633663, 436.63366336633663, 441.0, 441.0, 445.45454545454544, 445.45454545454544, 445.45454545454544, 445.45454545454544, 445.45454545454544, 445.45454545454544, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 454.63917525773195, 454.63917525773195, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 454.63917525773195, 450.0, 454.63917525773195, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 450.0, 445.45454545454544, 450.0, 450.0, 450.0, 445.45454545454544, 450.0, 450.0, 450.0, 450.0, 450.0, 445.45454545454544, 445.45454545454544, 445.45454545454544, 445.45454545454544, 441.0, 441.0, 441.0, 441.0, 436.63366336633663, 432.3529411764706, 432.3529411764706, 428.15533980582524, 428.15533980582524, 424.03846153846155, 428.15533980582524, 424.03846153846155, 420.0, 424.03846153846155, 420.0, 416.0377358490566, 416.0377358490566, 416.0377358490566, 424.03846153846155, 416.0377358490566, 424.03846153846155, 416.0377358490566, 420.0, 420.0, 424.03846153846155, 424.03846153846155, 432.3529411764706, 428.15533980582524, 428.15533980582524, 428.15533980582524, 432.3529411764706, 432.3529411764706, 432.3529411764706, 436.63366336633663, 436.63366336633663, 441.0, 441.0, 441.0, 441.0, 441.0, 441.0, 445.45454545454544, 445.45454545454544, 441.0, 445.45454545454544, 441.0, 445.45454545454544, 441.0, 441.0, 441.0, 441.0, 441.0, 441.0, 441.0, 441.0, 436.63366336633663, 436.63366336633663, 436.63366336633663, 436.63366336633663, 432.3529411764706, 432.3529411764706, 428.15533980582524, 428.15533980582524, 428.15533980582524, 424.03846153846155, 424.03846153846155, 420.0, 416.0377358490566, 416.0377358490566, 412.14953271028037, 412.14953271028037, 412.14953271028037, 412.14953271028037, 412.14953271028037, 408.3333333333333, 404.58715596330273, 404.58715596330273, 404.58715596330273, 408.3333333333333, 408.3333333333333, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 404.58715596330273, 400.90909090909093, 404.58715596330273, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 397.2972972972973, 400.90909090909093, 400.90909090909093, 400.90909090909093, 397.2972972972973, 397.2972972972973, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 400.90909090909093, 397.2972972972973, 400.90909090909093, 400.90909090909093, 400.90909090909093, 397.2972972972973, 397.2972972972973, 393.75, 393.75, 393.75, 393.75, 390.2654867256637, 386.8421052631579, 386.8421052631579, 386.8421052631579, 383.4782608695652, 380.17241379310343, 376.9230769230769, 373.728813559322, 367.5, 364.46280991735534, 364.46280991735534, 367.5, 364.46280991735534, 361.4754098360656, 364.46280991735534, 358.5365853658537, 358.5365853658537, 350.0, 352.8, 355.64516129032256, 350.0, 350.0, 347.244094488189, 347.244094488189, 347.244094488189, 347.244094488189, 347.244094488189, 350.0, 347.244094488189, 347.244094488189, 350.0, 352.8, 355.64516129032256, 352.8, 358.5365853658537, 355.64516129032256, 355.64516129032256, 355.64516129032256, 355.64516129032256, 352.8, 352.8, 350.0, 352.8, 350.0, 350.0, 350.0, 350.0, 350.0, 347.244094488189, 350.0, 347.244094488189, 347.244094488189, 344.53125, 347.244094488189, 344.53125, 344.53125, 347.244094488189, 341.86046511627904, 344.53125, 341.86046511627904, 341.86046511627904, 341.86046511627904, 344.53125, 341.86046511627904, 341.86046511627904, 341.86046511627904, 341.86046511627904, 341.86046511627904, 344.53125, 341.86046511627904, 341.86046511627904, 341.86046511627904, 341.86046511627904, 341.86046511627904, 341.86046511627904, 344.53125, 344.53125, 344.53125, 347.244094488189, 350.0, 350.0, 352.8, 347.244094488189, 350.0, 350.0, 350.0, 352.8, 352.8, 355.64516129032256, 355.64516129032256, 355.64516129032256, 358.5365853658537, 358.5365853658537, 358.5365853658537, 361.4754098360656, 361.4754098360656, 361.4754098360656, 367.5, 364.46280991735534, 367.5, 367.5, 367.5, 367.5, 367.5, 367.5, 367.5, 367.5, 370.5882352941176, 367.5, 367.5, 367.5, 364.46280991735534, 364.46280991735534, 361.4754098360656, 364.46280991735534, 361.4754098360656, 361.4754098360656, 358.5365853658537, 355.64516129032256, 355.64516129032256, 355.64516129032256, 352.8, 352.8, 350.0, 352.8, 347.244094488189, 347.244094488189, 344.53125, 344.53125, 341.86046511627904, 339.2307692307692, 341.86046511627904, 341.86046511627904, 341.86046511627904, 341.86046511627904, 339.2307692307692, 339.2307692307692, 341.86046511627904, 336.6412213740458, 339.2307692307692, 339.2307692307692, 339.2307692307692, 339.2307692307692, 344.53125, 339.2307692307692, 339.2307692307692, 341.86046511627904, 341.86046511627904, 341.86046511627904, 347.244094488189, 344.53125, 344.53125, 347.244094488189, 347.244094488189, 347.244094488189, 350.0, 350.0, 350.0, 350.0, 352.8, 352.8, 355.64516129032256, 355.64516129032256, 358.5365853658537, 361.4754098360656, 361.4754098360656, 361.4754098360656, 361.4754098360656, 364.46280991735534, 364.46280991735534, 364.46280991735534, 367.5, 367.5, 367.5, 370.5882352941176, 370.5882352941176, 370.5882352941176, 373.728813559322, 373.728813559322, 373.728813559322, 373.728813559322, 373.728813559322, 376.9230769230769, 373.728813559322, 373.728813559322, 373.728813559322, 373.728813559322, 370.5882352941176, 373.728813559322, 370.5882352941176, 370.5882352941176, 367.5, 367.5, 367.5, 364.46280991735534, 364.46280991735534, 361.4754098360656, 358.5365853658537, 358.5365853658537, 358.5365853658537, 352.8, 355.64516129032256, 350.0, 350.0, 347.244094488189, 347.244094488189, 344.53125, 344.53125, 344.53125, 341.86046511627904, 339.2307692307692, 339.2307692307692, 341.86046511627904, 339.2307692307692, 341.86046511627904, 336.6412213740458, 339.2307692307692, 336.6412213740458, 336.6412213740458, 339.2307692307692, 341.86046511627904, 341.86046511627904, 339.2307692307692, 339.2307692307692, 339.2307692307692, 341.86046511627904, 339.2307692307692, 339.2307692307692, 341.86046511627904, 341.86046511627904, 341.86046511627904, 341.86046511627904, 339.2307692307692, 344.53125, 344.53125, 344.53125, 344.53125, 344.53125, 347.244094488189, 344.53125, 347.244094488189, 347.244094488189, 350.0, 352.8, 355.64516129032256, 355.64516129032256, 352.8, 361.4754098360656, 361.4754098360656, 361.4754098360656, 361.4754098360656, 361.4754098360656, 364.46280991735534, 367.5, 364.46280991735534, 367.5, 367.5, 370.5882352941176, 370.5882352941176, 373.728813559322, 373.728813559322, 370.5882352941176, 370.5882352941176, 376.9230769230769, 373.728813559322, 373.728813559322, 376.9230769230769, 376.9230769230769, 373.728813559322, 373.728813559322, 373.728813559322, 370.5882352941176, 373.728813559322, 376.9230769230769, 376.9230769230769, 367.5, 370.5882352941176, 367.5, 367.5, 364.46280991735534, 361.4754098360656, 361.4754098360656, 364.46280991735534, 361.4754098360656, 355.64516129032256, 358.5365853658537, 358.5365853658537, 352.8, 352.8, 352.8, 352.8, 347.244094488189, 350.0, 347.244094488189, 344.53125, 344.53125, 352.8, 341.86046511627904, 341.86046511627904, 339.2307692307692, 339.2307692307692, 350.0, 336.6412213740458, 341.86046511627904, 341.86046511627904, 341.86046511627904, 347.244094488189, 350.0, 344.53125, 350.0, 347.244094488189, 344.53125, 352.8, 350.0, 347.244094488189, 355.64516129032256, 350.0, 339.2307692307692, 350.0, 347.244094488189, 355.64516129032256, 361.4754098360656, 367.5, 364.46280991735534, 361.4754098360656, 367.5, 373.728813559322, 370.5882352941176, 364.46280991735534, 364.46280991735534, 364.46280991735534, 367.5, 361.4754098360656, 364.46280991735534, 367.5, 364.46280991735534, 364.46280991735534, 367.5, 370.5882352941176, 376.9230769230769, 373.728813559322, 380.17241379310343, 376.9230769230769, 373.728813559322, 376.9230769230769, 373.728813559322, 373.728813559322, 373.728813559322, 373.728813559322, 376.9230769230769, 370.5882352941176, 370.5882352941176, 367.5, 364.46280991735534, 364.46280991735534, 364.46280991735534, 358.5365853658537, 358.5365853658537, 364.46280991735534, 355.64516129032256, 358.5365853658537, 358.5365853658537];

  constructor() {
  }

  async ngOnInit() {
debugger;
    this.generateWavFile();

    return;

    let pi = new PitchDetector();
    pi.periodsDetector();
    return;
    await this.loadData();
    this.initMidi();
    this.onInitDateString = getDateString(new Date());
  }

  async loadData() {
    this.channelData_Transition_Dictionary = await this.loadAudioBufferForSamples();
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

  async getFileFromUrl(url: string): Promise<ArrayBuffer> {
    return getFileFromUrl(url);
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
        let noteABTemp: Float32Array;
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
          noteABTemp = this.channelData_Transition_Dictionary[sampleName];
          if (nextNoteId === midiNoteNumbers.N_C1_24_VibratoTrigger) {
            noteABTemp = this.trimNFromEnd(noteABTemp, 1500)
          }

          const periodList = this.getChanelDataList(noteABTemp);

          chDataListForMixDown.push({
            periodList: periodList,
            offset: item.offset,
          });
        }
        i++;
      })
      this.notesToRender = [];
    }

    let outPutChDataTemp = this.mixDownChDatas(chDataListForMixDown);

    let test = true;
    if (test) {
      debugger;
      // @ts-ignore
      outPutChDataTemp = [];
      let counter = 0;
      // 35 ArtFastDown RR1

      const drawMarker = false;

      for (let i = 0; i < 20; i++) {
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

        // let noteABTemp = this.channelData_Transition_Dictionary[`35 ArtFastDown RR${i}`];
        //
        // noteABTemp.forEach(item => {
        //   outPutChDataTemp[counter] = item;
        //   counter++;
        // })
        //
        // let noteABTemp1 = this.channelData_Transition_Dictionary[`35 vib RR${i}`];
        //
        // noteABTemp1.forEach(item => {
        //   outPutChDataTemp[counter] = item;
        //   counter++;
        // })

        const indexTemp = 52;
        const interval = 1;
        let noteABTemp = this.channelData_Transition_Dictionary[getFormattedName({
          midiNum: indexTemp,
          midiNumSecond: indexTemp + interval,
          art: articulations.leg,
          rr: i
        })];

        noteABTemp.forEach(item => {
          outPutChDataTemp[counter] = item;
          counter++;
        })

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

  getChanelDataList(chData: Float32Array): Period[] {
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

  async loadAudioBufferForSamples(): Promise<{ [key: string]: Float32Array }> {
    console.log('start loadAudioBufferForSamples')
    const AB_Transition_Eb_F = await this.getFileFromUrl('assets/Eb2 Up2.wav');
    const AB_Transition_F_G = await this.getFileFromUrl('assets/F2 Up2.wav');

    let audioBuffer_FastSprite_Down_midiNum_List: Float32Array[][] = [];
    let audioBuffer_FastSprite_Up_midiNum_List: Float32Array[][] = [];

    let audioBuffer_VibratoSprite_midiNum_List: Float32Array[][] = [];

    let audioBuffer_LegatoPairs_Up_01_midiNum_List: Float32Array[][] = [];

    const audioCtx = new AudioContext();

    const skipped = true;

    if (!skipped) {
      for (let i = 35; i < 71; i++) {
        const audioBufferTemp = await audioCtx.decodeAudioData(await this.getFileFromUrl(`assets/lib/Fast/Fast Sprite ${i}.wav`));
        const audioBuffer_FastSprite_Down_Up_midiNum_List = this.gerChannelDataListFromSprites(audioBufferTemp.getChannelData(0));
        audioBuffer_FastSprite_Down_midiNum_List[i] = this.getStrokesList(audioBuffer_FastSprite_Down_Up_midiNum_List, 'Down');
        audioBuffer_FastSprite_Up_midiNum_List[i] = this.getStrokesList(audioBuffer_FastSprite_Down_Up_midiNum_List, 'Up');
      }

      const trimVibFromStart = 2500;
      for (let i = 42; i < 72; i++) {
        const audioBufferTemp = await audioCtx.decodeAudioData(await this.getFileFromUrl(`assets/lib/Vibrato/Vibrato Sprite ${i}.wav`));
        audioBuffer_VibratoSprite_midiNum_List[i] = this.trimNFromStartForArray(
          this.gerChannelDataListFromSprites(audioBufferTemp.getChannelData(0)), trimVibFromStart
        );
      }
    }

    for (let i = 52; i < 71; i++) {
      const audioBufferTemp = await audioCtx.decodeAudioData(await this.getFileFromUrl(`assets/lib/Legato/Legato Up 01/Legato Up 01 Sprite ${i}.wav`));
      audioBuffer_LegatoPairs_Up_01_midiNum_List[i] = this.getLegatoPairSamplesFromSprite(audioBufferTemp.getChannelData(0));
    }

    let audioBuffer_Note_A = await audioCtx.decodeAudioData(await this.getFileFromUrl('assets/Tenor Sax Eb.wav'));
    let audioBuffer_Note_B = await audioCtx.decodeAudioData(await this.getFileFromUrl('assets/Tenor Sax F.wav'));
    let audioBuffer_Note_C = await audioCtx.decodeAudioData(await this.getFileFromUrl('assets/Tenor Sax G.wav'));
    let audioBuffer_Transition_Eb_F = await audioCtx.decodeAudioData(AB_Transition_Eb_F);
    let audioBuffer_Transition_F_G = await audioCtx.decodeAudioData(AB_Transition_F_G);

    let result: { [key: string]: Float32Array } = {};

    audioBuffer_FastSprite_Down_midiNum_List.forEach((audioBuffer, index) => {
      if (audioBuffer) {
        let localRR = 0;
        audioBuffer.forEach(item => {
          result[getFormattedName({
            midiNum: index,
            art: articulations.fastDown,
            rr: localRR
          })] =
            item;
          localRR++;
        })
      }
    })

    audioBuffer_FastSprite_Up_midiNum_List.forEach((audioBuffer, index) => {
      if (audioBuffer) {
        let localRR = 0;
        audioBuffer.forEach(item => {
          result[getFormattedName({
            midiNum: index,
            art: articulations.fastUp,
            rr: localRR
          })] =
            item;
          localRR++;
        })
      }
    })

    audioBuffer_VibratoSprite_midiNum_List.forEach((audioBuffer, index) => {
      if (audioBuffer) {
        let localRR = 0;
        audioBuffer.forEach(item => {
          result[getFormattedName({
            midiNum: index,
            art: articulations.vib,
            rr: localRR
          })] =
            item;
          localRR++;
        })
      }
    })

    audioBuffer_LegatoPairs_Up_01_midiNum_List.forEach((audioBuffer, index) => {
      if (audioBuffer) {
        const interval = 1;
        let localRR = 0;
        audioBuffer.forEach(item => {
          result[getFormattedName({
            midiNum: index,
            midiNumSecond: index + interval,
            art: articulations.leg,
            rr: localRR
          })] =
            item;
          localRR++;
        })
      }
    })

    result[`${midiNoteNumbers.N_Eb2_39} ${midiNoteNumbers.N_F2_41}`] =
      audioBuffer_Transition_Eb_F.getChannelData(0);
    result[`${midiNoteNumbers.N_F2_41} ${midiNoteNumbers.N_G2_43}`] =
      audioBuffer_Transition_F_G.getChannelData(0);
    result[`${midiNoteNumbers.N_Eb2_39}`] =
      audioBuffer_Note_A.getChannelData(0);
    result[`${midiNoteNumbers.N_F2_41}`] =
      audioBuffer_Note_B.getChannelData(0);
    result[`${midiNoteNumbers.N_G2_43}`] =
      audioBuffer_Note_C.getChannelData(0);


    console.log('end loadAudioBufferForSamples')

    return result;
  }

  gerChannelDataListFromSprites(chData: Float32Array): Float32Array[] {
    let periodsFromChData = this.getChanelDataList(chData);
    let lastPeriodMax = 0;
    const minPeriodsInNote = 4;
    let chDateForCurrentNote: number[] = [];
    let result: Float32Array[] = [];
    let periodCounter = 0;
    const delta = 0.05;
    const drawMarker = false;

    periodsFromChData.forEach(item => {
      let currentMax = 0;

      item.chData.forEach(chDataItem => {
        if (chDataItem > currentMax) {
          currentMax = chDataItem;
        }
      })

      if (periodCounter <= 1) {
        if (drawMarker) {
          chDateForCurrentNote.push(-0.25);
        }
        item.chData.forEach(chDataItem => {
          chDateForCurrentNote.push(chDataItem);
        })
      } else if (currentMax - delta <= lastPeriodMax || periodCounter < minPeriodsInNote) {
        /**
         * Нужно писать chData ноты в текущую ноту в result
         */
        if (drawMarker) {
          chDateForCurrentNote.push(-0.5);
        }
        item.chData.forEach(chDataItem => {
          chDateForCurrentNote.push(chDataItem);
        })
      } else {
        /**
         * Началась новая нота
         */
        result.push(new Float32Array(chDateForCurrentNote));
        chDateForCurrentNote = [];

        if (drawMarker) {
          chDateForCurrentNote.push(-0.75);
        }

        item.chData.forEach(chDataItem => {
          chDateForCurrentNote.push(chDataItem);
        })
        lastPeriodMax = 0;
        periodCounter = 0;
      }

      lastPeriodMax = currentMax;
      periodCounter++;


    })

    return result;
  }

  private getStrokesList(dataList: Float32Array[], stroke: string): Float32Array[] {
    let result: Float32Array[] = []

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

  getLegatoPairSamplesFromSprite(dataList: Float32Array, freq_01?: number, freq_02?: number): Float32Array[] {
    let dataListTrimmed: number[] = [];
    let endOfTrimming = false;
    const trimTrashold = 0.1;

    for (let i = 0; i < dataList.length; i++) {
      if (!endOfTrimming) {
        if (dataList[i] < trimTrashold) {
          /**
           * Do nothing
           */
        } else {
          endOfTrimming = true;
        }
      } else {
        dataListTrimmed.push(dataList[i]);
      }
    }

    let periodList = this.getChanelDataList(new Float32Array(dataListTrimmed));

    for (let x = 0; x < periodList.length; x++) {
      for (let i = 0; i < 4; i++) {
        periodList[x].chData[i] = -0.75;
      }
    }

    const noteChangeLenghtTrashold = 10;
    let previousPeriodLength = 0;

    let i = 0;

    let notesPairChData: number[] = [];
    let notesPairChDataSet: number[][] = [];

    periodList.forEach(item => {
      if (Math.abs(item.chData.length - previousPeriodLength) > noteChangeLenghtTrashold) {
        notesPairChDataSet.push(notesPairChData);
        notesPairChData = [];
      } else {
        /**
         * Do nothing
         */
      }

      item.chData.forEach(chData => {
        notesPairChData.push(chData);
        i++;
      })

      previousPeriodLength = item.chData.length;
    })

    let result: Float32Array[] = [];

    notesPairChDataSet.forEach(notesPairChData => {
      let notesPair = [];
      // for (let i = 0; i < 10; i++) {
      //   notesPair.push(-0.75);
      // }

      notesPairChData.forEach(item => {
        notesPair.push(item);
      })

      // for (let i = 0; i < 10; i++) {
      //   notesPair.push(0.75);
      // }

      result.push(new Float32Array(notesPair));
    })

    return result;
  }
}
