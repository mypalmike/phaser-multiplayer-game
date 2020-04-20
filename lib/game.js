// Server


const util = require('util');
const http = require('http');
const path = require('path');
const ecstatic = require('ecstatic');
const io = require('socket.io');
const planck = require('planck-js');
const { Entity } = require('./Entity');

const pl = planck, Vec2 = pl.Vec2;

const PORT = process.env.PORT || 8080;
const TICK_SECONDS = 0.2;
const NUM_HAZARDS = 25; 

var BALL_BODY_DEF = {
  angularDamping : 0.0,
  linearDamping : 0.0,
};

var BALL_FIXTURE_DEF = {
  friction: 0.0,
  restitution: 1.0,
  density: 1,
};

var BALL_R = 16.0;

/* ************************************************
** GAME VARIABLES
************************************************ */
var socket;	// Socket controller
var world; // Planck (box2d physics) world
var entities; // All game entities

/* ************************************************
** GAME INITIALISATION
************************************************ */

// Create and start the http server
var server = http.createServer(
  ecstatic({ root: path.resolve(__dirname, '../public') })
).listen(PORT, function (err) {
  if (err) {
    throw err;
  }

  init();
})

function init () {
  // Init globals.
  entities = []
  world = pl.World();
  socket = io.listen(server);

  initEventHandlers();

  var intervalId = setInterval(gameTick, TICK_SECONDS * 1000);

  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    clearInterval(intervalId);
  });

  initHazards();
}

function initHazards() {
  // for (i = 0; i < NUM_HAZARDS; i++) {
  //   // TODO : Random
  //   var x = ((i + 1) % 5) * 200;
  //   var y = Math.floor(((i + 1) / 5)) * 200;

  //   var entity = new Entity('hazard', null);  // No owner

  //   // TODO : Make hazard def, etc.
  //   var newHazard = world.createDynamicBody(HAZARD_BODY_DEF);
  //   var pos = Vec2(x, y);
  //   // var vel = Vec2(1.0, 1.0); // TODO : Random velocity
  //   newHazard.setPosition(pos);
  //   // newPlayer.setLinearVelocity(vel);
  //   newHazard.setUserData({id: entity.entityId});
  //   newHazard.createFixture(pl.Circle(PLAYER_R), PLAYER_FIXTURE_DEF);

  //   entity.body = newHazard;
  // }
}

function gameTick() {
  // console.log("In gameLoop");
  for (i = 0; i < entities.length; i++) {
    entities[i].update();
  }
  world.step(TICK_SECONDS);
}

function initEventHandlers() {
  socket.sockets.on('connection', onSocketConnection)
}

function onSocketConnection (client) {
  util.log('Connected: ' + client.id);

  client.on('disconnect', onDisconnect);
  client.on('join', onJoin);
  // client.on('move player', onMovePlayer);
  client.on('request wall', onRequestWall);
}

// Socket client has disconnected
function onDisconnect () {
  util.log('Disconnected: ' + this.id);

  // // var removePlayer = playerById(this.id);

  // // Player not found
  // if (!removePlayer) {
  //   util.log('Player not found: ' + this.id);
  //   return;
  // }

  // world.destroyBody(removePlayer);

  // // Remove player from players array
  // players.splice(players.indexOf(removePlayer), 1);

  // // Broadcast removed player to connected socket clients
  // this.broadcast.emit('remove player', {id: this.id});
}

// New player has joined
function onJoin (data) {
  console.log('onJoin');

  var owner = this.id;
  var name = data.name;

  createPlayerEntity(owner, name);
  createBallEntity(playerEntity.entityId);

  initializeMessage = generateInitializeMessage(playerEntity.entityId);

  this.broadcast.emit('initialize', initializeMessage);
}

function onRequestWall(data) {
  console.log('onRequestWall');

  const playerEntityId = lookupPlayerEntityId(this.id);
  if (playerEntityId === null) {
    return;
  }

  // var player = playerById(this.id);

  // From center to edge, i.e. half the wall thickness.
  const wallOffset = 2;

  if (isValidRequestWallData(data)) {
    const {x1, x2, y1, y2} = data;

    const dx = x2 - x1;
    const dy = y2 - y1;
  
    // Normalize and scale.
    const length = Math.sqrt(dx * dx + dy * dy);
    const dxNorm = dx / length;
    const dyNorm = dy / length;
    const dxScale = dxNorm * wallOffset;
    const dyScale = dyNorm * wallOffset;

    // Offset x by dy, y by dx. It makes sense, guys.
    const vertex1x = x1 - dyScale;
    const vertex1y = y1 + dxScale;

    const vertex2x = x1 + dyScale;
    const vertex2y = y1 - dxScale;

    const vertex3x = x2 + dyScale;
    const vertex3y = y2 - dxScale;

    const vertex4x = x2 - dyScale;
    const vertex4y = y2 + dxScale;

    // Entity and body.
    const wallEntity = new Entity('wall', playerEntityId);
    const polygon = pl.Polygon([
      Vec2(vertex1x, vertex1y),
      Vec2(vertex2x, vertex2y),
      Vec2(vertex3x, vertex3y),
      Vec2(vertex4x, vertex4y),
    ])
    const wallBody = world.createBody();
    wallBody.createFixture(polygon);
    wallBody.setUserData({ entityId: wallEntity.entityId });
    wallEntity.body = wallBody;

    entities.push(wallEntity);

    broadcastEntity(wallEntity);
  }
}

function isValidRequestWallData(data) {
  const {x1, x2, y1, y2} = data;
  if (typeof x1 === 'undefined' ||
      typeof x2 === 'undefined' ||
      typeof y1 === 'undefined' ||
      typeof y2 === 'undefined') {
    return false;
  }

  if ((x1 === x2) && (y1 === y2)) {
    return false;
  }

  return true;
}

function ownerName(entity) {
  return "todo-ownerName";
}

function createPlayerEntity(owner, name) {
  // Create player entity
  playerEntity = new Entity('player', owner);
  playerEntity.name = name;
  entities.push(playerEntity);
}

function createBallEntity(playerEntityId) {
  // Create ball entity
  ballEntity = new Entity('ball', playerEntityId);
  var ballBody = world.createDynamicBody(BALL_BODY_DEF);
  var pos = Vec2(100.0, 100.0);  // TODO : Random location
  var vel = Vec2(10.0, 10.0); // TODO : Random velocity
  ballBody.setPosition(pos);
  ballBody.setLinearVelocity(vel);
  ballBody.setUserData({ entityId: ballEntity.entityId });
  ballBody.createFixture(pl.Circle(BALL_R), BALL_FIXTURE_DEF);
  ballEntity.body = ballBody;

  entities.push(ballEntity);
}

function generateInitializeMessage(localPlayerEntityId) {
  var localPlayer = {
    entityId: localPlayerEntityId,
  };

  var balls = [];
  for (const entity of entities) {
    if (entity.entityType == 'ball') {
      var pos = entity.body.getPosition();
      var vel = entity.body.getLinearVelocity();
      balls.push({
        entityId: entity.entityId,
        ownerName: ownerName(entity),
        x: pos.x,
        y: pos.y,
        vx: vel.x,
        vy: vel.y,
      });
    }
  }

  hazards = [];
  for (const entity of entities) {
    if (entity.entityType == 'hazard') {
      var pos = entity.body.getPosition();
      hazards.push({
        entityId: entity.entityId,
        x: pos.x,
        y: pos.y,
      });
    }
  }

  walls = [];
  for (const entity of entities) {
    if (entity.entityType == 'wall') {
      var v0 = entity.body.getFixtureList().getShape().getVertex(0);
      var v1 = entity.body.getFixtureList().getShape().getVertex(1);
      var v2 = entity.body.getFixtureList().getShape().getVertex(2);
      var v3 = entity.body.getFixtureList().getShape().getVertex(3);
      walls.push({
        entityId: entity.entityId,
        x1: v0.x,
        x2: v1.x,
        x3: v2.x,
        x4: v3.x,
        y1: v0.y,
        y2: v1.y,
        y3: v2.y,
        y4: v3.y,
      });
    }
  }

  return {
    localPlayer: localPlayer,
    balls: balls,
    hazards: hazards,
    walls: walls,
  };
}

function broadcastEntity(entity) {
  if (entity.entityType == 'wall') {
    var v0 = entity.body.getFixtureList().getShape().getVertex(0);
    var v1 = entity.body.getFixtureList().getShape().getVertex(1);
    var v2 = entity.body.getFixtureList().getShape().getVertex(2);
    var v3 = entity.body.getFixtureList().getShape().getVertex(3);
    this.broadcast.emit('wall', {
      entityId: entity.entityId,
      x1: v0.x,
      x2: v1.x,
      x3: v2.x,
      x4: v3.x,
      y1: v0.y,
      y2: v1.y,
      y3: v2.y,
      y4: v3.y,
    });
  }
}

function lookupPlayerEntityId(clientId) {
  for (entity of entities) {
    if (entity.entityType == 'player' && entity.owner == clientId) {
      return entity.entityId;
    }
  }

  console.log('No player found for: ' + clientId);
  return null;
}

// function playerById (id) {
//   var i;
//   for (i = 0; i < players.length; i++) {
//     if (players[i].getUserData().id === id) {
//       return players[i];
//     }
//   }

//   return false;
// }
