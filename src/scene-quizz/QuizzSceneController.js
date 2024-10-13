import { createMqttHomieObserver, HomiePropertyBuffer, logger as homieLogger } from '@cmcrobotics/homie-lit';
import PropertyUpdate from '../homie-lit-components/PropertyUpdate';
import TeamLayout from '../homie-lit-components/TeamLayout';
import { questionDisplayTemplate } from './questionDisplayTemplate';
import * as nools from 'nools';
import log from 'loglevel';
import { html, render } from 'lit-html';

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
    this.playerSayEntities = new Map();
    this.teamLayout = new TeamLayout(this.teamParentElement);
    

    this.flow = this.initNoolsFlow();
    this.session = this.flow.getSession();

    this.setupObservers();
    this.teamLayout.createTeamLayouts();
    
    this.currentVote = null;
    this.questionDisplayElement = document.createElement('a-entity');
    this.questionDisplayElement.setAttribute('id', 'questionDisplay');
    this.questionParentElement.appendChild(this.questionDisplayElement);

    this.emoji = '🎁';
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


      rule ProcessTerminalVoteUpdate {
        when {
          update: PropertyUpdate update.deviceId.startsWith('terminal-') && update.nodeId === 'vote' && update.propertyId === 'option'
        }
        then {
          handleTerminalVoteUpdate(update);
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
        handleTerminalVoteUpdate: this.handleTerminalVoteUpdate.bind(this),
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

  handleTerminalVoteUpdate(update) {
    const terminalId = update.deviceId.split('-')[1]; // remove the "terminal-" prefix
    log.debug(`Received vote from terminal: ${terminalId}, option: ${update.value}`);
    this.displayEmoji(terminalId);
  }

displayEmoji(terminalId) {
    const playerNodeId = this.terminalToPlayerMap.get(terminalId);

    if (playerNodeId) {
      const playerEntity = this.teamParentElement.querySelector(`#${playerNodeId}`);
      if (playerEntity) {
        this.renderEmojiEntity(playerEntity, playerNodeId);
      }
    }
  }

  renderEmojiEntity(playerEntity, playerNodeId) {
    const template = this.createEmojiTemplate(playerNodeId);
    
    let sayEntity = this.playerSayEntities.get(playerNodeId);
    if (!sayEntity) {
      sayEntity = document.createElement('a-entity');
      sayEntity.setAttribute('id', `${playerNodeId}-say`);
      playerEntity.appendChild(sayEntity);
      this.playerSayEntities.set(playerNodeId, sayEntity);
    }

    render(template, sayEntity);
    
    // Make the entity visible
    sayEntity.setAttribute('visible', 'true');
    
    // Hide the entity after 5 seconds
    // setTimeout(() => {
    //   sayEntity.setAttribute('visible', 'false');
    // }, 5000);
  }

  createEmojiTemplate(playerNodeId) {
    return html`
      <a-entity
        face-target="#camera"
        scale="16 16 16"
        position="0 4.8 0.5"
        htmlembed
      >
        <div id="${playerNodeId}-bubble" style="background: #ffffff; border-radius: 20%; padding: 2px; text-align: center;">
          <span>${this.emoji}</span>
        </div>
      </a-entity>
    `;
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