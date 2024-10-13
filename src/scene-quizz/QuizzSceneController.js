import { createMqttHomieObserver, HomiePropertyBuffer, logger as homieLogger } from '@cmcrobotics/homie-lit';
import PropertyUpdate from '../homie-lit-components/PropertyUpdate';
import TeamLayout from '../homie-lit-components/TeamLayout';
import { questionDisplayTemplate } from './questionDisplayTemplate';
import * as nools from 'nools';
import log from 'loglevel';
import { render } from 'lit-html';

class PlayerNode {
  constructor(deviceId, nodeId, properties) {
    this.deviceId = deviceId;
    this.nodeId = nodeId;
    this.properties = properties;
  }
}

class QuizzSceneController {
  constructor(brokerUrl, teamParentElementId, questionParentElementId, mqttOptions = {}) {
    this.setupLogging();
    this.homieObserver = createMqttHomieObserver(brokerUrl, mqttOptions);
    this.homieObserver.subscribe("#");
    this.teamParentElement = document.getElementById(teamParentElementId);
    this.questionParentElement = document.getElementById(questionParentElementId);
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver, 300);
    this.players = new Map();
    this.terminalToPlayerMap = new Map();
    this.teamLayout = new TeamLayout(this.teamParentElement);

    this.flow = this.initNoolsFlow();
    this.session = this.flow.getSession();

    this.setupObservers();
    this.teamLayout.createTeamLayouts();
    
    this.currentVote = null;
    this.questionDisplayElement = document.createElement('a-entity');
    this.questionDisplayElement.setAttribute('id', 'questionDisplay');
    this.questionParentElement.appendChild(this.questionDisplayElement);
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

      rule ProcessVoteUpdate {
        when {
          update: PropertyUpdate update.deviceId.startsWith('vote-')
        }
        then {
          handleVoteUpdate(update);
        }
      }
    `, {
      define: {
        PropertyUpdate: PropertyUpdate,
        PlayerNode: PlayerNode
      },
      scope: {
        handlePropertyUpdate: this.handlePropertyUpdate.bind(this),
        handleVoteUpdate: this.handleVoteUpdate.bind(this),
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
      return;
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

  handleVoteUpdate(update) {
    if (this.isMetaProperty(update.propertyId)) {
      return;
    }

    if (!this.currentVote || this.currentVote.deviceId !== update.deviceId) {
      this.currentVote = { deviceId: update.deviceId, properties: {} };
    }

    this.currentVote.properties[update.propertyId] = update.value;

    if (update.propertyId === 'question-statement' || 
        update.propertyId === 'option-1' || 
        update.propertyId === 'option-2' || 
        update.propertyId === 'option-3' || 
        update.propertyId === 'option-4') {
      this.updateQuestionDisplay();
    }

    log.debug(`Updating vote property: ${update.deviceId}/${update.propertyId} = ${update.value}`);
  }

  updateQuestionDisplay() {
    if (this.currentVote && 
        this.currentVote.properties['question-statement'] && 
        this.currentVote.properties['option-1'] &&
        this.currentVote.properties['option-2'] &&
        this.currentVote.properties['option-3'] &&
        this.currentVote.properties['option-4']) {
      
      const question = this.currentVote.properties['question-statement'];
      const options = [
        this.currentVote.properties['option-1'],
        this.currentVote.properties['option-2'],
        this.currentVote.properties['option-3'],
        this.currentVote.properties['option-4']
      ];

      render(questionDisplayTemplate(question, options), this.questionDisplayElement);

      log.debug(`Updated question display: ${question}`);
      log.debug(`Options: ${options.join(', ')}`);
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
    for (let [key, value] of this.terminalToPlayerMap) {
      if (value === player.nodeId) {
        this.terminalToPlayerMap.delete(key);
        break;
      }
    }
    this.terminalToPlayerMap.set(terminalId, player.nodeId);
    log.debug(`Updated terminal-to-player mapping: Terminal ${terminalId} -> Player ${player.nodeId}`);
  }
}

export default QuizzSceneController;