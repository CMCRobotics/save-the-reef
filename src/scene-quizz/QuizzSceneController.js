import { createMqttHomieObserver, HomiePropertyBuffer, logger as homieLogger } from '@cmcrobotics/homie-lit';
import PropertyUpdate from '../homie-lit-components/PropertyUpdate';
import TeamLayout from '../homie-lit-components/TeamLayout';
import * as nools from 'nools';
import log from 'loglevel';

class PlayerNode {
  constructor(deviceId, nodeId, properties) {
    this.deviceId = deviceId;
    this.nodeId = nodeId;
    this.properties = properties;
  }
}

class QuizzSceneController {
  constructor(brokerUrl, parentElementId, mqttOptions = {}) {
    this.setupLogging();
    this.homieObserver = createMqttHomieObserver(brokerUrl, mqttOptions);
    // this.homieObserver.subscribe("gateway/#");
    // this.homieObserver.subscribe("terminal-+/#");
    this.homieObserver.subscribe("#");
    this.parentElement = document.getElementById(parentElementId);
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver, 300);
    this.players = new Map();
    this.terminalToPlayerMap = new Map();
    this.teamLayout = new TeamLayout(this.parentElement);

    this.flow = this.initNoolsFlow();
    this.session = this.flow.getSession();

    this.setupObservers();
    this.teamLayout.createTeamLayouts();
    
  }

  setupLogging() {
    log.setLevel("debug");
    homieLogger.setLevel("info"); 
  }
  
  initNoolsFlow() {
    const flow = nools.compile(`
      rule ProcessPlayerUpdate {
        when {
          update: PropertyUpdate update.deviceId == 'gateway' && update.nodeId.startsWith('player-')
        }
        then {
          handlePropertyUpdate(update);
        }
      }
        `,{
      define:{
        PropertyUpdate : PropertyUpdate,
        PlayerNode: PlayerNode
      },
      scope: {
        handlePropertyUpdate: this.handlePropertyUpdate.bind(this),
        logger: console
      },
      name: "quizz"
    });

    return flow;
  }

  setupObservers() {
    this.propertyBuffer.getBufferedUpdates().subscribe(updates => {
      const filteredUpdates = updates.filter(update => !this.isMetaProperty(update.propertyId));
      
      filteredUpdates.forEach(update => {
        this.session.assert(new PropertyUpdate(update.deviceId, update.nodeId, update.propertyId, update.value));
      });

      if (filteredUpdates.length > 0) {
        this.session.match();
      }
    });
  }

  isMetaProperty(propertyId) {
    return propertyId.startsWith('$');
  }

  handlePropertyUpdate(update) {
    if (this.isMetaProperty(update.propertyId)) {
      return; // Ignore meta properties
    }

    let player = this.players.get(update.nodeId);
    
    if (!player) {
      player = new PlayerNode(update.deviceId, update.nodeId, {});
      this.players.set(update.nodeId, player);
    }

    player.properties[update.propertyId] = update.value;

    log.debug(`Updating player property: ${update.nodeId}/${update.propertyId} = ${update.value}`);

    if (update.propertyId === 'terminal-id') {
      this.updateTerminalToPlayerMap(player, update.value);
    }

    if (update.propertyId === 'active' || update.propertyId === 'team-id' || !player.properties['active']) {
      this.teamLayout.renderPlayers(this.players);
    } else if (update.propertyId === 'animation-mixer') {
      this.updatePlayerAnimation(player);
    } 
  }



  updatePlayerAnimation(player) {
    const playerEntity = this.parentElement.querySelector(`#${player.nodeId}`);
    if (playerEntity) {
      playerEntity.setAttribute('animation-mixer', player.properties['animation-mixer']);
      log.debug(`Updated animation for player ${player.nodeId}: ${player.properties['animation-mixer']}`);
    }
  }

  updateTerminalToPlayerMap(player, terminalId) {
    // Remove old mapping if exists
    for (let [key, value] of this.terminalToPlayerMap) {
      if (value === player.nodeId) {
        this.terminalToPlayerMap.delete(key);
        break;
      }
    }
    // Add new mapping
    this.terminalToPlayerMap.set(terminalId, player.nodeId);
    log.debug(`Updated terminal-to-player mapping: Terminal ${terminalId} -> Player ${player.nodeId}`);
  }

}

export default QuizzSceneController;