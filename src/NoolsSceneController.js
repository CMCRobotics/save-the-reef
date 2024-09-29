import { createMqttHomieObserver, HomiePropertyBuffer } from '@bcopy/homie-lit';
import * as nools from 'nools';



class PropertyUpdate {
  constructor(deviceId, nodeId, propertyId, value) {
    this.deviceId = deviceId;
    this.nodeId = nodeId;
    this.propertyId = propertyId;
    this.value = value;
  }
}

class Tick {
  constructor(time) {
    this.time = time;
  }
}

class NoolsSceneController {
  constructor(brokerUrl, mqttOptions = {}) {
    this.homieObserver = createMqttHomieObserver(brokerUrl, mqttOptions);
    this.homieObserver.subscribe("reef-1/#")
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver);
    this.flow = this.initNoolsFlow();
    this.session = this.flow.getSession();
    this.tickInterval = 5000; // 1 second
    this.corals = new Map();

    this.setupPropertyGroups();
    this.setupBufferedUpdates();
    this.setupTickSystem();

    this.sceneBounds = {
      minX: -8, maxX: -3,
      minY: 0, maxY: 1,  // Assuming Y is up, and corals grow from the bottom
      minZ: -10, maxZ: -5
    };
  }

  initNoolsFlow() {
    const flow = nools.compile(`
      rule ProcessPropertyUpdate {
        when {
          update: PropertyUpdate
        }
        then {
          console.log("Processing property update:", update);
          // Implement logic to update AFrame entities based on property updates
        }
      }

      rule GrowCoral {
        when {
          tick: Tick
        }
        then {
          console.log("Tick received, growing coral at time:", tick.time);
          // Implement coral growth logic
          // This is where you'd update the scale of coral entities
          homieObserver.publish("reef-1/asset-cluster-1/scale", "1.0");
        }
      }`,{
      define:{
        PropertyUpdate : PropertyUpdate,
        Tick : Tick
      },
      scope: {
        logger: console,
        homieObserver: this.homieObserver
      },
      name: "growth"
    });

    return flow;
  }

  setupPropertyGroups() {
    this.propertyBuffer.addPropertyGroup({
      name: 'coral',
      properties: ['coral/health', 'coral/size', 'coral/color'],
      priority: 1
    });
    // Add more property groups as needed
  }

  setupBufferedUpdates() {
    this.propertyBuffer.processBufferedUpdates((updates) => {
      updates.forEach(update => {
        this.session.assert(new this.flow.PropertyUpdate(update));
      });
      this.session.match();
    });
  }

  setupTickSystem() {
    setInterval(() => {
      this.session.assert(new Tick({ time: Date.now() }));
      this.session.match();
    }, this.tickInterval);
  }

  addCoral(id, initialScale) {
    const coral = {
      id,
      scale: initialScale,
      entity: this.createCoralEntity(id, initialScale)
    };
    this.corals.set(id, coral);
  }

  getRandomPosition() {
    const x = this.getRandomCoordinate(this.sceneBounds.minX, this.sceneBounds.maxX);
    const y = this.getRandomCoordinate(this.sceneBounds.minY, this.sceneBounds.maxY);
    const z = this.getRandomCoordinate(this.sceneBounds.minZ, this.sceneBounds.maxZ);
    return `${x} ${y} ${z}`;
  }

  getRandomCoordinate(min, max) {
    return Math.random() * (max - min) + min;
  }


  createCoralEntity(id, initialScale) {
    const entity = document.createElement('a-entity');
    entity.setAttribute('id', id);
    entity.setAttribute('geometry', 'primitive: cone');
    entity.setAttribute('material', 'color: #FF6B6B');
    // Generate random position
    const position = this.getRandomPosition();
    // Set random position and initial scale
    entity.setAttribute('position', position);
    entity.setAttribute('scale', `${initialScale} ${initialScale} ${initialScale}`);
    document.querySelector('a-scene').appendChild(entity);
    return entity;
  }

  updateCoralScale(id, scaleFactor) {
    const coral = this.corals.get(id);
    if (coral) {
      coral.scale *= scaleFactor;
      coral.entity.setAttribute('scale', `${coral.scale} ${coral.scale} ${coral.scale}`);
    }
  }

  // publishMqttMessage(topic, message) {
  //   // Assuming the HomieObserver has a method to publish MQTT messages
  //   this.homieObserver.publishMessage(topic, message);
  // }
}

export default NoolsSceneController;