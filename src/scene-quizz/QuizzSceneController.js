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

    this.revealButton = null;
    this.playerAnswers = new Map();
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

      rule ProcessPlayerVote {
        when {
          update: PropertyUpdate update.deviceId.startsWith('terminal-') && update.nodeId === 'vote' && update.propertyId === 'option' && update.value.trim().length != 0
        }
        then {
          handlePlayerVote(update);
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
        handlePlayerVote: this.handlePlayerVote.bind(this),
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

    if (update.propertyId === 'correct-option') {
      this.currentVote.correctOption = update.value;
    }


    if (update.propertyId === 'question-statement' || 
        update.propertyId === 'option-1' || 
        update.propertyId === 'option-2' || 
        update.propertyId === 'option-3' || 
        update.propertyId === 'option-4') {
      this.updateQuestionDisplay();
      this.createRevealButton();
    }

    log.debug(`Updating vote property: ${update.deviceId}/${update.propertyId} = ${update.value}`);
  }

  handlePlayerVote(update) {
    const terminalId = update.deviceId.split('-')[1];
    const playerNodeId = this.terminalToPlayerMap.get(terminalId);
    if (playerNodeId) {
      this.playerAnswers.set(playerNodeId, update.value);
    }
    this.handleTerminalVoteUpdate(update);
  }

  createRevealButton() {
    if (!this.revealButton) {
      this.revealButton = document.createElement('button');
      this.revealButton.id = 'mode-toggle';
      this.revealButton.style.position = 'absolute';
      this.revealButton.style.top = '10px';
      this.revealButton.style.left = '10px';
      this.revealButton.style.zIndex = '1000';
      this.revealButton.textContent = 'Reveal Results';
      this.revealButton.addEventListener('click', () => this.revealResults());
      document.body.appendChild(this.revealButton);
    }
  }

  createNextButton() {
    if (!this.nextButton) {
      this.nextButton = document.createElement('button');
      this.nextButton.id = 'next-button';
      this.nextButton.style.position = 'absolute';
      this.nextButton.style.top = '10px';
      this.nextButton.style.left = '120px';
      this.nextButton.style.zIndex = '1000';
      this.nextButton.textContent = 'Next Question';
      this.nextButton.style.display = 'none';
      this.nextButton.addEventListener('click', () => this.prepareNextQuestion());
      document.body.appendChild(this.nextButton);
    }
  }


  revealResults() {
    if (this.currentVote && this.currentVote.correctOption) {
      this.highlightCorrectAnswer();
      this.updatePlayerFeedback();
      this.showNextButton();
    }
  }

  showNextButton() {
    if (this.nextButton) {
      this.nextButton.style.display = 'block';
    } else {
      this.createNextButton();
      this.nextButton.style.display = 'block';
    }
  }

  prepareNextQuestion() {
    this.resetPlayerAnimations();
    this.clearPlayerVotes();
    this.clearAllEmojis();
    this.hideNextButton();
    this.clearQuestionDisplay();
  }

  clearAllEmojis() {
    this.playerSayEntities.forEach((sayEntity, playerNodeId) => {
      if (sayEntity) {
        sayEntity.setAttribute('visible', 'false');
        render(html``, sayEntity);  // Clear the content of the say entity
      }
    });
    log.debug('Cleared all player emojis');
  }

  resetPlayerAnimations() {
    this.players.forEach((player, nodeId) => {
      this.updatePlayerAnimationLocally(nodeId, "clip: Idle; loop: repeat");
    });
  }

  clearPlayerVotes() {
    this.terminalToPlayerMap.forEach((playerNodeId, terminalId) => {
      this.clearTerminalVote(terminalId);
    });
    this.playerAnswers.clear();
  }

  clearTerminalVote(terminalId) {
    const deviceId = `terminal-${terminalId}`;
    const nodeId = 'vote';
    const propertyId = 'option';
    const value = undefined;

    // Publish MQTT message to clear the vote
    this.homieObserver.publish(`${deviceId}/${nodeId}/${propertyId}`, value);
  }

  hideNextButton() {
    if (this.nextButton) {
      this.nextButton.style.display = 'none';
    }
  }

  clearQuestionDisplay() {
    render(html``, this.questionDisplayElement);
    this.currentVote = null;
  }

  highlightCorrectAnswer() {
    const correctOptionIndex = parseInt(this.currentVote.correctOption) - 1;
    const updatedTemplate = questionDisplayTemplate(
      this.currentVote.properties['question-statement'],
      [
        this.currentVote.properties['option-1'],
        this.currentVote.properties['option-2'],
        this.currentVote.properties['option-3'],
        this.currentVote.properties['option-4']
      ],
      correctOptionIndex
    );
    render(updatedTemplate, this.questionDisplayElement);
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

  updatePlayerFeedback() {
    this.playerAnswers.forEach((answer, playerNodeId) => {
      const isCorrect = ((parseInt(answer)+1) === parseInt(this.currentVote.correctOption));
      const emoji = isCorrect ? '🟩' : '❌';
      this.updatePlayerEmoji(playerNodeId, emoji);
      
      if (!isCorrect) {
        this.updatePlayerAnimationLocally(playerNodeId, "clip: Death; loop: once; clampWhenFinished: true");
        setTimeout(() => {
          this.updatePlayerAnimationLocally(playerNodeId, "clip: Idle; loop: repeat");
        }, 5000); // Reset to Idle after 5 seconds
      }
    });
  }


  updatePlayerEmoji(playerNodeId, emoji) {
    const playerEntity = this.teamParentElement.querySelector(`#${playerNodeId}`);
    if (playerEntity) {
      const template = html`
        <a-entity
          face-target="#camera"
          scale="16 16 16"
          position="0 4.8 0.5"
          htmlembed
        >
          <div id="${playerNodeId}-bubble" style="background: #ffffff; border-radius: 20%; padding: 2px; text-align: center;">
            <span>${emoji}</span>
          </div>
        </a-entity>
      `;
      let sayEntity = this.playerSayEntities.get(playerNodeId);
      if (!sayEntity) {
        sayEntity = document.createElement('a-entity');
        sayEntity.setAttribute('id', `${playerNodeId}-say`);
        playerEntity.appendChild(sayEntity);
        this.playerSayEntities.set(playerNodeId, sayEntity);
      }
      render(template, sayEntity);
      sayEntity.setAttribute('visible', 'true');
    }
  }

  updatePlayerAnimationLocally(playerNodeId, animationValue) {
    const playerEntity = this.teamParentElement.querySelector(`#${playerNodeId}`);
    if (playerEntity) {
      playerEntity.setAttribute('animation-mixer', animationValue);
      log.debug(`Updated animation for player ${playerNodeId}: ${animationValue}`);
    }
  }

  updatePlayerAnimation(player) {
    const playerEntity = this.teamParentElement.querySelector(`#${player.nodeId}`);
    if (playerEntity) {
      playerEntity.setAttribute('animation-mixer', player.properties['animation-mixer']);
      log.debug(`Updated animation for player ${player.nodeId}: ${player.properties['animation-mixer']}`);
    }
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