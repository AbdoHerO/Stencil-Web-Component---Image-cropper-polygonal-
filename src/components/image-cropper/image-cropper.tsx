import { Component, Event, EventEmitter, Fragment, Host, Method, Prop, State, Watch, h } from '@stencil/core';

export interface DetectedQuadResult{
  location: Quad;
  confidenceAsDocumentBoundary: number;
}

export interface Quad{
  points:[Point,Point,Point,Point];
}

export interface Point{
  x:number;
  y:number;
}

export interface Rect{
  x:number;
  y:number;
  width:number;
  height:number;
}

export interface CropOptions {
  perspectiveTransform?:boolean;
  colorMode?:"binary"|"gray"|"color";
  selection?:Quad|Rect;
  source?:Blob|string|HTMLImageElement|HTMLCanvasElement;
}

@Component({
  tag: 'image-cropper',
  styleUrl: 'image-cropper.css',
  shadow: true,
})
export class ImageCropper {
  handlers:number[] = [0,1,2,3,4,5,6,7];
  polygonMouseDown:boolean = false;
  polygonMouseDownPoint:Point = {x:0,y:0};
  previousDistance:number|undefined = undefined;
  svgMouseDownPoint:Point|undefined = undefined;
  handlerMouseDownPoint:Point = {x:0,y:0};
  root:HTMLElement;
  containerElement:HTMLElement;
  svgElement:SVGElement;
  canvasElement:HTMLCanvasElement;
  originalPoints:[Point,Point,Point,Point] = undefined;
   usingTouchEvent:boolean = false;
  usingQuad = false;
  magnifierElement: HTMLElement; // Add this line

  @Prop() img?: HTMLImageElement;
  @Prop() rect?: Rect;
  @Prop() quad?: Quad;
  @Prop() license?: string;
  @Prop() hidefooter?: string;
  @Prop() handlersize?: string;
  @Prop() inactiveSelections?: (Quad|Rect)[];
  @State() viewBox:string = "0 0 1280 720";
  @State() activeStroke:number = 2;
  @Prop() rotation:number = 0;
  @State() inActiveStroke:number = 4;
  @State() selectedHandlerIndex:number = -1;
  @State() points:[Point,Point,Point,Point] = undefined;
  @State() offsetX = 0;
  @State() offsetY = 0;
  @State() scale = 1.0;
  @Event() confirmed?: EventEmitter<void>;
  @Event() canceled?: EventEmitter<void>;
  @Event() selectionClicked?: EventEmitter<number>;

  // componentDidLoad(){
  //   this.containerElement.addEventListener("touchmove", (e:TouchEvent) => {
  //     this.onContainerTouchMove(e);
  //   })
  //   this.containerElement.addEventListener("touchend", () => {
  //     this.previousDistance = undefined;
  //     this.hideMagnifier(); // Hide magnifier on touch end
  //   })
  // }

  componentDidLoad() {
    // If user moves their finger on the container
    this.containerElement.addEventListener('touchmove', (e: TouchEvent) => {
      this.onContainerTouchMove(e);
    });
  
    // When user lifts their finger anywhere in container:
    this.containerElement.addEventListener('touchend', () => {
      this.previousDistance = undefined;
      this.hideMagnifier(); 
      // === End any drag that was in progress ===
      this.selectedHandlerIndex = -1;
      this.polygonMouseDown = false;
    });
  }

  @Watch('img')
  watchImgPropHandler(newValue: HTMLImageElement) {
    if (newValue) {
      console.log('watchImgPropHandler triggered with newValue:', newValue);
      this.resetStates();
      this.viewBox = `0 0 ${newValue.naturalWidth} ${newValue.naturalHeight}`;
      console.log('viewBox set to:', this.viewBox);
      if (this.root) {
        const inActiveStroke = parseInt(this.root.style.getPropertyValue("--inactive-stroke"));
        const activeStroke = parseInt(this.root.style.getPropertyValue("--active-stroke"));
        console.log('inActiveStroke:', inActiveStroke, 'activeStroke:', activeStroke);
        if (inActiveStroke) {
          this.inActiveStroke = inActiveStroke;
        }
        if (activeStroke) {
          this.activeStroke = activeStroke;
        }
      }
    }
  }


  @Watch('rect')
  watchRectPropHandler(newValue: Rect) {
    if (newValue) {
      this.usingQuad = false;
      let points = this.getPointsFromRect(newValue);
      if (this.img) {
        this.restrainPointsInBounds(points,this.img.naturalWidth,this.img.naturalHeight);
      }
      this.points = points;
    }
  }

  getPointsFromRect(rect:Rect):[Point,Point,Point,Point]{
    const point1:Point = {x:rect.x,y:rect.y};
    const point2:Point = {x:rect.x+rect.width,y:rect.y};
    const point3:Point = {x:rect.x+rect.width,y:rect.y+rect.height};
    const point4:Point = {x:rect.x,y:rect.y+rect.height};
    return [point1,point2,point3,point4];
  }

  @Watch('quad')
  watchQuadPropHandler(newValue: Quad) {
    if (newValue) {
      this.usingQuad = true;
      let points = newValue.points;
      if (this.img) {
        this.restrainPointsInBounds(points,this.img.naturalWidth,this.img.naturalHeight);
      }
      this.points = newValue.points;
    }
  }

  onCanceled(){
    if (this.canceled){
      this.canceled.emit();
    }
  }

  onConfirmed(){
    if (this.confirmed){
      this.confirmed.emit();
    }
  }

  getPointsData(){
    if (this.points) {
      let pointsData = this.points[0].x + "," + this.points[0].y + " ";
      pointsData = pointsData + this.points[1].x + "," + this.points[1].y +" ";
      pointsData = pointsData + this.points[2].x + "," + this.points[2].y +" ";
      pointsData = pointsData + this.points[3].x + "," + this.points[3].y;
      return pointsData;
    }
    return "";
  }

  renderFooter(){
    if (this.hidefooter === "") {
      return "";
    }
    return (
      <div class="footer">
        <section class="items">
          <div class="item accept-cancel" onClick={() => this.onCanceled()}>
            <img src="data:image/svg+xml,%3Csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 512 512' enable-background='new 0 0 512 512' xml:space='preserve'%3E%3Ccircle fill='%23727A87' cx='256' cy='256' r='256'/%3E%3Cg id='Icon_5_'%3E%3Cg%3E%3Cpath fill='%23FFFFFF' d='M394.2,142L370,117.8c-1.6-1.6-4.1-1.6-5.7,0L258.8,223.4c-1.6,1.6-4.1,1.6-5.7,0L147.6,117.8 c-1.6-1.6-4.1-1.6-5.7,0L117.8,142c-1.6,1.6-1.6,4.1,0,5.7l105.5,105.5c1.6,1.6,1.6,4.1,0,5.7L117.8,364.4c-1.6,1.6-1.6,4.1,0,5.7 l24.1,24.1c1.6,1.6,4.1,1.6,5.7,0l105.5-105.5c1.6-1.6,4.1-1.6,5.7,0l105.5,105.5c1.6,1.6,4.1,1.6,5.7,0l24.1-24.1 c1.6-1.6,1.6-4.1,0-5.7L288.6,258.8c-1.6-1.6-1.6-4.1,0-5.7l105.5-105.5C395.7,146.1,395.7,143.5,394.2,142z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E" />
          </div>
          <div class="item accept-use" onClick={() => this.onConfirmed()}>
            <img src="data:image/svg+xml,%3Csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 512 512' enable-background='new 0 0 512 512' xml:space='preserve'%3E%3Ccircle fill='%232CD865' cx='256' cy='256' r='256'/%3E%3Cg id='Icon_1_'%3E%3Cg%3E%3Cg%3E%3Cpath fill='%23FFFFFF' d='M208,301.4l-55.4-55.5c-1.5-1.5-4-1.6-5.6-0.1l-23.4,22.3c-1.6,1.6-1.7,4.1-0.1,5.7l81.6,81.4 c3.1,3.1,8.2,3.1,11.3,0l171.8-171.7c1.6-1.6,1.6-4.2-0.1-5.7l-23.4-22.3c-1.6-1.5-4.1-1.5-5.6,0.1L213.7,301.4 C212.1,303,209.6,303,208,301.4z'/%3E%3C/g%3E%3C/g%3E%3C/g%3E%3C/svg%3E" />
          </div>
        </section>
      </div>
    )
  }

  rendenInactiveSelections(){
    if (!this.inactiveSelections) {
      return "";
    }
    return (
      <Fragment>
        {this.inactiveSelections.map((selection) => (
          <polygon
            points={this.getPointsDataFromSelection(selection)}
            class="inactive-selection dashed"
            style={{ pointerEvents: 'none' }}
            stroke-width={this.inActiveStroke * this.getRatio()}
            fill="transparent"
            // onMouseUp={()=>this.onSelectionClicked(index)}
            // onTouchStart={()=>this.onSelectionClicked(index)}
          >
         </polygon>
        ))}
      </Fragment>
    );
  }

  onSelectionClicked(index:number) {
    if (this.selectionClicked) {
      this.selectionClicked.emit(index);
    }
  }

  getPointsDataFromSelection(selection:Quad|Rect){
    let points:Point[] = [];
    if ("width" in selection) { //is Rect
      points = this.getPointsFromRect(selection);
    }else{
      points = selection.points;
    }
    let pointsData = points[0].x + "," + points[0].y + " ";
    pointsData = pointsData + points[1].x + "," + points[1].y +" ";
    pointsData = pointsData + points[2].x + "," + points[2].y +" ";
    pointsData = pointsData + points[3].x + "," + points[3].y;
    return pointsData;
  }

  renderHandlers(){
    if (!this.points) {
      return (<div></div>)
    }
    return (
      <Fragment>
        {this.handlers.map(index => (
          <rect
          x={this.getHandlerPos(index,"x")}
          y={this.getHandlerPos(index,"y")}
          width={this.getHandlerSize()}
          height={this.getHandlerSize()}
          class="cropper-controls"
          stroke-width={index === this.selectedHandlerIndex 
            ? this.activeStroke * 2 * this.getRatio() 
            : this.activeStroke * this.getRatio()}
          fill="none"
          pointer-events="visibleStroke"
          onMouseDown={(e:MouseEvent)=>this.onHandlerMouseDown(e,index)}
          onMouseUp={(e:MouseEvent)=>this.onHandlerMouseUp(e)}
          onTouchStart={(e:TouchEvent)=>this.onHandlerTouchStart(e,index)}
          onPointerDown={(e:PointerEvent)=>this.onHandlerPointerDown(e,index)}
          />
        ))}
      </Fragment>
    )
  }

  getHandlerPos(index:number,key:string) {
    let pos = 0;
    let size = this.getHandlerSize();
    if (index === 0){
      pos = this.points[0][key];
    }else if (index === 1) {
      pos = this.points[0][key] + (this.points[1][key] - this.points[0][key])/2;
    }else if (index === 2) {
      pos = this.points[1][key];
    }else if (index === 3) {
      pos = this.points[1][key] + (this.points[2][key] - this.points[1][key])/2;
    }else if (index === 4) {
      pos = this.points[2][key];
    }else if (index === 5) {
      pos = this.points[3][key] + (this.points[2][key] - this.points[3][key])/2;
    }else if (index === 6) {
      pos = this.points[3][key];
    }else if (index === 7) {
      pos = this.points[0][key] + (this.points[3][key] - this.points[0][key])/2;
    }
    pos = pos - size/2;
    return pos;
  }

  getHandlerSize() {
    let ratio = this.getRatio();
    let size:number = 20;
    if (this.handlersize) {
      try {
        size = parseInt(this.handlersize);
      } catch (error) {
        console.log(error);
      }
    }
    return Math.ceil(size*ratio);
  }

  onSVGTouchStart(e:TouchEvent) {
    this.usingTouchEvent = true;
    this.svgMouseDownPoint = undefined;
    this.previousDistance = undefined;
    let coord = this.getMousePosition(e,this.svgElement);
    if (e.touches.length > 1) {
      this.selectedHandlerIndex = -1;
    }else{
      if (this.selectedHandlerIndex != -1) {
        this.originalPoints = JSON.parse(JSON.stringify(this.points));  //We need this info so that whether we start dragging the rectangular in the center or in the corner will not affect the result.
        this.handlerMouseDownPoint.x = coord.x;
        this.handlerMouseDownPoint.y = coord.y;
      }else{
        this.svgMouseDownPoint = {x:coord.x,y:coord.y};
        this.polygonMouseDown = true; // Add this line to enable dragging immediately
        this.polygonMouseDownPoint = { x: coord.x, y: coord.y }; // Add this line to store the initial touch point
        this.originalPoints = JSON.parse(JSON.stringify(this.points)); // Add this line to store the original points
      }
    }
  }

  onSVGTouchEnd() {
    this.svgMouseDownPoint = undefined;
  }

  onSVGTouchMove(e:TouchEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (e.touches.length === 2) {
      this.pinchAndZoom(e);
    }else{
      if (this.svgMouseDownPoint) {
        this.panSVG(e);
      } else if (this.polygonMouseDown) { // Add this condition to handle dragging
        this.handleMoveEvent(e);
      }else{
        this.handleMoveEvent(e);
      }
    }
  }

  //handle pinch and zoom
  pinchAndZoom(e:TouchEvent){
    const distance = this.getDistanceBetweenTwoTouches(e.touches[0],e.touches[1]);
    if (this.previousDistance) {
      if ((distance - this.previousDistance)>0) { //zoom
        this.scale = Math.min(10, this.scale + 0.02);
      }else{
        this.scale = Math.max(0.1,this.scale - 0.02);
      }
      this.previousDistance = distance;
    }else{
      this.previousDistance = distance;
    }
  }

  getDistanceBetweenTwoTouches(touch1:Touch,touch2:Touch){
    const offsetX = touch1.clientX - touch2.clientX;
    const offsetY = touch1.clientY - touch2.clientY;
    const distance = offsetX * offsetX + offsetY + offsetY;
    return distance;
  }

  onContainerMouseUp(){
    this.svgMouseDownPoint = undefined;
    if (!this.usingTouchEvent) {
      this.selectedHandlerIndex = -1;
      this.polygonMouseDown = false;
      this.hideMagnifier(); // Hide the magnifier
    }
  }

  onSVGMouseDown(e:MouseEvent) {
    if (!this.usingTouchEvent) {
      let coord = this.getMousePosition(e,this.svgElement);
      this.svgMouseDownPoint = {x:coord.x,y:coord.y};
    }
  }

  onContainerWheel(e:WheelEvent) {
    if (e.deltaY<0) {
      this.scale = this.scale + 0.1;
    }else{
      this.scale = Math.max(0.1, this.scale - 0.1);
    }
    e.preventDefault();
  }

  onContainerTouchMove(e:TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 2) {
      this.pinchAndZoom(e);
    }
  }

  getPanAndZoomStyle(){
    if (this.img) {
      // const percentX = this.offsetX / this.img.naturalWidth * 100;
      // const percentY = this.offsetY / this.img.naturalHeight * 100;
      return `scale(1.0)  rotate(${this.rotation}deg)`;
      // return "scale("+this.scale+") translateX("+percentX+"%)translateY("+percentY+"%)";
    }else{
      return "scale(1.0)";
    }
  }

  onSVGMouseMove(e:MouseEvent){
    if (this.svgMouseDownPoint) {
      this.panSVG(e);
    }else{
      this.handleMoveEvent(e);
    }
  }

  panSVG(e:TouchEvent|MouseEvent){
    let coord = this.getMousePosition(e,this.svgElement);
    let offsetX = coord.x - this.svgMouseDownPoint.x;
    let offsetY = coord.y - this.svgMouseDownPoint.y;
    //console.log("coord");
    //console.log(coord);
    //console.log("svgMouseDownPoint");
    //console.log(this.svgMouseDownPoint);

    //console.log(offsetX)
    //console.log(offsetY)
    //e.g img width: 100, offsetX: -10, translateX: -10%
    this.offsetX = this.offsetX + offsetX;
    this.offsetY = this.offsetY + offsetY;
  }

  handleMoveEvent(e:MouseEvent|TouchEvent){
    if (this.polygonMouseDown) {
      let coord = this.getMousePosition(e,this.svgElement);
      let offsetX = coord.x - this.polygonMouseDownPoint.x;
      let offsetY = coord.y - this.polygonMouseDownPoint.y;
      let newPoints = JSON.parse(JSON.stringify(this.originalPoints));
      for (const point of newPoints) {
        point.x = point.x + offsetX;
        point.y = point.y + offsetY;
        if (point.x < 0 || point.y < 0 || point.x > this.img.naturalWidth || point.y > this.img.naturalHeight){
          console.log("reach bounds");
          return;
        }
      }
      this.points = newPoints;
      this.showMagnifier(); // Show the magnifier when the rect is moved
      this.updateMagnifier(coord); // Update the magnifier position and content
    }
    if (this.selectedHandlerIndex >= 0) {
      let pointIndex = this.getPointIndexFromHandlerIndex(this.selectedHandlerIndex);
      let coord = this.getMousePosition(e,this.svgElement);
      let offsetX = coord.x - this.handlerMouseDownPoint.x;
      let offsetY = coord.y - this.handlerMouseDownPoint.y;
      let newPoints = JSON.parse(JSON.stringify(this.originalPoints));
      if (pointIndex != -1) {
        let selectedPoint = newPoints[pointIndex];
        selectedPoint.x = this.originalPoints[pointIndex].x + offsetX;
        selectedPoint.y = this.originalPoints[pointIndex].y + offsetY;
        if (this.usingQuad === false) { //rect mode
          if (pointIndex === 0) {
            newPoints[1].y = selectedPoint.y;
            newPoints[3].x = selectedPoint.x;
          }else if (pointIndex === 1) {
            newPoints[0].y = selectedPoint.y;
            newPoints[2].x = selectedPoint.x;
          }else if (pointIndex === 2) {
            newPoints[1].x = selectedPoint.x;
            newPoints[3].y = selectedPoint.y;
          }else if (pointIndex === 3) {
            newPoints[0].x = selectedPoint.x;
            newPoints[2].y = selectedPoint.y;
          }
        }
      }else{ //mid-point handlers
        if (this.selectedHandlerIndex === 1) {
          newPoints[0].y = this.originalPoints[0].y + offsetY;
          newPoints[1].y = this.originalPoints[1].y + offsetY;
        }else if (this.selectedHandlerIndex === 3) {
          newPoints[1].x = this.originalPoints[1].x + offsetX;
          newPoints[2].x = this.originalPoints[2].x + offsetX;
        }else if (this.selectedHandlerIndex === 5) {
          newPoints[2].y = this.originalPoints[2].y + offsetY;
          newPoints[3].y = this.originalPoints[3].y + offsetY;
        }else if (this.selectedHandlerIndex === 7) {
          newPoints[0].x = this.originalPoints[0].x + offsetX;
          newPoints[3].x = this.originalPoints[3].x + offsetX;
        }
      }
      if (this.img) {
        this.restrainPointsInBounds(newPoints,this.img.naturalWidth,this.img.naturalHeight);
      }
      this.points = newPoints;
      this.showMagnifier(); // Show the magnifier when the rect is moved
      this.updateMagnifier(coord); // Update the magnifier position and content
    }
  }

  restrainPointsInBounds(points: [Point, Point, Point, Point], imgWidth: number, imgHeight: number){
    // Define the margin/padding you want:
    const margin = 20; // or 10, 20, etc. – whichever "inset" you prefer
    for (let index = 0; index < points.length; index++) {
      const point = points[index];
      point.x = Math.max(margin, point.x);
      point.x = Math.min(point.x, imgWidth - margin);
      point.y = Math.max(margin, point.y);
      point.y = Math.min(point.y, imgHeight - margin);
    }
  }

  onPolygonMouseDown(e:MouseEvent){
    e.stopPropagation();
    this.originalPoints = JSON.parse(JSON.stringify(this.points));
    this.polygonMouseDown = true;
    let coord = this.getMousePosition(e,this.svgElement);
    this.polygonMouseDownPoint.x = coord.x;
    this.polygonMouseDownPoint.y = coord.y;
    this.showMagnifier(); // Show the magnifier when the rect starts being moved
  }

  onPolygonMouseUp(e:MouseEvent){
    e.stopPropagation();
    if (!this.usingTouchEvent) {
      this.selectedHandlerIndex = -1;
      this.polygonMouseDown = false;
      this.hideMagnifier(); // Hide the magnifier when the rect stops being moved
    }
  }

  onPolygonTouchStart(e:TouchEvent) {
    this.usingTouchEvent = true;
    e.stopPropagation();
    this.selectedHandlerIndex = -1;
    // this.polygonMouseDown = false;
    this.polygonMouseDown = true;
    this.originalPoints = JSON.parse(JSON.stringify(this.points));
    // this.polygonMouseDown = true;
    let coord = this.getMousePosition(e,this.svgElement);
    // this.polygonMouseDownPoint.x = coord.x;
    // this.polygonMouseDownPoint.y = coord.y;
    this.polygonMouseDownPoint = { x: coord.x, y: coord.y }; // Store the initial touch point
    this.showMagnifier(); // Show the magnifier when the rect starts being moved

  }

  onPolygonTouchEnd(e:TouchEvent) {
    e.stopPropagation();
    this.selectedHandlerIndex = -1;
    this.polygonMouseDown = false;
    this.hideMagnifier(); // Hide the magnifier when the rect stops being moved
  }

  // onHandlerMouseDown(e:MouseEvent,index:number){
  //   e.stopPropagation();
  //   let coord = this.getMousePosition(e,this.svgElement);
  //   this.originalPoints = JSON.parse(JSON.stringify(this.points));
  //   this.handlerMouseDownPoint.x = coord.x;
  //   this.handlerMouseDownPoint.y = coord.y;
  //   this.selectedHandlerIndex = index;
  // }

  onHandlerMouseDown(e: MouseEvent, index: number) {
    e.stopPropagation();
  
    // If we’re already dragging a different handle, end that drag first:
    if (this.selectedHandlerIndex !== -1 && this.selectedHandlerIndex !== index) {
      // Manually call mouse-up logic to finalize the old handle drag
      this.onHandlerMouseUp(e);
    }
  
    let coord = this.getMousePosition(e, this.svgElement);
    this.originalPoints = JSON.parse(JSON.stringify(this.points));
    this.handlerMouseDownPoint.x = coord.x;
    this.handlerMouseDownPoint.y = coord.y;
  
    // Now select the new handle
    this.selectedHandlerIndex = index;
  }

  onHandlerMouseUp(e:MouseEvent){
    e.stopPropagation();
    if (!this.usingTouchEvent) {
      this.selectedHandlerIndex = -1;
      this.hideMagnifier(); // Hide the magnifier
    }
  }

  onHandlerTouchStart(e:TouchEvent,index:number) {
    this.usingTouchEvent = true; //Touch events are triggered before mouse events. We can use this to prevent executing mouse events.
    e.stopPropagation();
    this.polygonMouseDown = false;
    let coord = this.getMousePosition(e,this.svgElement);
    this.originalPoints = JSON.parse(JSON.stringify(this.points));
    this.handlerMouseDownPoint.x = coord.x;
    this.handlerMouseDownPoint.y = coord.y;
    this.selectedHandlerIndex = index;
  }

  onHandlerPointerDown(e:PointerEvent,index:number) {
    if (e.pointerType != "mouse" && !this.usingTouchEvent) {
      this.onHandlerMouseDown(e,index);
      e.preventDefault();
    }
  }

  getPointIndexFromHandlerIndex(index:number){
    if (index === 0) {
      return 0;
    }else if (index === 2) {
      return 1;
    }else if (index === 4) {
      return 2;
    }else if (index === 6) {
      return 3;
    }
    return -1;
  }

  //Convert the screen coordinates to the SVG's coordinates from https://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/
  getMousePosition(event: any, svg: any) {
    let CTM = svg.getScreenCTM();
    if (!CTM) {
      return { x: 0, y: 0 };
    }

    let x, y;
    if (event.targetTouches) { // if it is a touch event
      x = event.targetTouches[0].clientX;
      y = event.targetTouches[0].clientY;
    } else {
      x = event.clientX;
      y = event.clientY;
    }

    // Invert the transformation matrix
    let det = CTM.a * CTM.d - CTM.b * CTM.c;
    if (det === 0) {
      // Handle the case where the matrix is singular
      return { x: 0, y: 0 };
    }

    let invCTM = {
      a: CTM.d / det,
      b: -CTM.b / det,
      c: -CTM.c / det,
      d: CTM.a / det,
      e: (CTM.c * CTM.f - CTM.d * CTM.e) / det,
      f: (CTM.b * CTM.e - CTM.a * CTM.f) / det
    };

    return {
      x: (x - CTM.e) * invCTM.a + (y - CTM.f) * invCTM.c,
      y: (x - CTM.e) * invCTM.b + (y - CTM.f) * invCTM.d
    };
  }


  getRatio(){
    if (this.img) {
      return this.img.naturalWidth/750;
    }else{
      return 1;
    }
  }

  @Method()
  async resetStates():Promise<void>
  {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  @Method()
  async getAllSelections(convertTo?:"rect"|"quad"):Promise<(Quad|Rect)[]>
  {
    let all = [];
    for (let index = 0; index < this.inactiveSelections.length; index++) {
      let selection = this.inactiveSelections[index];
      if (convertTo) {
        if ("width" in selection && convertTo === "quad") {
          selection = {points:this.getPointsFromRect(selection)};
        }else if (!("width" in selection) && convertTo === "rect"){
          selection = this.getRectFromPoints(selection.points);
        }
      }
      all.push(selection);
    }
    let useQuad = true;
    if (convertTo) {
      if (convertTo === "rect") {
        useQuad = false;
      }
    }else{
      if (!this.usingQuad) {
        useQuad = false;
      }
    }
    if (useQuad) {
      const quad = await this.getQuad();
      all.push(quad);
    }else{
      const rect = await this.getRect();
      all.push(rect);
    }
    return all;
  }

  @Method()
  async getPoints():Promise<[Point,Point,Point,Point]>
  {
    return this.points;
  }

  @Method()
  async getQuad():Promise<Quad>
  {
    return {points:this.points};
  }

  @Method()
  async getRect():Promise<Rect>
  {
    return this.getRectFromPoints(this.points);
  }

  getRectFromPoints(points:Point[]):Rect{
    let minX:number;
    let minY:number;
    let maxX:number;
    let maxY:number;
    for (const point of points) {
      if (!minX) {
        minX = point.x;
        maxX = point.x;
        minY = point.y;
        maxY = point.y;
      }else{
        minX = Math.min(point.x,minX);
        minY = Math.min(point.y,minY);
        maxX = Math.max(point.x,maxX);
        maxY = Math.max(point.y,maxY);
      }
    }
    minX = Math.floor(minX);
    maxX = Math.floor(maxX);
    minY = Math.floor(minY);
    maxY = Math.floor(maxY);
    return {x:minX,y:minY,width:maxX - minX,height:maxY - minY};
  }



  async getImageFromBlob(source:Blob){
    return new Promise<HTMLImageElement>((resolve, reject) => {
      let reader = new FileReader();
      reader.readAsDataURL(source);
      reader.onloadend = function () {
        let dataURL:string = reader.result as string;
        let img = document.createElement("img");
        img.onload = function(){
          resolve(img);
        };
        img.onerror = function(){
          reject();
        }
        img.src = dataURL;
      }
    })
  }

  async getImageFromDataURL(source:string){
    return new Promise<HTMLImageElement>((resolve, reject) => {
      let img = document.createElement("img");
      img.onload = function(){
        resolve(img);
      };
      img.onerror = function(){
        reject();
      }
      img.src = source;
    })
  }

 @Method()
 async detect(){}



  getSVGWidth(){
    if (this.img && this.svgElement) {
      this.svgElement.style.height = "100%";
      let imgRatio = this.img.naturalWidth/this.img.naturalHeight;
      let width = this.svgElement.clientHeight * imgRatio;
      if (width>this.svgElement.parentElement.clientWidth) {
        width = this.svgElement.parentElement.clientWidth;
        this.svgElement.style.height = width / imgRatio + "px";
      }
      return width;
    }
    return "100%";
  }

  onSVGPointerMove(e:PointerEvent){
    if (e.pointerType != "mouse" && !this.usingTouchEvent) {
      e.stopPropagation();
      e.preventDefault();
      this.onSVGMouseMove(e);
    }
  }

  onSVGPointerDown(e:PointerEvent){
    if (e.pointerType != "mouse" && !this.usingTouchEvent) {
      this.onSVGMouseDown(e);
    }
  }

  onSVGPointerUp(e:PointerEvent) {
    if (e.pointerType != "mouse" && !this.usingTouchEvent) {
      this.svgMouseDownPoint = undefined;
      this.selectedHandlerIndex = -1;
    }
  }

  onPolygonPointerDown(e:PointerEvent){
    if (e.pointerType != "mouse" && !this.usingTouchEvent) {
      this.onPolygonMouseDown(e);
    }
  }

  onPolygonPointerUp(e:PointerEvent){
    e.stopPropagation();
    this.selectedHandlerIndex = -1;
    this.polygonMouseDown = false;
  }

  render() {
    return (
      <Host ref={(el) => this.root = el}>
        <div class="container absolute"
          ref={(el) => this.containerElement = el}
          onWheel={(e:WheelEvent)=>this.onContainerWheel(e)}
          onMouseUp={()=>this.onContainerMouseUp()}
        >
          <canvas
            ref={(el) => this.canvasElement = el as HTMLCanvasElement}
            class="hidden-canvas"
          ></canvas>
          <svg
            version="1.1"
            ref={(el) => this.svgElement = el as SVGElement}
            class="cropper-svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={this.viewBox}
            width={this.getSVGWidth()}
            style={{transform:this.getPanAndZoomStyle()}}
            onMouseMove={(e:MouseEvent)=>this.onSVGMouseMove(e)}
            onMouseDown={(e:MouseEvent)=>this.onSVGMouseDown(e)}
            onTouchStart={(e:TouchEvent)=>this.onSVGTouchStart(e)}
            onTouchEnd={()=>this.onSVGTouchEnd()}
            onTouchMove={(e:TouchEvent)=>this.onSVGTouchMove(e)}
            onPointerMove={(e:PointerEvent)=>this.onSVGPointerMove(e)}
            onPointerDown={(e:PointerEvent)=>this.onSVGPointerDown(e)}
            onPointerUp={(e:PointerEvent)=>this.onSVGPointerUp(e)}
          >
            <image href={this.img ? this.img.src : ""}></image>
            {this.rendenInactiveSelections()}
            <polygon
              points={this.getPointsData()}
              class="cropper-controls dashed"
              style={{ pointerEvents: 'none' }}
              stroke-width={this.activeStroke * this.getRatio()}
              fill="transparent"
              // onMouseDown={(e:MouseEvent)=>this.onPolygonMouseDown(e)}
              // onMouseUp={(e:MouseEvent)=>this.onPolygonMouseUp(e)}
              // onTouchStart={(e:TouchEvent)=>this.onPolygonTouchStart(e)}
              // onTouchEnd={(e:TouchEvent)=>this.onPolygonTouchEnd(e)}
              // onPointerDown={(e:PointerEvent)=>this.onPolygonPointerDown(e)}
              // onPointerUp={(e:PointerEvent)=>this.onPolygonPointerUp(e)}
            >
            </polygon>
            {this.renderHandlers()}
          </svg>
          {this.renderFooter()}
          <div class="magnifier" ref={(el) => this.magnifierElement = el as HTMLElement}></div>
          <slot></slot>
        </div>
      </Host>
    );
  }

  showMagnifier() {
    if (this.magnifierElement) {
      this.magnifierElement.style.display = 'block';
    }
  }

  hideMagnifier() {
    if (this.magnifierElement) {
      this.magnifierElement.style.display = 'none';
    }
  }

  updateMagnifier(coord: Point) {
    if (!this.magnifierElement || !this.img) return;

    // Get the coordinates and dimensions of the rect
    const rect = this.getRectFromPoints(this.points);

    // Calculate the position of the magnifier
    const magnifierSize = 100; // Example size
    // const magnifierLeft = (coord.x - 300) - magnifierSize / 2 ;
    // const magnifierTop = (coord.y - 200) - magnifierSize / 2;
    const magnifierLeft = coord.x - magnifierSize ;
    const magnifierTop = coord.y - magnifierSize;

    // Cast svgElement to SVGSVGElement to use createSVGPoint
    const svgElement = this.svgElement as unknown as SVGSVGElement;

    // Check if getScreenCTM and createSVGPoint methods are available
    if (svgElement.getScreenCTM && svgElement.createSVGPoint) {
      const ctm = svgElement.getScreenCTM();
      const point = svgElement.createSVGPoint();
      point.x = magnifierLeft;
      point.y = magnifierTop;
      const transformedPoint = point.matrixTransform(ctm);

      // Set the magnifier's position
      this.magnifierElement.style.left = `${transformedPoint.x - 40}px`;
      this.magnifierElement.style.top = `${transformedPoint.y - 210}px`;
    } else {
      // Fallback if methods are not available
      this.magnifierElement.style.left = `${magnifierLeft}px`;
      this.magnifierElement.style.top = `${magnifierTop}px`;
    }

    // Set the magnifier's content (e.g., magnified image)
    const zoomLevel = 0.5; // Example zoom level
    const sx = Math.max(0, rect.x + (coord.x - rect.x) / this.scale - magnifierSize / zoomLevel / 2);
    const sy = Math.max(0, rect.y + (coord.y - rect.y) / this.scale - magnifierSize / zoomLevel / 2);
    const sw = magnifierSize / zoomLevel;
    const sh = magnifierSize / zoomLevel;
    const dx = 0;
    const dy = 0;
    const dw = magnifierSize;
    const dh = magnifierSize;

    const magnifierCanvas = document.createElement("canvas");
    magnifierCanvas.width = magnifierSize;
    magnifierCanvas.height = magnifierSize;
    const magnifierCtx = magnifierCanvas.getContext("2d");

    magnifierCtx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);

    // Draw the polygon on the magnifier canvas
    magnifierCtx.scale(zoomLevel, zoomLevel);
    magnifierCtx.strokeStyle = 'orange'; // Set the style as needed
    magnifierCtx.lineWidth = this.activeStroke / zoomLevel; // Adjust the line width
    magnifierCtx.beginPath();
    magnifierCtx.moveTo((this.points[0].x - sx), (this.points[0].y - sy));
    for (let i = 1; i < this.points.length; i++) {
      magnifierCtx.lineTo((this.points[i].x - sx), (this.points[i].y - sy));
    }
    magnifierCtx.closePath();
    magnifierCtx.stroke();

    this.magnifierElement.style.backgroundImage = `url(${magnifierCanvas.toDataURL()})`;
  }




}
