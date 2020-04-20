export default class Entity {
    constructor(entityType, entityId) {
        this.entityId = entityId;
        this.entityType = entityType;
        this.createTimestamp = Date.now();
        this.lastUpdate = this.createTimestamp;

        // Player
        this.playerName = null;
        this.score = null;

        // Position
        this.x = null;
        this.y = null;
        
        // Velocity
        this.vx = null;
        this.vy = null;

        // Size (radius or square width)
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
        _updatePosition(timestamp);

        this.lastUpdate = timestamp;
    }

    _updatePosition(timestamp) {
        if (this.vx != null) {
            var dt = timestamp - this.lastUpdate / 1000.0;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }
    }

    draw() {
        this._drawBall();
        this._drawHazard();
        this._drawWall();
    }

    _drawBall() {
        if (this.entityType == 'ball') {
            var canvas = document.getElementById('myCanvas');
            var context = canvas.getContext('2d');
            var radius = this.size;
      
            context.beginPath();
            context.arc(this.x, this.y, radius, 0, 2 * Math.PI, false);
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
      
            var left = this.x - (this.size / 2);
            var top = this.y - (this.size / 2);
            context.beginPath();            
            context.rect(left, top, this.size, this.size);
            context.fillStyle = 'red';
            context.fill();
            context.lineWidth = 7;
            context.strokeStyle = 'black';
            context.stroke();
        }
    }

    _drawWall() {
        if (this.entityType == 'wall') {
            var canvas = document.getElementById('myCanvas');
            var context = canvas.getContext('2d');
            context.fillStyle = 'blue';
            context.beginPath();
            context.moveTo(this.x1, this.y1);
            context.lineTo(this.x2, this.y2);
            context.lineTo(this.x3, this.y3);
            context.lineTo(this.x4, this.y4);
            context.closePath();
            context.fill();
        }
    }
}
