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

    this.setMinAxisValues(minX, minY);
    this.setMaxAxisValues(maxX, maxY);
    this.x();
    this.drawFigures();
  }

  private releaseEventHandler = (e: MouseEvent | TouchEvent) => {
    const mouseX = this.getMouseCoords(e)[0];
    const mouseY = this.getMouseCoords(e)[1];

    const clickX = this.getXValueFromScreenPixels(mouseX);
    const clickY = this.getYValueFromScreenPixels(mouseY);
    console.log('Release at ' + clickX + ' ' + clickY);

    if (this.settingZoom) {
      this.settingZoom = false;
      this.setZoom(this.clickX, this.clickY, clickX, clickY);
    }
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
    this.settingZoom = true;

    console.log('Click at ' + this.clickX + ' ' + this.clickY);
  }

  private redraw() {
    // let clickX = this.clickX;
    // let context = this.context;
    // let clickDrag = this.clickDrag;
    // let clickY = this.clickY;
    // for (let i = 0; i < clickX.length; ++i) {
    //   context.beginPath();
    //   if (clickDrag[i] && i) {
    //     context.moveTo(clickX[i - 1], clickY[i - 1]);
    //   } else {
    //     context.moveTo(clickX[i] - 1, clickY[i]);
    //   }
    //
    //   context.lineTo(clickX[i], clickY[i]);
    //   context.stroke();
    // }
    // context.closePath();
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

  getXValueFromScreenPixels(val) {
    const maxPix = this.maxXPixels;
    const minPix = this.minXPixels;
    const max = this.maxXValue;
    const min = this.minXValue;
    let result = ((val - min) * (max - min) / (maxPix - minPix)) + min;
    return result;
  }

  getYValueFromScreenPixels(val) {
    const maxPix = this.maxYPixels;
    const minPix = this.minYPixels;
    const max = this.maxYValue;
    const min = this.minYValue;
    // let result = max + min - (((val - min) * (max - min) / (maxPix - minPix)) + min);
    let result = max - (((val - min) * (max - min) / (maxPix - minPix)));
    return result;
  }

  private x(): void {
    this.setCoeff();
    this.drawAxis(this.context);

    this.context.beginPath();

    let realx = 25;
    let realy = 75;

    this.context.arc(this.getXTest(realx),this.getYTest(realy), 10, 0, 2 * Math.PI, false);

    this.context.fillStyle = 'green';
    this.context.fill();
  }

  reset(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setMinAxisValues(minXValue: number = 20, minYValue: number = 20): void {
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

    for (let i = minXValue; i < maxXValue; i = i + xStep) {
      context.fillText(`${Math.round(i * 100) / 100}`, this.getXTest(i), this.maxYPixels);
    }

    for (let i = minYValue; i < maxYValue + minYValue; i = i + yStep) {
      context.fillText(`${Math.round(i * 100) / 100}`, 0, this.maxYPixels - this.getYTest(i));
    }
  }

  private canvasDraw(context: CanvasRenderingContext2D): void {
  }

  /**
   * Display all open figures.
   */
  show(): void {
    this.canvasDraw(this.context);
  }

  /**
   * Plot 2D or 3D data.
   */
  plot(outPutChDataTemp: number[] | Float32Array): void {
    const fig: FigureArrayLine = {
      dataArr: outPutChDataTemp,
      color: 'blue',
    };

    this.figureLineList.push(fig);
    this.plotFigureArrayLine(fig);
  }

  private plotFigureArrayLine(figure: FigureArrayLine): void {
    const context = this.context;
    context.beginPath();
    let dataArr = figure.dataArr;

    context.moveTo(0, this.maxYPixels - this.getYTest(dataArr[0]));

    dataArr.forEach((item, i) => {
      context.lineTo(this.getXTest(i), this.maxYPixels - this.getYTest(item));
    })
    context.strokeStyle = figure.color;
    context.stroke();
  }

  /**
   * Plot vertical line.
   */
  plotVerticalLine(x: number, color = 'green'): void {
    const fig = {
      x: x,
      color: color,
    };
    this.figureVerticalLineList.push(fig);
    this.plotVerticalLineLocal(fig);
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
    context.stroke();
  }

  /**
   * Plot text.
   */
  plotText(text: string, x: number, y: number, color = 'green'): void {
    const fig: FigureText = {
      text: text,
      x: x,
      y: y,
      color: 'blue',
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
    const yTemp = this.getYTest(figure.y);
    context.fillStyle = 'green';
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

    let xRelatedToCanvas = (event.pageX - rect.left) * scaleX;
    let yRelatedToCanvas = (event.pageY - rect.top) * scaleY;


    const mouseX = this.getMouseCoords(event)[0];
    const mouseY = this.getMouseCoords(event)[1];

    this.mouseTrackX = Math.round((this.getXValueFromScreenPixels(mouseX)) * 100) / 100;
    this.mouseTrackY = Math.round((this.getYValueFromScreenPixels(mouseY)) * 100) / 100;

    this.context.font = '12px';


    const xTemp = (this.maxXValue * this.xCoeff);
    const yTemp = (this.maxYPixels + 50);

    this.context.fillStyle = '#fff';
    this.context.fillRect(xTemp - 10, yTemp - 10, 100, 20);
    this.context.stroke();
    this.context.fillStyle = '#000';
    this.context.fillText(`${this.mouseTrackX}`, xTemp - 150, yTemp);
    this.context.fillText(`${this.mouseTrackY}`, xTemp, yTemp);
    this.context.stroke();
  }

  drawFigures(): void {
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
}

export class FigureArrayLine {
  dataArr: number[] | Float32Array;
  color: string;
}

export class FigureVerticalLine {
  x: number;
  color: string;
}

export class FigureText {
  text: string;
  x: number;
  y: number;
  color: string;
}
