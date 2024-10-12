import { createMqttHomieObserver, HomiePropertyBuffer, logger as homieLogger } from '@cmcrobotics/homie-lit';
import nools from 'nools';
import log from 'loglevel';
import { html, render } from 'lit-html';

class PlayerNode {
  constructor(deviceId, nodeId, properties) {
    this.deviceId = deviceId;
    this.nodeId = nodeId;
    this.properties = properties;
  }
}

class PropertyUpdate {
  constructor(deviceId, nodeId, propertyId, value) {
    this.deviceId = deviceId;
    this.nodeId = nodeId;
    this.propertyId = propertyId;
    this.value = value;
  }
}

class TutorialSceneController {
  constructor(brokerUrl, parentElementId, mqttOptions = {}) {
    this.setupLogging();
    this.homieObserver = createMqttHomieObserver(brokerUrl, mqttOptions);
    this.homieObserver.subscribe("gateway/#");
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver);
    this.parentElement = document.getElementById(parentElementId);
    this.players = new Map();

    this.initNoolsFlow();
    this.setupObservers();
  }

  setupLogging() {
    log.setLevel("info");
    homieLogger.setLevel("warn"); 
  }

  initNoolsFlow() {
    const flowDef = `
      rule CreateOrUpdatePlayer {
        when {
          update: PropertyUpdate update.deviceId == 'gateway' && update.nodeId.startsWith('player-')
        }
        then {
          log.info("Updating player property: " + update.nodeId + "/" + update.propertyId + " = " + update.value);
          handlePropertyUpdate(update);
        }
      }
    `;

    var that = this;
    this.flow = nools.compile(flowDef, {
      name: "tutorialScene",
      define: {
        PropertyUpdate: PropertyUpdate,
        PlayerNode: PlayerNode
      },
      scope: {
        log: log,
        handlePropertyUpdate: that.handlePropertyUpdate.bind(that)
      }
    });

    this.session = this.flow.getSession();
  }

  setupObservers() {
    this.propertyBuffer.processBufferedUpdates((updates) => {
      updates.forEach(update => {
        if (update.deviceId === 'gateway' && update.nodeId.startsWith('player-') 
           && ['nickname', 'skin', 'scale', 'say', 'active'].indexOf(update.propertyId) != -1 ) {
          this.session.assert(new PropertyUpdate(update.deviceId, update.nodeId, update.propertyId, update.value));
        }
      });
      this.session.match();
    });
  }

  handlePropertyUpdate(propertyUpdate) {
    let player = this.players.get(propertyUpdate.nodeId);
    
    if (!player) {
      player = new PlayerNode(propertyUpdate.deviceId, propertyUpdate.nodeId, {});
      this.players.set(propertyUpdate.nodeId, player);
    }

    player.properties[propertyUpdate.propertyId] = propertyUpdate.value;

    if (propertyUpdate.propertyId === 'active' && propertyUpdate.value === 'true') {
      this.createPlayerEntity(player);
    } else {
      this.updatePlayerEntity(player);
    }
  }

  createPlayerEntity(player) {
    log.info(`Creating player entity: ${player.nodeId}`);
    this.renderPlayers();
  }

  updatePlayerEntity(player) {
    log.info(`Updating player entity: ${player.nodeId}`);
    this.renderPlayers();
  }

  renderPlayers() {
    const playerTemplate = (player) => html`
      <a-entity class="arc-item" look-towards="#camera" 
      animation-mixer="clip: Idle; loop:repeat" 
      id="${player.nodeId}" 
      gltf-model="#player-model"
      texture-map="src: assets/players/skins/${player.properties.skin || 'alienA'}.png"
       scale="${player.properties.scale || '1 1 1'}">
        <a-text
          color="black"
          opacity="0.8"
          value="${player.properties.nickname || '...'}"
          width="1" align="center" position="0 0 2" label="overwrite:true"></a-text>
      </a-entity>
    `;

    const playersTemplate = html`
      ${Array.from(this.players.values())
        .filter(player => player.properties.active === 'true')
        .map(player => playerTemplate(player))}
    `;
    render(playersTemplate, this.parentElement);
    this.parentElement.components['arc-layout'].update();
  }
}

export default TutorialSceneController;