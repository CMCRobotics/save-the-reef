#!/usr/bin/env node

const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const yaml = require('js-yaml');
const fs = require('fs');

// MQTT broker URL - replace with your actual MQTT broker URL
const brokerUrl = 'mqtt://localhost:1883';

// Function to read YAML file
function readYamlFile(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContents);
    return data;
  } catch (e) {
    console.log(e);
    return null;
  }
}

// Function to create and publish vote device
function createVoteDevice(question) {
  const client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log('Connected to MQTT broker');

    const deviceId = `vote-${uuidv4()}`;
    const baseTopic = 'homie/'+deviceId;

    // Publish device properties
    client.publish(`${baseTopic}/$homie`, '4.0', { retain: true });
    client.publish(`${baseTopic}/$name`, `Vote ${question['question-id']}`, { retain: true });
    client.publish(`${baseTopic}/$nodes`, 'config', { retain: true });

    // Publish config node properties
    client.publish(`${baseTopic}/config/$name`, 'Vote Configuration', { retain: true });
    client.publish(`${baseTopic}/config/$type`, 'vote-config', { retain: true });
    client.publish(`${baseTopic}/config/$properties`, 'question-id,question-statement,option-1,option-2,option-3,option-4,correct-option,state', { retain: true });

    // Publish question-id property
    client.publish(`${baseTopic}/config/question-id`, question['question-id'], { retain: true });
    client.publish(`${baseTopic}/config/question-id/$name`, 'Question ID', { retain: true });
    client.publish(`${baseTopic}/config/question-id/$datatype`, 'string', { retain: true });
    client.publish(`${baseTopic}/config/question-id/$settable`, 'false', { retain: true });

    // Publish question-statement property
    client.publish(`${baseTopic}/config/question-statement`, question['question-statement'], { retain: true });
    client.publish(`${baseTopic}/config/question-statement/$name`, 'Question Statement', { retain: true });
    client.publish(`${baseTopic}/config/question-statement/$datatype`, 'string', { retain: true });
    client.publish(`${baseTopic}/config/question-statement/$settable`, 'false', { retain: true });

    // Publish individual option properties
    for (let i = 1; i <= 4; i++) {
      const optionKey = `option-${i}`;
      client.publish(`${baseTopic}/config/${optionKey}`, question[optionKey], { retain: true });
      client.publish(`${baseTopic}/config/${optionKey}/$name`, `Option ${i}`, { retain: true });
      client.publish(`${baseTopic}/config/${optionKey}/$datatype`, 'string', { retain: true });
      client.publish(`${baseTopic}/config/${optionKey}/$settable`, 'false', { retain: true });
    }

    // Publish correct-option property
    client.publish(`${baseTopic}/config/correct-option`, question['correct-option'].toString(), { retain: true });
    client.publish(`${baseTopic}/config/correct-option/$name`, 'Correct Option', { retain: true });
    client.publish(`${baseTopic}/config/correct-option/$datatype`, 'integer', { retain: true });
    client.publish(`${baseTopic}/config/correct-option/$settable`, 'false', { retain: true });
    client.publish(`${baseTopic}/config/correct-option/$format`, '1:4', { retain: true });

    // Publish state property
    client.publish(`${baseTopic}/config/state`, 'ready', { retain: true });
    client.publish(`${baseTopic}/config/state/$name`, 'State', { retain: true });
    client.publish(`${baseTopic}/config/state/$datatype`, 'enum', { retain: true });
    client.publish(`${baseTopic}/config/state/$settable`, 'true', { retain: true });
    client.publish(`${baseTopic}/config/state/$format`, 'ready,active,finished', { retain: true });

    console.log(`Vote device created with ID: ${deviceId}`);
    console.log('Question ID:', question['question-id']);
    console.log('Question Statement:', question['question-statement']);
    console.log('Options:');
    for (let i = 1; i <= 4; i++) {
      console.log(`  Option ${i}:`, question[`option-${i}`]);
    }
    console.log('Correct Option:', question['correct-option']);

    client.end();
  });

  client.on('error', (error) => {
    console.error('Error:', error);
    client.end();
  });
}

// Main execution
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node create-vote-device.js <path-to-yaml-file> <question-index>');
  process.exit(1);
}

const yamlFilePath = args[0];
const questionIndex = parseInt(args[1]);

const voteConfig = readYamlFile(yamlFilePath);
if (!voteConfig || !voteConfig.questions || questionIndex >= voteConfig.questions.length) {
  console.log('Invalid YAML file or question index');
  process.exit(1);
}

const selectedQuestion = voteConfig.questions[questionIndex];
createVoteDevice(selectedQuestion);