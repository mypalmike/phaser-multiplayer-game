import Entity from '/js/Entity.js';
import MouseState from '/js/MouseState.js';

// Client

const GRID_SIZE = 40;

var socket;
var entities;
var localPlayerEntityId;
var mouseState;

function start() {
  socket = io.connect()

  initEntities();
  initEventHandlers();
  initInput();

  requestAnimationFrame(update);
}

function initEntities() {
  entities = {};
}

function initEventHandlers() {
  socket.on('connect', onSocketConnect);
  socket.on('disconnect', onSocketDisconnect);
  socket.on('initialize', onInitialize);
  socket.on('ball', onBall);
  socket.on('wall', onWall);
  // socket.on('hazard', onHazard);
  socket.on('remove', onRemove);
}

function initInput() {
  // Callbacks for mouse events.
  var canvas = document.getElementById('myCanvas');
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);

  // Mouse state
  mouseState = new MouseState();
}

function onSocketConnect () {
  console.log('Connected');

  initEntities();

  var playerName = 'joe'; // TODO document.getSOMETHING.substr(0,16)

  // Send local player data to the game server
  socket.emit('join', { name: playerName })
}

function onSocketDisconnect () {
  console.log('Disconnected')
}

function onInitialize(data) {
  console.log('Receiving initial state');

  var localPlayer = data['localPlayer'];

  var balls = data['balls'];
  for (const ball of balls) {
    onBall(ball);
  }

  var hazards = data['hazards'];
  for (const hazard of hazards) {
    onHazard(hazard);
  }

  var enemies = data['enemies'];
  for (const enemy of enemies) {
    onEnemy(enemy);
  }

  var walls = data['walls'];
  for (const wall of walls) {
    onWall(wall);
  }
}

function onBall(data) {

}

function onWall(data) {
  console.log('onWall');
}

function onHazard(data) {

}

function onRemove(data) {
  var entityId = data['entityId'];
  delete entities[entityId];
}

function update() {
  var timestamp = Date.now();

  updateEntities();
  drawBackground();
  drawEntities();
  drawMouseState();

  requestAnimationFrame(update);  
}

function updateEntities(timestamp) {
  for (const entityId of Object.keys(entities)) {
    entities[entityId].update(timestamp);
  }
}

function drawBackground() {
  var width = canvasWidth();
  var height = canvasHeight();

  var canvas = document.getElementById('myCanvas');
  var context = canvas.getContext('2d');

  // Clear background
  context.fillStyle = 'blue';
  context.fillRect(0, 0, width, height);

  // Grid
  context.strokeStyle = 'white';
  for (var i = GRID_SIZE; i < width; i += GRID_SIZE) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, height);
    context.stroke();
  }

  context.strokeStyle = 'white';
  context.fillStyle = 'white';
  for (var j = GRID_SIZE; j < height; j += GRID_SIZE) {
    context.beginPath();
    context.moveTo(0, j);
    context.lineTo(width, j);
    context.stroke();
  }
}

function drawEntities() {
  for (const entityId of Object.keys(entities)) {
    entities[entityId].draw();
  }
}

function drawMouseState() {
  if (mouseState.isDown) {
    console.log('drawMouseState');
    var canvas = document.getElementById("myCanvas");
    var context = canvas.getContext("2d");
    context.strokeStyle = 'white';
    context.beginPath();
    context.moveTo(mouseState.x1, mouseState.y1);
    context.lineTo(mouseState.x2, mouseState.y2);
    context.stroke();
  }
}

function canvasWidth() {
  var canvas = document.getElementById('myCanvas');
  var context = canvas.getContext('2d');
  return context.canvas.width;
}

function canvasHeight() {
  var canvas = document.getElementById('myCanvas');
  var context = canvas.getContext('2d');
  return context.canvas.height;
}

function onMouseDown(event) {
  console.log('onMouseDown');
  mouseState.onMouseDown(event.offsetX, event.offsetY);
}

function onMouseUp(event) {
  mouseState.onMouseUp(event.offsetX, event.offsetY);

  if (!(mouseState.x1 === mouseState.x1 && mouseState.y1 === mouseState.y2)) {
    socket.emit('request wall', {x1: mouseState.x1, x2: mouseState.x2, y1: mouseState.y1, y2: mouseState.y2});
  }
}

function onMouseMove(event) {
  mouseState.onMouseMove(event.offsetX, event.offsetY);
}

// Run the start function after load is complete.
window.addEventListener("load", start);
