import { createMqttHomieObserver, HomiePropertyBuffer } from '@cmcrobotics/homie-lit';
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

class QuizzSceneController {
  constructor(brokerUrl, mqttOptions = {}) {
    this.homieObserver = createMqttHomieObserver(brokerUrl, mqttOptions);
    this.homieObserver.subscribe("gateway/#")
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver);
    this.flow = this.initNoolsFlow();
    this.session = this.flow.getSession();
    this.tickInterval = 5000; 

    this.setupPropertyGroups();
    this.setupBufferedUpdates();
    
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

      // rule GrowCoral {
      //   when {
      //     tick: Tick
      //   }
      //   then {
      //     console.log("Tick received, growing coral at time:", tick.time);
      //     // Implement coral growth logic
      //     // This is where you'd update the scale of coral entities
      //     homieObserver.publish("reef-1/asset-cluster-1/scale", "1.0");
      //   }
      // }
        `,{
      define:{
        PropertyUpdate : PropertyUpdate,
        Tick : Tick
      },
      scope: {
        logger: console,
        homieObserver: this.homieObserver
      },
      name: "quizz"
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



}

export default QuizzSceneController;