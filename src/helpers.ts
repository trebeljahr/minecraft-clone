const leftMouse = 0;
const rightMouse = 2;

export class MouseClickEvent {
  public event: MouseEvent;
  constructor(event: MouseEvent) {
    this.event = event;
  }
  get left() {
    return this.event.button === leftMouse;
  }
  get right() {
    return this.event.button === rightMouse;
  }
}
