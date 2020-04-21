// Server


const util = require('util');
const path = require('path');
const ecstatic = require('ecstatic');
const app = require('http').createServer(ecstatic({ root: path.resolve(__dirname, '../public') }))
// const http = require('http');
const io = require('socket.io')(app);
// const io = require('socket.io');
const planck = require('planck-js');
const { Entity } = require('./Entity');

const pl = planck, Vec2 = pl.Vec2;

const PORT = process.env.PORT || 8080;
const TICK_SECONDS = 1/60;
const NUM_HAZARDS = 25;

var BALL_BODY_DEF = {
  bullet: true,
  // angularDamping : 0.0,
  // linearDamping : 0.0,
};

var BALL_FIXTURE_DEF = {
  friction: 0.0,
  restitution: 1.0,
  // density: 100,
};

// var WALL_FIXTURE_DEF = {
//   friction: 1.0,
//   restitution: 1.0,
//   density: 100,
// };

var WALL_THICKNESS = 0.05;

var BALL_R = 0.1;

var HAZARD_SIZE = 0.1;

var PIXEL_SCALE = 160;

/* ************************************************
** GAME VARIABLES
************************************************ */
// var socket;	// Socket controller
var world; // Planck (box2d physics) world
var entities; // All game entities
var removeQueue;

/* ************************************************
** GAME INITIALISATION
************************************************ */

// function serverHandler(req, res) {

// }

//ecstatic({ root: path.resolve(__dirname, '../public') })const serverHandler = ecstatic({ root: path.resolve(__dirname, '../public') });

app.listen(PORT);

init();

// // Create and start the http server
// var server = http.createServer(
//   ecstatic({ root: path.resolve(__dirname, '../public') })
// ).listen(PORT, function (err) {
//   if (err) {
//     throw err;
//   }

//   init();
// })

function init () {
  // Hack. Want elastic collisions.
  pl.internal.Settings.velocityThreshold = 0.0001;

  // Init globals.
  entities = [];
  removeQueue = [];
  world = pl.World();
  world.on('post-solve', handlePostSolve);

  // socket = io.listen(server);

  initEventHandlers();


  initHazards();

  var intervalId = setInterval(gameTick, TICK_SECONDS * 1000);

  // process.on('SIGTERM', () => {
  //   console.info('SIGTERM signal received.');
  //   clearInterval(intervalId);
  // });

}

function initHazards() {
  for (i = 0; i < NUM_HAZARDS; i++) {
    // TODO : Random
    var x = ((i + 1) % 5) * 200 / PIXEL_SCALE;
    var y = Math.floor(((i + 1) / 5)) * 200 / PIXEL_SCALE;

    var entity = new Entity('hazard', null);  // No owner

    var newHazard = world.createBody();
    var pos = Vec2(x, y);
    newHazard.setPosition(pos);
    newHazard.setUserData({entityId: entity.entityId});
    newHazard.createFixture(pl.Box(HAZARD_SIZE, HAZARD_SIZE));
    newHazard.isHazard = true;

    entity.body = newHazard;

    entities.push(entity);
  }
}

function gameTick() {
  // console.log("In gameLoop");
  for (i = 0; i < entities.length; i++) {
    entities[i].update();
  }
  world.step(TICK_SECONDS);
  checkOobBalls();

  if (removeQueue.length > 0) {
    for (var entityId of removeQueue) {
      const entity = lookupEntityById(entityId);
      // Check for valid to avoid double-delete crash.
      if (entity != null) {
        removeEntity(entity);
      }
    }

    removeQueue = [];
  }
}

function initEventHandlers() {
  io.on('connection', onSocketConnection);
}

function onSocketConnection (socket) {
  util.log('Connected: ' + socket.id);

  socket.on('disconnect', () => onDisconnect(socket));
  socket.on('join', data => onJoin(socket, data));
  socket.on('request wall', data => onRequestWall(socket, data));
}

function onDisconnect (socket) {
  util.log('Disconnected: ' + socket.id);

  const playerEntityId = lookupPlayerEntityId(socket.id);

  const entitiesToRemove = [];
  for (entity of entities) {
    if (entity.owner === playerEntityId || entity.owner === socket.id) {
      console.log('found ' + entity.entityType);
      entitiesToRemove.push(entity);
    }
  }

  console.log('removing ' + entitiesToRemove.length);
  for (entityToRemove of entitiesToRemove) {
    removeEntity(entityToRemove);
  }
}

// New player has joined
function onJoin (socket, data) {
  console.log('onJoin');

  var owner = socket.id;
  var name = data.name;

  createPlayerEntity(owner, name);
  createBallEntity(playerEntity.entityId);

  initializeMessage = generateInitializeMessage(playerEntity.entityId);

  socket.emit('initialize', initializeMessage);
}

function onRequestWall(socket, data) {
  console.log('onRequestWall');

  const playerEntityId = lookupPlayerEntityId(socket.id);
  if (playerEntityId === null) {
    return;
  }

  if (isValidRequestWallData(data)) {
    removeOldWalls(playerEntityId);

    const {x1, x2, y1, y2} = data;

    const dx = x2 - x1;
    const dy = y2 - y1;
  
    // Normalize and scale.
    const length = Math.sqrt(dx * dx + dy * dy);
    const dxNorm = dx / length;
    const dyNorm = dy / length;
    const dxScale = dxNorm * WALL_THICKNESS / 2;
    const dyScale = dyNorm * WALL_THICKNESS / 2;

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
    wallBody.createFixture(polygon); // , WALL_FIXTURE_DEF);
    wallBody.setUserData({ entityId: wallEntity.entityId });
    wallEntity.body = wallBody;

    entities.push(wallEntity);

    broadcastEntity(socket, wallEntity);
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
  var pos = Vec2(100.0 / PIXEL_SCALE, 100.0 / PIXEL_SCALE);  // TODO : Random location
  var vel = Vec2(0.6, 0.125); // TODO : Random velocity
  ballBody.setPosition(pos);
  ballBody.setLinearVelocity(vel);
  ballBody.setUserData({ entityId: ballEntity.entityId });
  ballBody.createFixture(pl.Circle(BALL_R), BALL_FIXTURE_DEF);
  ballBody.isBall = true;
  ballEntity.body = ballBody;

  entities.push(ballEntity);

  sendBallUpdate(ballEntity.entityId);
}

function entityToMessage(entity) {
  if (entity.entityType === 'ball') {
    const pos = entity.body.getPosition();
    const vel = entity.body.getLinearVelocity();
    return {
      entityId: entity.entityId,
      owner: entity.owner,
      x: pos.x,
      y: pos.y,
      vx: vel.x,
      vy: vel.y,
      size: BALL_R, // TODO : If size changes...
    };
  } else if (entity.entityType === 'wall') {
    var v0 = entity.body.getFixtureList().getShape().getVertex(0);
    var v1 = entity.body.getFixtureList().getShape().getVertex(1);
    var v2 = entity.body.getFixtureList().getShape().getVertex(2);
    var v3 = entity.body.getFixtureList().getShape().getVertex(3);
    return {
      entityId: entity.entityId,
      owner: entity.owner,
      x1: v0.x,
      x2: v1.x,
      x3: v2.x,
      x4: v3.x,
      y1: v0.y,
      y2: v1.y,
      y3: v2.y,
      y4: v3.y,
    };
  } else if (entity.entityType === 'hazard') {
    var pos = entity.body.getPosition();
    return {
      entityId: entity.entityId,
      x: pos.x,
      y: pos.y,
      size: HAZARD_SIZE,
    };
  } else if (entity.entityType === 'player') {
    return {
      entityId: entity.entityId,
      name: entity.name,
    };
  }

  console.log('No message converter for entity type ' + entity.entityType);
  return null;
}

function generateInitializeMessage(localPlayerEntityId) {
  var localPlayer = {
    entityId: localPlayerEntityId,
  };

  var balls = [];
  var hazards = [];
  var walls = [];
  var players = [];
  for (const entity of entities) {
    if (entity.entityType === 'ball') {
      balls.push(entityToMessage(entity));
    } else if (entity.entityType === 'hazard') {
      hazards.push(entityToMessage(entity));
    } else if (entity.entityType === 'wall') {
      walls.push(entityToMessage(entity));
    } else if (entity.entityType === 'player') {
      players.push(entityToMessage(entity));
    }
  }

  return {
    localPlayer: localPlayer,
    balls: balls,
    hazards: hazards,
    walls: walls,
    players: players,
  };
}

function broadcastEntity(socket, entity) {
  const message = entityToMessage(entity);
  socket.broadcast.emit(entity.entityType, message);
  socket.emit(entity.entityType, message);
}

function broadcastEntityIo(entity) {
  const message = entityToMessage(entity);
  io.emit(entity.entityType, message);
}

function broadcastRemoveEntityIo(entityId) {
  const message = { entityId: entityId };
  io.emit('remove', message);
}

function lookupPlayerEntityId(clientId) {
  for (entity of entities) {
    if (entity.entityType === 'player' && entity.owner === clientId) {
      return entity.entityId;
    }
  }

  console.log('No player found for: ' + clientId);
  return null;
}

function lookupEntityById(entityId) {
  for (entity of entities) {
    if (entity.entityId === entityId) {
      return entity;
    }
  }

  console.log('No entity found with id: ' + entityId);
  return null;
}

function handlePostSolve(contact) {
  var fA = contact.getFixtureA(), bA = fA.getBody();
  var fB = contact.getFixtureB(), bB = fB.getBody();

  if (bA.isBall && bB.isHazard) {
    killBall(bA);
  } else if (bA.isHazard && bB.isBall) {
    killBall(bB);
  } else {
    if (bA.isBall) {
      sendBallUpdate(bA.getUserData().entityId);
    }

    if (bB.isBall) {
      sendBallUpdate(bB.getUserData().entityId);
    }
  }
}

function sendBallUpdate(entityId) {
  const entity = lookupEntityById(entityId);
  broadcastEntityIo(entity);
}


function removeOldWalls(playerEntityId) {
  console.log('removeOldWalls');
  var count = 0;
  for (entity of entities) {
    if (entity.owner === playerEntityId && entity.entityType === 'wall') {
      count++;
    }
  }

  console.log('count ' + count);

  var oldest = null;
  if (count >= 2) {
    for (var i = 0; i < entities.length; i++) {
      entity = entities[i];
      if (entity.owner === playerEntityId && entity.entityType === 'wall') {
        const timestamp = entity.createTimestamp;
        if (oldest === null || entity.createTimestamp < oldest.createTimestamp) {
          oldest = entity;
        }
      }
    }
  
    if (oldest !== null) {
      removeEntity(oldest);
    }
  }
}

function removeEntity(entity) {
  console.log('removing ' + entity.entityType);
  var indexToRemove = null;
  // var currEntity = null;
  for (var i = 0; i < entities.length; i++) {
    if (entity.entityId == entities[i].entityId) {
      indexToRemove = i;
    }
  }

  if (indexToRemove !== null) {
    if (entity.body !== null) {
      world.destroyBody(entity.body);
    }
    entities.splice(indexToRemove, 1);
    broadcastRemoveEntityIo(entity.entityId);
  }
}

function killBall(ballBody) {
  const ballEntityId = ballBody.getUserData().entityId;
  // const ballEntity = lookupEntityById(ballEntityId);
  console.log('queueing ' + ballEntityId); // ballEntity.entityType);
  removeQueue.push(ballEntityId);
}

function checkOobBalls() {
  for (var entity of entities) {
    if (entity.entityType == 'ball') {
      var pos = entity.body.getPosition();
      var x = pos.x;
      var y = pos.y;
      if (x < 0 || y < 0 || x > 600 / 160 || y > 600 / 160) {
        killBall(entity.body);
      }
    }
  }
}
