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
    this.parentElement = document.getElementById(parentElementId);
    this.players = new Map();

    // Create a new HomiePropertyBuffer with a 100ms buffer time
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver, 500);

    this.initNoolsFlow();
    this.setupObservers();
  }

  setupLogging() {
    log.setLevel("info");
    homieLogger.setLevel("warn"); 
  }

  initNoolsFlow() {
    const flowDef = `
      rule ProcessPlayerUpdate {
        when {
          update: PropertyUpdate update.deviceId == 'gateway' && update.nodeId.startsWith('player-')
        }
        then {
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
        handlePropertyUpdate: that.handlePropertyUpdate.bind(that)
      }
    });

    this.session = this.flow.getSession();
  }

  setupObservers() {
    this.propertyBuffer.getBufferedUpdates().subscribe(updates => {
      const filteredUpdates = updates.filter(update => 
        update.deviceId === 'gateway' && 
        update.nodeId.startsWith('player-') && 
        ['team-id', 'nickname', 'skin', 'scale', 'say', 'active'].includes(update.propertyId)
      );

      filteredUpdates.forEach(update => {
        this.session.assert(new PropertyUpdate(update.deviceId, update.nodeId, update.propertyId, update.value));
      });

      if (filteredUpdates.length > 0) {
        this.session.match();
      }
    });
  }

  handlePropertyUpdate(update) {
    let player = this.players.get(update.nodeId);
    
    if (!player) {
      player = new PlayerNode(update.deviceId, update.nodeId, {});
      this.players.set(update.nodeId, player);
    }

    player.properties[update.propertyId] = update.value;

    log.info(`Updating player property: ${update.nodeId}/${update.propertyId} = ${update.value}`);

    if (update.propertyId === 'active' || !player.properties['active']) {
      this.renderPlayers();
    }
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
    if (this.parentElement.components['arc-layout']) {
      this.parentElement.components['arc-layout'].update();
    }
  }
}

export default TutorialSceneController;