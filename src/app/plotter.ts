import {FigureText} from "./figureText";
import {FigureVerticalLine} from "./figureVerticalLine";
import {FigureArrayLine} from "./figureArrayLine";
import {openSaveAsDialog} from "./openSaveAsDialog";
import {getDateString} from "./getDateString";
import {Marker} from "./marker";

export class Plotter {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private maxXPixels = 1300;
  private maxYPixels = 600;
  private maxXValue = 10;
  private maxYValue = 10;
  private minXPixels = 0;
  private minYPixels = 0;
  private minXValue = 50;
  private minYValue = 50;
  private zoomDebug = [];
  private maxXYHistory: number[][] = [];
  private xCoeff = 1;
  private yCoeff = 1;
  private mouseTrackX = 0;
  private mouseTrackY = 0;
  private clickX: number = null;
  private clickY: number = null;
  private settingZoom = false;
  private figureLineList: FigureArrayLine[] = [];
  private figureVerticalLineList: FigureVerticalLine[] = [];
  private figureTextList: FigureText[] = [];
  private modes = {
    zoom: 0,
    drag: 1,
    drawMarkers: 2,
    removeMarkers: 3,
  }
  private mode = this.modes.zoom;
  // private markers: number[] = [];
  private markers: Marker[] = [];
  private lastLineId = 0;

  constructor() {
    this.iniCanvast();
  }

  private iniCanvast(): void {
    this.canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");

    this.createUserEvents();
    this.x();

    //this.redraw();
  }

  private createUserEvents() {
    let canvas = this.canvas;

    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mousedown", this.pressEventHandler);
    canvas.addEventListener("mouseup", this.releaseEventHandler);
    canvas.addEventListener("mouseout", this.cancelEventHandler);

    canvas.addEventListener("touchstart", this.pressEventHandler);
    canvas.addEventListener("touchmove", this.dragEventHandler);
    canvas.addEventListener("touchend", this.releaseEventHandler);
    canvas.addEventListener("touchcancel", this.cancelEventHandler);
  }

  setZoom(x1, y1, x2, y2): void {
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;

    if (x1 < x2) {
      minX = x1;
      maxX = x2;
    } else {
      minX = x2;
      maxX = x1;
    }

    if (y1 < y2) {
      minY = y1;
      maxY = y2;
    } else {
      minY = y2;
      maxY = y1;
    }

    console.log(`minX ${minX} minY ${minY} maxX ${maxX} maxY ${maxY}`);

    this.setMinAxisValues(minX, minY);
    this.setMaxAxisValues(maxX, maxY);
    this.x();
    this.drawFigures();
  }

  setNewCoordsAfterDragging(x1, y1, x2, y2): void {
    let deltaX = x1 - x2;
    let deltaY = y1 - y2;

    this.setMinAxisValues(this.minXValue + deltaX, this.minYValue + deltaY);
    this.setMaxAxisValues(this.maxXValue + deltaX, this.maxYValue + deltaY);
    this.x();
    this.drawFigures();
  }

  private releaseEventHandler = (e: MouseEvent | TouchEvent) => {
    const mouseX = this.getMouseCoords(e)[0];
    const mouseY = this.getMouseCoords(e)[1];

    const clickX = this.getXValueFromScreenPixels(mouseX);
    const clickY = this.getYValueFromScreenPixels(mouseY);
    console.log('Release at ' + clickX + ' ' + clickY);

    if (this.mode === this.modes.zoom) {
      this.setZoom(this.clickX, this.clickY, clickX, clickY);
    } else if (this.mode === this.modes.drag) {
      this.setNewCoordsAfterDragging(this.clickX, this.clickY, clickX, clickY);
    } else if (this.mode === this.modes.drawMarkers) {
      const nearestLeftLineX = this.getNearestLeftLineX(clickX, this.figureVerticalLineList);
      let includesNearestLeftLineX = false;
      this.markers.forEach(item => {
        if (item.x === nearestLeftLineX) {
          includesNearestLeftLineX = true;
        }
      })
      if (!includesNearestLeftLineX) {
        const lineId =
          this.plotVerticalLine(nearestLeftLineX + 1, '#23af00', 3);
        this.markers.push({x: nearestLeftLineX, lineId: lineId});
      }
    } else if (this.mode === this.modes.removeMarkers) {
      const nearestLeftMarker = this.getNearestLeftMarker(clickX, this.markers);
      if (nearestLeftMarker) {
        const markersTemp: Marker[] = [];
        this.markers.forEach(item => {
          if(item.lineId !== nearestLeftMarker.lineId) {
            markersTemp.push(item);
          }
        })
        this.markers = markersTemp;
        this.removeVerticalLine(nearestLeftMarker.lineId);
        this.reset();
        this.x();
        this.drawFigures();
      }
    }
  }

  getNearestLeftLineX(x: number, figureVerticalLineList: FigureVerticalLine[]): number {
    let maxX = 0;

    figureVerticalLineList.forEach(item => {
      if (item.x > maxX && item.x <= x) {
        maxX = item.x;
      }
    })

    return maxX;
  }


  getNearestLeftLine(x: number, figureVerticalLineList: FigureVerticalLine[]): FigureVerticalLine {
    let maxX = 0;
    let result: FigureVerticalLine;

    figureVerticalLineList.forEach(item => {
      if (item.x > maxX && item.x <= x) {
        maxX = item.x;
        result = item;
      }
    })

    return result;
  }

  getNearestLeftMarker(x: number, markerList: Marker[]): Marker {
    let maxX = 0;
    let result: Marker;

    markerList.forEach(item => {
      if (item.x > maxX && item.x <= x) {
        maxX = item.x;
        result = item;
      }
    })

    return result;
  }

  private cancelEventHandler = (e: MouseEvent | TouchEvent) => {
    console.log('cancelEventHandler');
  }

  private dragEventHandler = (e: MouseEvent | TouchEvent) => {
    console.log('dragEventHandler');
  }

  undoMaxXYChange(): void {
    this.reset();
    if (this.maxXYHistory.length > 1) {
      this.maxXYHistory.splice(-1);
    }
    this.minXValue = this.maxXYHistory[this.maxXYHistory.length - 1][0];
    this.minYValue = this.maxXYHistory[this.maxXYHistory.length - 1][1];
    this.maxXValue = this.maxXYHistory[this.maxXYHistory.length - 1][2];
    this.maxYValue = this.maxXYHistory[this.maxXYHistory.length - 1][3];
    this.x();
    this.drawFigures();
  }

  private getMouseCoords(e: MouseEvent | TouchEvent): number[] {
    let mouseX = (e as TouchEvent).changedTouches ?
      (e as TouchEvent).changedTouches[0].pageX :
      (e as MouseEvent).pageX;
    let mouseY = (e as TouchEvent).changedTouches ?
      (e as TouchEvent).changedTouches[0].pageY :
      (e as MouseEvent).pageY;
    mouseX -= this.canvas.offsetLeft;
    mouseY -= this.canvas.offsetTop;

    return [mouseX, mouseY];
  }

  private pressEventHandler = (e: MouseEvent | TouchEvent) => {
    const mouseX = this.getMouseCoords(e)[0];
    const mouseY = this.getMouseCoords(e)[1];

    this.clickX = this.getXValueFromScreenPixels(mouseX);
    this.clickY = this.getYValueFromScreenPixels(mouseY);

    console.log('Click at ' + this.clickX + ' ' + this.clickY);
  }

  getXTest(x) {
    const maxPix = this.maxXPixels;
    const minPix = this.minXPixels;
    const max = this.maxXValue;
    const min = this.minXValue;
    let result = (maxPix - minPix) * (x - min) / (max - min);
    return result;
  }

  getYTest(x) {
    const maxPix = this.maxYPixels;
    const minPix = this.minYPixels;
    const max = this.maxYValue;
    const min = this.minYValue;
    let result = (maxPix - minPix) * (x - min) / (max - min);
    return result;
  }

  getXValueFromScreenPixels(valPix) {
    const maxPix = this.maxXPixels;
    const minPix = this.minXPixels;
    const max = this.maxXValue;
    const min = this.minXValue;
    // let result = ((val - min) * (max - min) / (maxPix - minPix)) + min;
    // let result = ((valPix - min) * (max - min) / (maxPix - minPix)) - min;
    let result = (max - min) * (valPix - minPix) / (maxPix - minPix) + min;
    return result;
  }

  getYValueFromScreenPixels(valPix) {
    const maxPix = this.maxYPixels;
    const minPix = this.minYPixels;
    const max = this.maxYValue;
    const min = this.minYValue;
    // let result = max + min - (((val - min) * (max - min) / (maxPix - minPix)) + min);
    // let result = max - (((valPix - min) * (max - min) / (maxPix - minPix)));
    let result = max - (((valPix - minPix) * (max - min) / (maxPix - minPix)));
    return result;
  }

  private x(): void {
    this.setCoeff();
    this.drawAxis(this.context);

    this.context.beginPath();

    let realx = 25;
    let realy = 75;

    this.context.arc(this.getXTest(realx), this.getYTest(realy), 10, 0, 2 * Math.PI, false);

    this.context.fillStyle = 'green';
    this.context.fill();
  }

  reset(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setMinAxisValues(minXValue: number = 0, minYValue: number = 0): void {
    this.reset();
    this.minXValue = minXValue;
    this.minYValue = minYValue;
    // this.maxXYHistory.push([this.maxXValue, this.maxYValue]);
    this.x();
  }

  setMaxAxisValues(maxXValue: number = 100, maxYValue: number = 100): void {
    this.reset();
    this.maxXValue = maxXValue;
    this.maxYValue = maxYValue;
    this.maxXYHistory.push([this.minXValue, this.minYValue, this.maxXValue, this.maxYValue]);
    this.x();
  }

  private setCoeff(): void {
    this.xCoeff = this.maxXPixels / this.maxXValue;
    this.yCoeff = this.maxYPixels / this.maxYValue;
  }

  private drawAxis(context: CanvasRenderingContext2D): void {
    this.context.font = '12px Arial';

    const maxXValue = this.maxXValue;
    const maxYValue = this.maxYValue

    const minXValue = this.minXValue;
    const minYValue = this.minYValue

    let xStep = Math.round(maxXValue / 5 * 100) / 100;
    let yStep = Math.round(maxYValue / 6 * 100) / 100;

    xStep = xStep > 0 ? xStep : 1;
    yStep = yStep > 0 ? yStep : 1;

    this.context.fillStyle = '#000';

    for (let i = minXValue; i < maxXValue; i = i + xStep) {
      context.fillText(`${Math.round(i * 100) / 100}`, this.getXTest(i), this.maxYPixels);
    }

    for (let i = minYValue; i < maxYValue + minYValue; i = i + yStep) {
      context.fillText(`${Math.round(i * 100) / 100}`, 0, this.maxYPixels - this.getYTest(i));
    }
  }

  /**
   * Display all open figures.
   */
  show(): void {
    this.drawFigures();
  }

  /**
   * Plot 2D or 3D data.
   */
  plot(outPutChDataTemp: number[] | Float32Array, offsetX = 0, lineWidth = 1): void {
    const fig: FigureArrayLine = {
      dataArr: outPutChDataTemp,
      color: 'blue',
      offsetX: offsetX,
      lineWidth: lineWidth,
    };

    this.figureLineList.push(fig);
    this.plotFigureArrayLine(fig);
  }

  private plotFigureArrayLine(figure: FigureArrayLine): void {
    const context = this.context;
    context.beginPath();
    let dataArr = figure.dataArr;

    const offsetX = figure.offsetX ? figure.offsetX : 0;

    context.moveTo(this.getXTest(0 + offsetX), this.maxYPixels - this.getYTest(dataArr[0]));

    dataArr.forEach((item, i) => {
      context.lineTo(this.getXTest(i + offsetX), this.maxYPixels - this.getYTest(item));
    })
    context.strokeStyle = figure.color;
    context.lineWidth = figure.lineWidth ? figure.lineWidth : 1;
    context.stroke();
  }

  /**
   * Plot vertical line.
   */
  plotVerticalLine(x: number, color = 'green', lineWidth = 1): number {
    const fig = {
      id: this.lastLineId,
      x: x,
      color: color,
      lineWidth: lineWidth,
    };
    this.lastLineId++;
    this.figureVerticalLineList.push(fig);
    this.plotVerticalLineLocal(fig);
    return fig.id;
  }

  /**
   * Remove vertical line.
   */
  removeVerticalLine(id: number): void {
    const figureVerticalLineListTemp: FigureVerticalLine[] = [];
    this.figureVerticalLineList.forEach(item => {
      if (item.id !== id) {
        figureVerticalLineListTemp.push(item);
      }
    });
    this.figureVerticalLineList = figureVerticalLineListTemp;
  }

  /**
   * Plot vertical line.
   */
  private plotVerticalLineLocal(figure: FigureVerticalLine): void {
    const context = this.context;
    context.beginPath();
    context.moveTo(this.getXTest(figure.x), 0);

    context.lineTo(this.getXTest(figure.x), this.maxYPixels);
    context.strokeStyle = figure.color;
    context.lineWidth = figure.lineWidth ? figure.lineWidth : 1;
    context.stroke();
  }

  /**
   * Plot text.
   */
  plotText(text: string, x: number, y: number, color = 'green', background = 'green'): void {
    const fig: FigureText = {
      text: text,
      x: x,
      y: y,
      color: color,
      backgroundColor: background,
    };
    this.figureTextList.push(fig);

    this.plotTextLocal(fig);
  }

  /**
   * Plot text.
   */
  private plotTextLocal(figure: FigureText): void {
    const context = this.context;
    context.beginPath();
    context.moveTo(this.getXTest(figure.x), 0);

    const xTemp = this.getXTest(figure.x);
    const yTemp = this.maxYPixels - this.getYTest(figure.y);
    context.fillStyle = figure.backgroundColor;
    context.fillRect(xTemp - 10, yTemp - 10, 100, 20);
    context.fillStyle = figure.color;
    context.fillText(figure.text, xTemp, yTemp);
    context.stroke();
  }

  getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  handleMouseMove = (event) => {
    let eventDoc, doc, body;

    event = event || window.event; // IE-ism

    // If pageX/Y aren't available and clientX/Y are,
    // calculate pageX/Y - logic taken from jQuery.
    // (This is to support old IE)
    if (event.pageX == null && event.clientX != null) {
      eventDoc = (event.target && event.target.ownerDocument) || document;
      doc = eventDoc.documentElement;
      body = eventDoc.body;

      event.pageX = event.clientX +
        (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
        (doc && doc.clientLeft || body && body.clientLeft || 0);
      event.pageY = event.clientY +
        (doc && doc.scrollTop || body && body.scrollTop || 0) -
        (doc && doc.clientTop || body && body.clientTop || 0);
    }

    let rect = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / rect.width;    // relationship bitmap vs. element for x
    let scaleY = this.canvas.height / rect.height;  // relationship bitmap vs. element for y

    const mouseX = this.getMouseCoords(event)[0];
    const mouseY = this.getMouseCoords(event)[1];

    this.mouseTrackX = Math.round((this.getXValueFromScreenPixels(mouseX)) * 100) / 100;
    this.mouseTrackY = Math.round((this.getYValueFromScreenPixels(mouseY)) * 100) / 100;

    this.context.font = '12px';


    const xTemp = (this.maxXValue * this.xCoeff);
    const yTemp = (this.maxYPixels + 50);

    const delta = 100;

    this.context.fillStyle = '#fff';
    this.context.fillRect(xTemp - delta - 10, yTemp - 10, 100 + delta, 20);
    this.context.stroke();
    this.context.fillStyle = '#000';
    this.context.fillText(`${this.mouseTrackX}`, xTemp - delta, yTemp);
    this.context.fillText(`${this.mouseTrackY}`, xTemp, yTemp);
    this.context.stroke();
  }

  private drawFigures(): void {
    this.figureLineList.forEach(item => {
      this.plotFigureArrayLine(item);
    })
    this.figureVerticalLineList.forEach(item => {
      this.plotVerticalLineLocal(item);
    })
    this.figureTextList.forEach(item => {
      this.plotTextLocal(item);
    })
  }

  setZoomMode(): void {
    this.mode = this.modes.zoom;
  }

  zoomOut(): void {
    const xDiff = (this.maxXValue - this.minXValue) / 4;
    const yDiff = (this.maxYValue - this.minYValue) / 4;

    this.setZoom(
      this.minXValue - xDiff,
      this.minYValue - yDiff,
      this.maxXValue + xDiff,
      this.maxYValue + yDiff
    );
  }

  zoomIn(): void {
    const xDiff = (this.maxXValue - this.minXValue) / 4;
    const yDiff = (this.maxYValue - this.minYValue) / 4;

    this.setZoom(
      this.minXValue + xDiff,
      this.minYValue + yDiff,
      this.maxXValue - xDiff,
      this.maxYValue - yDiff
    );
  }

  moveLeft(): void {
    const xDiff = - (this.maxXValue - this.minXValue) * 0.75;

    this.setZoom(
      this.minXValue + xDiff,
      this.minYValue,
      this.maxXValue + xDiff,
      this.maxYValue
    );
  }


  moveRight(): void {
    const xDiff = (this.maxXValue - this.minXValue) * 0.75;

    this.setZoom(
      this.minXValue + xDiff,
      this.minYValue,
      this.maxXValue + xDiff,
      this.maxYValue
    );
  }

  setDragMode(): void {
    this.mode = this.modes.drag;
  }

  setDrawMarkersMode(): void {
    this.mode = this.modes.drawMarkers;
  }

  setRemoveMarkersMode(): void {
    this.mode = this.modes.removeMarkers;
  }

  saveMarkers(fileName: string): void {
    const markersSortedTemp: { x: number; lineId: number; }[] = this.markers.sort((a, b) => {
      return a.x - b.x
    });
    const markersSortedArray: number[] = [];
    markersSortedTemp.forEach(item => {
      markersSortedArray.push(item.x);
    })
    const jsonData = JSON.stringify(markersSortedArray);
    const blob = new Blob([jsonData], {type: 'text/plain'});
    this.openSaveAsDialog(blob, `${fileName} ${getDateString(new Date())}.json`);
  }

  openSaveAsDialog(blob: Blob, fileName: string): void {
    openSaveAsDialog(blob, fileName);
  }
}
