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

    // Create a new HomiePropertyBuffer with a 500ms buffer time
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver, 500);

    this.initNoolsFlow();
    this.setupObservers();
    this.createTeamLayouts();
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
        ['team-id', 'nickname', 'skin', 'scale', 'say', 'active', 'animation-mixer', 'animation-start', 'animation-duration'].includes(update.propertyId)
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

    if (update.propertyId === 'active' || update.propertyId === 'team-id' || !player.properties['active']) {
      this.renderPlayers();
    } else if (update.propertyId === 'animation-mixer' || update.propertyId === 'animation-start' || update.propertyId === 'animation-duration') {
      this.updatePlayerAnimation(player);
    } else if (update.propertyId === 'skin' ) {
      this.updatePlayerSkin(player);
    }

  }

  updatePlayerAnimation(player) {
    const animationMixer = player.properties['animation-mixer'];
    const animationStart = parseInt(player.properties['animation-start']);
    const animationDuration = parseInt(player.properties['animation-duration']);

    if (animationMixer && (animationDuration === -1 || animationStart + animationDuration * 1000 > Date.now())) {
      const playerEntity = this.parentElement.querySelector(`#${player.nodeId}`);
      if (playerEntity) {
        playerEntity.setAttribute('animation-mixer', animationMixer);
        log.info(`Updated animation for player ${player.nodeId}: ${animationMixer}`);
      }
    }
  }

  updatePlayerSkin(player) {
    const skin = player.properties['skin'];
    
    const playerEntity = this.parentElement.querySelector(`#${player.nodeId}`);
    if (playerEntity) {
      playerEntity.setAttribute('texture-map', `src: assets/players/skins/${skin || 'alienA'}.png`);
      log.info(`Updated skin for player ${player.nodeId}: ${skin}`);
    }
  }

  createTeamLayouts() {
    const teamLayouts = html`
      <a-entity id="team-1" position="-9.5 0 0" rotation="0 90 0" arc-layout="radius: 10; startAngle: -40; endAngle: 40; itemSelector: .arc-item"></a-entity>
      <a-entity id="team-2" position="9.5 0 0" rotation="0 90 0" arc-layout="radius: 10; startAngle: -40; endAngle: 40; itemSelector: .arc-item"></a-entity>
    `;
    render(teamLayouts, this.parentElement);
  }

  renderPlayers() {
    const playerTemplate = (player) => html`
      <a-entity class="arc-item" look-towards="#camera" 
      animation-mixer="${player.properties['animation-mixer'] || 'clip: Idle; loop:repeat'}" 
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

    const team1Players = Array.from(this.players.values())
      .filter(player => player.properties.active === 'true' && player.properties['team-id'] === 'team-1');
    
    const team2Players = Array.from(this.players.values())
      .filter(player => player.properties.active === 'true' && player.properties['team-id'] === 'team-2');

    const team1Template = html`
      ${team1Players.map(player => playerTemplate(player))}
    `;

    const team2Template = html`
      ${team2Players.map(player => playerTemplate(player))}
    `;

    const team1Element = this.parentElement.querySelector('#team-1');
    const team2Element = this.parentElement.querySelector('#team-2');

    if (team1Element) {
      render(team1Template, team1Element);
      team1Element.components['arc-layout'].update();
    }

    if (team2Element) {
      render(team2Template, team2Element);
      team2Element.components['arc-layout'].update();
    }
  }
}

export default TutorialSceneController;