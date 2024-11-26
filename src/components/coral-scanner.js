/* global AFRAME */

import { createMqttHomieObserver } from '@cmcrobotics/homie-lit';
import log from 'loglevel';

// Initialize logging
log.setLevel("info");

AFRAME.registerComponent('coral-scanner', {
  schema: {
    brokerUrl: { type: 'string', default: 'ws://localhost:9001' },
    deviceId: { type: 'string', default: 'reef-X' }
  },

  init() {
    log.info('Initializing coral-scanner component');
    
    // Initialize the Homie observer
    this.homieObserver = createMqttHomieObserver(this.data.brokerUrl);
    
    // Wait for the scene to fully load
    if (this.el.sceneEl.hasLoaded) {
      this.scanCorals();
    } else {
      this.el.sceneEl.addEventListener('loaded', () => this.scanCorals());
    }
  },

  scanCorals() {
    log.info('Starting coral scan');
    
    // Get all coral entities
    const coralEntities = document.querySelectorAll('a-coral');
    
    coralEntities.forEach((coral, index) => {
      // Get coral position
      const position = coral.object3D.position;
      const positionData = {
        x: position.x,
        y: position.y,
        z: position.z
      };

      // Get coral species (assuming it's set as an attribute)
      const species = coral.getAttribute('species') || 'acropora-cervicornis';
      
      // Generate unique coral ID
      const coralId = `coral-${index + 1}`;
      
      // Create Homie node topic structure
      const baseTopic = `${this.data.deviceId}/${coralId}`;
      
      log.debug('Creating Homie node for coral:', {
        coralId,
        species,
        position: positionData
      });

      // Publish initial coral properties
      this.publishCoralProperties(baseTopic, {
        visible: true,
        position: positionData,
        species: species,
        health: 100,
        'growth-index': 1.0,
        'growth-rate': 10.0,
        bleaching: 0
      });

      // Set up position update listener
      coral.addEventListener('componentchanged', (event) => {
        if (event.detail.name === 'position') {
          const newPosition = coral.object3D.position;
          this.updateCoralPosition(baseTopic, {
            x: newPosition.x,
            y: newPosition.y,
            z: newPosition.z
          });
        }
      });
    });

    log.info(`Scanned ${coralEntities.length} coral entities`);
  },

  publishCoralProperties(baseTopic, properties) {
    Object.entries(properties).forEach(([property, value]) => {
      const topic = `${baseTopic}/${property}`;
      const message = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      log.debug('Publishing coral property:', {
        topic,
        value: message
      });

      this.homieObserver.publish(topic, message);
    });
  },

  updateCoralPosition(baseTopic, position) {
    this.publishCoralProperties(baseTopic, {
      position: position
    });
  },

  remove() {
    log.info('Removing coral-scanner component');
    // Clean up any resources if needed
  }
});