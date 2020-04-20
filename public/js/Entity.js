const PIXEL_SCALE = 160;

export default class Entity {
    constructor(entityType, entityId) {
        this.entityId = entityId;
        this.entityType = entityType;
        this.createTimestamp = Date.now();
        this.lastUpdate = this.createTimestamp;

        // Player
        this.playerName = null;
        this.score = null;

        // Ball or hazard position
        this.x = null;
        this.y = null;
        
        // Ball velocity
        this.vx = null;
        this.vy = null;

        // Hazard size (radius or square width)
        this.size = null;

        // Line
        this.x1 = null;
        this.x2 = null;
        this.x3 = null;
        this.x4 = null;
        this.y1 = null;
        this.y2 = null;
        this.y3 = null;
        this.y4 = null;
    }

    update(timestamp) {
        this._updatePosition(timestamp);

        this.lastUpdate = timestamp;
    }

    _updatePosition(timestamp) {
        if (this.vx != null && this.vy != null) {
            var dt = (timestamp - this.lastUpdate) / 1000.0;
            this.x += (this.vx * dt);
            this.y += (this.vy * dt);
        }
    }

    draw() {
        this._drawBall();
        this._drawHazard();
        this._drawWall();
    }

    _drawBall() {
        if (this.entityType == 'ball') {
            console.log('drawBall x:' + this.x + ' y:' + this.y + ' size:' + this.size);
            var canvas = document.getElementById('myCanvas');
            var context = canvas.getContext('2d');
      
            context.beginPath();
            context.arc(w2c(this.x), w2c(this.y), w2c(this.size), 0, 2 * Math.PI, false);
            context.fillStyle = 'green';
            context.fill();
            context.lineWidth = 1;
            context.strokeStyle = 'black';
            context.stroke();
        }
    }

    _drawHazard() {
        if (this.entityType == 'hazard') {
            var canvas = document.getElementById('myCanvas');
            var context = canvas.getContext('2d');
      
            var left = this.x - (this.size);// / 2);
            var top = this.y - (this.size);// / 2);
            context.beginPath();            
            context.rect(w2c(left), w2c(top), w2c(this.size * 2), w2c(this.size * 2));
            context.fillStyle = 'red';
            context.fill();
            context.lineWidth = 1;
            context.strokeStyle = 'black';
            context.stroke();
        }
    }

    _drawWall() {
        if (this.entityType == 'wall') {
            var canvas = document.getElementById('myCanvas');
            var context = canvas.getContext('2d');
            context.fillStyle = 'grey';
            context.beginPath();
            context.moveTo(w2c(this.x1), w2c(this.y1));
            context.lineTo(w2c(this.x2), w2c(this.y2));
            context.lineTo(w2c(this.x3), w2c(this.y3));
            context.lineTo(w2c(this.x4), w2c(this.y4));
            context.closePath();
            context.fill();
            context.lineWidth = 1;
            context.strokeStyle = 'black';
            context.stroke();
        }
    }
}

// World to canvas transform.
function w2c(val) {
    return val * PIXEL_SCALE;
}