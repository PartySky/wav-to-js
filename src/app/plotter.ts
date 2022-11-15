export class Plotter {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private maxX = 1300;
  private maxY = 600;
  private maxXValue = 10;
  private maxYValue = 10;
  private maxXYHistory: number[][] = [];
  private xCoeff = 1;
  private yCoeff = 1;
  private mouseTrackX = 0;
  private mouseTrackY = 0;

  private paint: boolean;

  private clickX: number = null;
  private clickY: number = null;
  private clickDrag: boolean[] = [];
  private settingZoom = false;

  constructor() {
    this.iniCanvast();
  }

  private iniCanvast(): void {
    this.canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");
    this.x();

    //this.redraw();
    this.createUserEvents();
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
    this.setMaxAxisValues(x2, y2);
    this.x();
  }

  private releaseEventHandler = (e: MouseEvent | TouchEvent) => {
    if (this.settingZoom) {
      this.settingZoom = false;
      this.setZoom(this.clickX, this.clickY, this.mouseTrackX, this.mouseTrackY);
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
    this.maxXValue = this.maxXYHistory[this.maxXYHistory.length - 1][0];
    this.maxYValue = this.maxXYHistory[this.maxXYHistory.length - 1][1];
    this.x();
  }

  private pressEventHandler = (e: MouseEvent | TouchEvent) => {
    let mouseX = (e as TouchEvent).changedTouches ?
      (e as TouchEvent).changedTouches[0].pageX :
      (e as MouseEvent).pageX;
    let mouseY = (e as TouchEvent).changedTouches ?
      (e as TouchEvent).changedTouches[0].pageY :
      (e as MouseEvent).pageY;
    mouseX -= this.canvas.offsetLeft;
    mouseY -= this.canvas.offsetTop;

    this.clickX = this.mouseTrackX;
    this.clickY = this.mouseTrackY;
    this.settingZoom = true;

    console.log('Click at ' + this.mouseTrackX + ' ' + this.mouseTrackY);
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

  private x(): void {
    this.setCoeff();
    this.drawAxis(this.context);
  }

  reset(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setMaxAxisValues(maxXValue: number = 20, maxYValue: number = 20): void {
    this.reset();
    this.maxXValue = maxXValue;
    this.maxYValue = maxYValue;
    this.maxXYHistory.push([this.maxXValue, this.maxYValue]);
    this.x();
  }

  private setCoeff(): void {
    this.xCoeff = this.maxX / this.maxXValue;
    this.yCoeff = this.maxY / this.maxYValue;
  }

  private drawAxis(context: CanvasRenderingContext2D): void {
    this.context.font = '12px Arial';

    const maxXValue = this.maxXValue;
    const maxYValue = this.maxYValue


    let xStep = Math.round(maxXValue / 5 * 100) / 100;
    let yStep = Math.round(maxYValue / 6 * 100) / 100;

    xStep = xStep > 0 ? xStep : 1;
    yStep = yStep > 0 ? yStep : 1;

    for (let i = 0; i < maxXValue; i = i + xStep) {
      context.fillText(`${Math.round(i * 100) / 100}`, i * this.xCoeff, (this.maxYValue * this.yCoeff));
    }

    for (let i = 0; i < maxYValue; i = i + yStep) {
      context.fillText(`${Math.round(i * 100) / 100}`, 0, (this.maxYValue * this.yCoeff) - (i * this.yCoeff));
    }
  }

  private canvasDrow(context: CanvasRenderingContext2D): void {
  }

  /**
   * Display all open figures.
   */
  show(): void {
    this.canvasDrow(this.context);
  }

  /**
   * Plot 2D or 3D data.
   */
  plot(outPutChDataTemp: number[] | Float32Array): void {
    const context = this.context;
    context.beginPath();
    //let dataArr = [0, 12, 10, 12, 11, 7, 5, 20];
    let dataArr = outPutChDataTemp;

    context.moveTo(0, (this.maxYValue * this.yCoeff) - (dataArr[0] * this.yCoeff));

    dataArr.forEach((item, i) => {
      context.lineTo(i * this.xCoeff, (this.maxYValue * this.yCoeff) - (item * this.yCoeff));
    })
    context.strokeStyle = 'blue';
    context.stroke();
  }

  /**
   * Plot vertical line.
   */
  plotVerticalLine(x: number, color = 'green'): void {
    const context = this.context;
    context.beginPath();
    context.moveTo(x * this.xCoeff, 0);

    context.lineTo(x * this.xCoeff, (this.maxYValue * this.yCoeff));
    context.strokeStyle = color;
    context.stroke();
  }

  /**
   * Plot text.
   */
  plotText(text: string, x: number, y: number, color = 'green'): void {
    const context = this.context;
    context.beginPath();
    context.moveTo(x * this.xCoeff, 0);


    const xTemp = (x - 250) * this.xCoeff;
    const yTemp = (this.maxYValue - y) * this.yCoeff;

    context.fillStyle = 'green';
    context.fillRect(xTemp - 10, yTemp - 10, 100, 20);
    context.fillStyle = color;
    context.fillText(text, xTemp, yTemp);
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

    this.mouseTrackX = Math.round(xRelatedToCanvas / this.xCoeff * 100) / 100;
    this.mouseTrackY = Math.round((this.maxYValue - (yRelatedToCanvas / this.yCoeff)) * 100) / 100;

    this.context.font = '12px';

    const xTemp = (this.maxXValue * this.xCoeff);
    const yTemp = (this.maxYValue * this.yCoeff + 50);

    this.context.fillStyle = '#fff';
    this.context.fillRect(xTemp - 10, yTemp - 10, 100, 20);
    this.context.stroke();
    this.context.fillStyle = '#000';
    this.context.fillText(`${this.mouseTrackX}`, xTemp, yTemp);
    this.context.fillText(`${this.mouseTrackY}`, xTemp + 50, yTemp);
    this.context.stroke();
  }
}
