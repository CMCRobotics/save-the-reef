#!/usr/bin/env node

const mqtt = require('mqtt');

const brokerUrl = 'mqtt://localhost:1883'; // Change this to your MQTT broker URL
const client = mqtt.connect(brokerUrl);

const skins = [
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
const nicknames = ['Joe', 'Jenny', 'Jim', 'Jeremy', 'Kelly', 'Kyle', 'Kirstin', 'Kalua'];
const terminalIds = [
  'fdb51be9acccbaac',
  '547b2ad2e9dc5ab9', // blue
  'f2c96411dbad4acc',
  'cfe6b123f9022a9a',


  '2393bc7881829fbc', //yellow
  '1ddde4169ebcd5bd',
  'af24e71c31acf07a',
  '00c7cbf325933992' // red
]

function createPlayer(index) {
  const playerId = `player-${index}`;
  const nickname = nicknames[index];
  const skin = skins[Math.floor(Math.random() * skins.length)]; // pick a random skin
  const terminalId = terminalIds[index];

  const baseTopic = `homie/gateway/${playerId}`;

  // Homie device properties
  client.publish(`${baseTopic}/$homie`, '4.0', { retain: true });
  client.publish(`${baseTopic}/$name`, `Player ${nickname}`, { retain: true });
  client.publish(`${baseTopic}/$state`, 'ready', { retain: true });
  client.publish(`${baseTopic}/$nodes`, 'properties', { retain: true });

  // Homie node properties
  client.publish(`${baseTopic}/$name`, 'Player Properties', { retain: true });
  client.publish(`${baseTopic}/$type`, 'player', { retain: true });
  

  // Property definitions
  const propertyDefinitions = {
    'team-id': { name: 'Player Team ID', datatype: 'string' },
    'terminal-id': { name: 'Player Terminal ID', datatype: 'string' },
    'active': { name: 'Active Status', datatype: 'boolean' },
    'nickname': { name: 'Player Nickname', datatype: 'string' },
    'skin': { name: 'Player Skin', datatype: 'string' },
    'animation-mixer': { name: 'Animation Mixer', datatype: 'string' },
    'animation-start': { name: 'Animation Start Time', datatype: 'string' },
    'animation-duration': { name: 'Animation Duration', datatype: 'integer', unit: 'seconds' }
  };
  client.publish(`${baseTopic}/$properties`, Object.keys(propertyDefinitions).join(','), { retain: true });

  Object.entries(propertyDefinitions).forEach(([prop, def]) => {
    client.publish(`${baseTopic}/${prop}/$name`, def.name, { retain: true });
    client.publish(`${baseTopic}/${prop}/$datatype`, def.datatype, { retain: true });
    if (def.unit) {
      client.publish(`${baseTopic}/${prop}/$unit`, def.unit, { retain: true });
    }
  });

  // Property values
  const properties = {
    'team-id': 'team-'+Math.floor((index/4)+1),
    'terminal-id': terminalId,
    'active': 'true',
    'nickname': nickname,
    'skin': skin,
    'animation-mixer': 'clip: Idle; loop:repeat',
    'animation-start': new Date().toISOString(),
    'animation-duration': '-1'
  };

  Object.entries(properties).forEach(([key, value]) => {
    client.publish(`${baseTopic}/${key}`, value.toString(), { retain: true });
  });

  console.log(`Created player: ${playerId} (${nickname}) with skin: ${skin}`);
}

client.on('connect', () => {
  console.log('Connected to MQTT broker');

  for (let i = 0; i < 8; i++) {
    createPlayer(i);
  }

  setTimeout(() => {
    client.end();
    console.log('Disconnected from MQTT broker');
  }, 1000);
});