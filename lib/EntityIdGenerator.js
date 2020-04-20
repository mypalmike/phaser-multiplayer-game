//export default class EntityIdGenerator {
class EntityIdGenerator {
    constructor() {
        this.lastTimestamp = Date.now();
        this.count = 0;
    }

    generateId() {
        var timestamp = Date.now();
        if (timestamp === this.lastTimestamp) {
            this.count++;
        } else {
            this.count = 0;
            this.lastTimestamp = timestamp;
        }
        return timestamp.toString() + '_' + this.count;
    }
}

module.exports.EntityIdGenerator = EntityIdGenerator;
