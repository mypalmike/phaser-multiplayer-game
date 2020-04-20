export default class MouseState {
    constructor() {
        this.isDown = false;
        this.x1 = 0;
        this.x2 = 0;
        this.y1 = 0;
        this.y2 = 0;
    }

    onMouseDown(x, y) {
        this.isDown = true;
        this.x1 = x;
        this.x2 = x;
        this.y1 = y;
        this.y2 = y;
    }

    onMouseMove(x ,y) {
        if (this.isDown) {
            this.x2 = x;
            this.y2 = y;
        }
    }

    onMouseUp(x, y) {
        this.isDown = false;
    }
}
