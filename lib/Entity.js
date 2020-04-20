// import EntityIdGenerator from './EntityIdGenerator.js'

const { EntityIdGenerator } = require('./EntityIdGenerator');

const entityIdGenerator = new EntityIdGenerator()

// export default class Entity {
class Entity {
    constructor(entityType, owner, entityId=null) {
        if (entityId === null) {
            this.entityId = entityIdGenerator.generateId();
        } else {
            this.entityId = entityId;
        }
        this.owner = owner;
        this.entityType = entityType;
        this.body = null;
        this.timestamp_created = Date.now();
        this.timestamp_destroy = null;

        // Player
        this.name = null;
        this.score = 0;
    }

    update() {
        // TODO
    }
}

module.exports.Entity = Entity;
