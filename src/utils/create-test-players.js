#!/usr/bin/env node

const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');

const brokerUrl = 'mqtt://localhost:1883'; // Change this to your MQTT broker URL
const client = mqtt.connect(brokerUrl);

const skins = ['alienA', 'alienB', 'animalA', 'animalB'];
const nicknames = ['Joe', 'Sue', 'Mark', 'Albert'];

function createPlayer(index) {
  const playerId = `player-${uuidv4()}`;
  const nickname = nicknames[index];
  const skin = skins[index];

  const baseTopic = `homie/gateway/${playerId}`;

  // Homie device properties
  client.publish(`${baseTopic}/$homie`, '4.0', { retain: true });
  client.publish(`${baseTopic}/$name`, `Player ${nickname}`, { retain: true });
  client.publish(`${baseTopic}/$state`, 'ready', { retain: true });
  client.publish(`${baseTopic}/$nodes`, 'properties', { retain: true });

  // Homie node properties
  client.publish(`${baseTopic}/$name`, 'Player Properties', { retain: true });
  client.publish(`${baseTopic}/$type`, 'player', { retain: true });
  client.publish(`${baseTopic}/$properties`, 'active,nickname,skin,animation,animation-start,animation-duration', { retain: true });

  // Property definitions
  const propertyDefinitions = {
    'active': { name: 'Active Status', datatype: 'boolean' },
    'nickname': { name: 'Player Nickname', datatype: 'string' },
    'skin': { name: 'Player Skin', datatype: 'string' },
    'animation': { name: 'Current Animation', datatype: 'string' },
    'animation-start': { name: 'Animation Start Time', datatype: 'string' },
    'animation-duration': { name: 'Animation Duration', datatype: 'integer', unit: 'seconds' }
  };

  Object.entries(propertyDefinitions).forEach(([prop, def]) => {
    client.publish(`${baseTopic}/${prop}/$name`, def.name, { retain: true });
    client.publish(`${baseTopic}/${prop}/$datatype`, def.datatype, { retain: true });
    if (def.unit) {
      client.publish(`${baseTopic}/${prop}/$unit`, def.unit, { retain: true });
    }
  });

  // Property values
  const properties = {
    'active': 'true',
    'nickname': nickname,
    'skin': skin,
    'animation': 'idle',
    'animation-start': new Date().toISOString(),
    'animation-duration': '5'
  };

  Object.entries(properties).forEach(([key, value]) => {
    client.publish(`${baseTopic}/${key}`, value.toString(), { retain: true });
  });

  console.log(`Created player: ${playerId} (${nickname}) with skin: ${skin}`);
}

client.on('connect', () => {
  console.log('Connected to MQTT broker');

  for (let i = 0; i < 4; i++) {
    createPlayer(i);
  }

  setTimeout(() => {
    client.end();
    console.log('Disconnected from MQTT broker');
  }, 1000);
});