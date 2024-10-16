import { createMqttHomieObserver, HomiePropertyBuffer, logger as homieLogger } from '@cmcrobotics/homie-lit';
import PropertyUpdate from '../homie-lit-components/PropertyUpdate';
import TeamLayout from '../homie-lit-components/TeamLayout';
import nools from 'nools';
import log from 'loglevel';

class PlayerNode {
  constructor(deviceId, nodeId, properties) {
    this.deviceId = deviceId;
    this.nodeId = nodeId;
    this.properties = properties;
    this.currentSkinIndex = 0;
    this.currentAnimationIndex = 0;
  }
}

class GameState {
  constructor() {
    this.currentMode = 'skin';
  }
}

class TutorialSceneController {
  constructor(brokerUrl, parentElementId, mqttOptions = {}) {
    this.setupLogging();
    this.homieObserver = createMqttHomieObserver(brokerUrl, mqttOptions);
    this.homieObserver.subscribe("#");
    this.parentElement = document.getElementById(parentElementId);
    this.propertyBuffer = new HomiePropertyBuffer(this.homieObserver, 300);
    this.players = new Map();
    this.terminalToPlayerMap = new Map();
    this.teamLayout = new TeamLayout(this.parentElement);
    this.gameState = new GameState();
    
    this.SKINS = [
      "alienA","alienB","animalA","animalB","animalBaseA","animalBaseB","animalBaseC","animalBaseD","animalBaseE","animalBaseF"
      ,"animalBaseG","animalBaseH","animalBaseI","animalBaseJ","animalC","animalD","animalE","animalF","animalG","animalH","animalI"
      ,"animalJ","astroFemaleA","astroFemaleB","astroMaleA","astroMaleB"
      ,"athleteFemaleBlue","athleteFemaleGreen","athleteFemaleRed","athleteFemaleYellow","athleteMaleBlue","athleteMaleGreen"
      ,"athleteMaleRed","athleteMaleYellow"
      ,"businessMaleA","businessMaleB"
      ,"casualFemaleA","casualFemaleB","casualMaleA","casualMaleB","cyborg"
      ,"fantasyFemaleA","fantasyFemaleB","fantasyMaleA","fantasyMaleB","farmerA","farmerB"
      ,"militaryFemaleA","militaryFemaleB","militaryMaleA","militaryMaleB"
      ,"racerBlueFemale","racerBlueMale","racerGreenFemale","racerGreenMale","racerOrangeFemale","racerOrangeMale"
      ,"racerPurpleFemale","racerPurpleMale","racerRedFemale","racerRedMale","robot","robot2","robot3"
      ,"survivorFemaleA","survivorFemaleB","survivorMaleA","survivorMaleB","zombieA","zombieB","zombieC"
  ];
    this.ANIMATIONS = ['Idle', 'Walk', 'Run', 'CrouchWalk'];


    this.initNoolsFlow();
    this.setupObservers();
    this.teamLayout.createTeamLayouts();
    this.createModeToggle();
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

      rule ProcessStateMachineUpdate {
        when {
          update: PropertyUpdate update.deviceId == 'gateway' && 
                                   update.nodeId == 'state-machine' && 
                                   update.propertyId == 'current-state'
        }
        then {
          handleStateMachineUpdate(update);
        }
      }

      rule ProcessButtonPress {
        when {
          update: PropertyUpdate update.deviceId.startsWith('terminal-') && 
                                   (update.nodeId == 'button-a' || update.nodeId == 'button-b') && 
                                   update.propertyId == 'state' &&
                                   update.value == 'pressed'
        }
        then {
          handleButtonPress(update);
        }
      }
    `;

    this.flow = nools.compile(flowDef, {
      name: "tutorialScene",
      define: {
        PropertyUpdate: PropertyUpdate,
        PlayerNode: PlayerNode,
        GameState: GameState
      },
      scope: {
        handlePropertyUpdate: this.handlePropertyUpdate.bind(this),
        handleStateMachineUpdate: this.handleStateMachineUpdate.bind(this),
        handleButtonPress: this.handleButtonPress.bind(this)
      }
    });

    this.session = this.flow.getSession(this.gameState);
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
    } else if (update.propertyId === 'skin') {
      this.updatePlayerSkin(player);
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

  handleStateMachineUpdate(update) {
    if (update.value === 'skin' || update.value === 'animation') {
      this.gameState.currentMode = update.value;
      log.info(`Game mode changed to: ${this.gameState.currentMode}`);
      this.updateModeToggle();
    }
  }

  handleButtonPress(update) {
    const terminalId = update.deviceId.split('-')[1];
    const playerNodeId = this.terminalToPlayerMap.get(terminalId);
    const player = playerNodeId ? this.players.get(playerNodeId) : null;

    if (player) {
      if (this.gameState.currentMode === 'skin') {
        this.cycleSkin(player, (update.nodeId === 'button-a'? 1 : -1) );
      } else if (this.gameState.currentMode === 'animation') {
        this.cycleAnimation(player,  (update.nodeId === 'button-a'? 1 : -1));
      }
    } else {
      log.warn(`Button press on terminal ${terminalId} doesn't map to any player`);
    }
  }

  cycleSkin(player, direction) {
    const currentIndex = this.SKINS.indexOf(player.properties.skin);
    const newIndex = Math.max(0,(currentIndex + direction) % this.SKINS.length);
    const newSkin = this.SKINS[newIndex];
    this.updatePlayerProperty(player.nodeId, 'skin', newSkin);
  }

  cycleAnimation(player, direction) {
    const currentAnimationMixer = player.properties['animation-mixer'] || 'clip: Idle; loop: repeat';
    const currentAnimation = currentAnimationMixer.split(';')[0].split(':')[1].trim();
    const currentIndex = this.ANIMATIONS.indexOf(currentAnimation);
    const newIndex = Math.max(0,(currentIndex + direction) % this.ANIMATIONS.length);
    const newAnimation = this.ANIMATIONS[newIndex];
    const newAnimationMixer = `clip: ${newAnimation}; loop: repeat`;
    this.updatePlayerProperty(player.nodeId, 'animation-mixer', newAnimationMixer);
  }

  updatePlayerProperty(playerNodeId, propertyId, value) {
    const topic = `gateway/${playerNodeId}/${propertyId}`;
    this.homieObserver.publish(topic, value);
    log.info(`Published update for player ${playerNodeId}: ${propertyId} = ${value}`);
  }

  updatePlayerAnimation(player) {
    const playerEntity = this.parentElement.querySelector(`#${player.nodeId}`);
    if (playerEntity) {
      playerEntity.setAttribute('animation-mixer', player.properties['animation-mixer']);
      log.debug(`Updated animation for player ${player.nodeId}: ${player.properties['animation-mixer']}`);
    }
  }

  updatePlayerSkin(player) {
    const playerEntity = this.parentElement.querySelector(`#${player.nodeId}`);
    if (playerEntity) {
      playerEntity.setAttribute('texture-map', `src: assets/players/skins/${player.properties.skin}.png`);
      log.debug(`Updated skin for player ${player.nodeId}: ${player.properties.skin}`);
    }
  }

  createModeToggle() {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'mode-toggle';
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '10px';
    toggleButton.style.left = '10px';
    toggleButton.style.zIndex = '1000';
    this.updateModeToggle(toggleButton);

    toggleButton.addEventListener('click', () => {
      const newMode = this.gameState.currentMode === 'skin' ? 'animation' : 'skin';
      this.updateStateMachine(newMode);
    });

    document.body.appendChild(toggleButton);
  }

  updateModeToggle(button = document.getElementById('mode-toggle')) {
    if (button) {
      button.textContent = `Mode: ${this.gameState.currentMode}`;
    }
  }

  updateStateMachine(newState) {
    const topic = 'gateway/state-machine/current-state';
    this.homieObserver.publish(topic, newState);
    log.info(`Published state machine update: current-state = ${newState}`);
  }

}

export default TutorialSceneController;