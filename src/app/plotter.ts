export class Plotter {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private maxX = 1300;
  private maxY = 600;
  private maxXValue = 10;
  private maxYValue = 10;
  private xCoeff = 1;
  private yCoeff = 1;
  private mouseTrackX = 0;
  private mouseTrackY = 0;

  constructor() {
    this.iniCanvast();
  }

  private iniCanvast(): void {
    this.canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
    this.context = this.canvas.getContext("2d");
    this.setMaxAxisValues(20, 20)
    this.setCoeff();
    this.drawAxis(this.context);
  }

  setMaxAxisValues(maxXValue: number = 20, maxYValue: number = 20): void {
    this.maxXValue = maxXValue;
    this.maxYValue = maxYValue;
  }

  setCoeff(): void {
    this.xCoeff = this.maxX / this.maxXValue;
    this.yCoeff = this.maxY / this.maxYValue;
  }

  private drawAxis(context: CanvasRenderingContext2D): void {
    this.context.font = '12px Arial';

    const maxXValue = this.maxXValue;
    const maxYValue = this.maxYValue

    for (let i = 0; i < maxXValue; i++) {
      context.fillText(`${i}`, i * this.xCoeff, (this.maxYValue * this.yCoeff));
    }

    for (let i = 0; i < maxYValue; i++) {
      context.fillText(`${i}`, 0, (this.maxYValue * this.yCoeff) - (i * this.yCoeff));
    }
  }

  private canvasDrow(context: CanvasRenderingContext2D): void {
    context.moveTo(0, 20);
    context.lineTo(20, 80);
    context.lineTo(70, 100);

    context.font = '12px';

    context.fillText('Hello World!', 20 * this.xCoeff, 50 * this.yCoeff);

    context.strokeStyle = 'blue';
    context.stroke();
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
  plot(outPutChDataTemp: Float32Array): void {
    const context = this.context;
    let dataArr = [0, 12, 10, 12, 11, 7, 5, 20];

    dataArr.forEach((item, i) => {
      context.lineTo(i * this.xCoeff, (this.maxYValue * this.yCoeff) - (item * this.yCoeff));
    })
    context.strokeStyle = 'blue';
    context.stroke();
  }

  getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  handleMouseMove(event): void {
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
        (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
        (doc && doc.clientTop  || body && body.clientTop  || 0 );
    }

    let rect = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / rect.width;    // relationship bitmap vs. element for x
    let scaleY = this.canvas.height / rect.height;  // relationship bitmap vs. element for y

    let xRelatedToCanvas = (event.pageX - rect.left) * scaleX;
    let yRelatedToCanvas = (event.pageY - rect.top) * scaleY;

    this.mouseTrackX = Math.round(xRelatedToCanvas / this.xCoeff * 100) / 100;
    this.mouseTrackY = Math.round(yRelatedToCanvas / this.yCoeff * 100) / 100;

    this.context.moveTo(0, 20);
    this.context.lineTo(20, 80);
    this.context.lineTo(70, 100);

    this.context.font = '12px';

    const xTemp = 10 * this.xCoeff;
    const yTemp = 10 * this.yCoeff;

    this.context.fillStyle = '#fff';
    this.context.fillRect(xTemp - 10, yTemp - 10, 100, 20);
    this.context.stroke();
    this.context.fillStyle = '#000';
    this.context.fillText(`${this.mouseTrackX} ${this.mouseTrackY}`, xTemp, yTemp);
    this.context.stroke();

    console.log((event.pageX - rect.left) * scaleX + ' ' + (event.pageY - rect.top) * scaleY);
    console.log(this.mouseTrackX + ' ' + this.mouseTrackY);
  }
}
