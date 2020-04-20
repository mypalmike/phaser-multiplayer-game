import Entity from '/js/Entity.js';
import MouseState from '/js/MouseState.js';

// Client

const GRID_SIZE = 40;
const PIXEL_SCALE = 160;

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

  const { localPlayer, balls, hazards, walls } = data;

  for (const ball of balls) {
    onBall(ball);
  }

  for (const hazard of hazards) {
    onHazard(hazard);
  }

  // for (const enemy of enemies) {
  //   onEnemy(enemy);
  // }

  for (const wall of walls) {
    onWall(wall);
  }
}

function onBall(data) {
  console.log('onBall');
  const { entityId, x, y, vx, vy, size } = data;

  console.log('onBall x:' + x + ' y:' + y + ' vx:' + vx + ' vy:' + vy + ' size:' + size);

  const ballEntity = new Entity('ball', entityId);

  ballEntity.x = x;
  ballEntity.y = y;
  ballEntity.vx = vx;
  ballEntity.vy = vy;
  ballEntity.size = size;

  entities[entityId] = ballEntity;
}

function onWall(data) {
  console.log('onWall');
  const { entityId, x1, x2, x3, x4, y1, y2, y3, y4 } = data;

  const wallEntity = new Entity('wall', entityId);

  wallEntity.x1 = x1;
  wallEntity.x2 = x2;
  wallEntity.x3 = x3;
  wallEntity.x4 = x4;
  wallEntity.y1 = y1;
  wallEntity.y2 = y2;
  wallEntity.y3 = y3;
  wallEntity.y4 = y4;

  entities[entityId] = wallEntity;
}

function onHazard(data) {
  console.log('onHazard');
  const { entityId, x, y, size } = data;

  const hazardEntity = new Entity('hazard', entityId);

  hazardEntity.x = x;
  hazardEntity.y = y;
  hazardEntity.size = size;

  entities[entityId] = hazardEntity;
}

function onRemove(data) {
  var entityId = data['entityId'];
  delete entities[entityId];
}

function update() {
  var timestamp = Date.now();

  updateEntities(timestamp);
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
    socket.emit('request wall', {
      x1: c2w(mouseState.x1),
      x2: c2w(mouseState.x2),
      y1: c2w(mouseState.y1),
      y2: c2w(mouseState.y2),
    });
  }
}

function onMouseMove(event) {
  mouseState.onMouseMove(event.offsetX, event.offsetY);
}

function c2w(value) {
  return value / PIXEL_SCALE;
}

// Run the start function after load is complete.
window.addEventListener("load", start);
