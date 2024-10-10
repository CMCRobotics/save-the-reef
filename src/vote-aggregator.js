import { HomieDevice, HomieNode, HomieProperty, createMqttHomieObserver } from '@cmcrobotics/homie-lit';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

async function getSerialPort() {
    if ('serial' in navigator) {
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        return port;
      } catch (err) {
        console.error('There was an error opening the serial port:', err);
      }
    } else {
      console.error('Web Serial API not supported in this browser');
    }
    return null;
}

class Gateway {
  constructor(homieObserver) {
    this.homieObserver = homieObserver;
    this.terminals = new Map();
    this.currentMode = 'VOTING';
    this.buffer = '';
    this.writer = null;
    this.setupWebUSB();
  }

  async setupWebUSB() {
    try {
      const port = await getSerialPort();
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();
      
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
      this.writer = textEncoder.writable.getWriter();
      
      console.log('Connected to micro:bit');
      this.startReading();
    } catch (error) {
      console.error('Error connecting to micro:bit:', error);
    }
  }

  async startReading() {
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) {
          this.reader.releaseLock();
          break;
        }
        this.processIncomingData(value);
      }
    } catch (error) {
      console.error('Error reading from micro:bit:', error);
    }
  }

  processIncomingData(chunk) {
    this.buffer += chunk;
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      this.processData(line);
    }
  }

  processData(data) {
    const [prefix, terminalId, value] = data.split(',');
    if (!terminalId || !value) {
      console.error('Invalid data:', data);
      return;
    }

    const deviceId = `terminal-${terminalId}`;
    let terminal = this.terminals.get(deviceId);
    if (!terminal) {
      terminal = this.createTerminalDevice(deviceId);
      this.terminals.set(deviceId, terminal);
    }

    if (prefix === 'VOTE' && this.currentMode === 'VOTING') {
      this.processVote(terminal, value);
    } else if (prefix === 'SENS' && this.currentMode === 'SENSOR') {
      this.processSensorData(terminal, value);
    } else {
      console.error('Invalid prefix or mode mismatch:', prefix, this.currentMode);
    }
  }

  processVote(terminal, value) {
    const voteNode = terminal.getNode('vote');
    if (!voteNode) {
      console.error('Vote node not found for terminal:', terminal.id);
      return;
    }

    const optionProperty = voteNode.getProperty('option');
    const timestampProperty = voteNode.getProperty('timestamp');

    optionProperty.setValue(value);
    timestampProperty.setValue(new Date().toISOString());

    this.publishProperty(terminal.id, 'vote', optionProperty);
    this.publishProperty(terminal.id, 'vote', timestampProperty);
  }

  processSensorData(terminal, value) {
    const buttonNodeId = `button-${value.toLowerCase()}`;
    const buttonNode = terminal.getNode(buttonNodeId);
    if (!buttonNode) {
      console.error(`Button node not found for terminal: ${terminal.id}, button: ${value}`);
      return;
    }

    const stateProperty = buttonNode.getProperty('state');
    const timestampProperty = buttonNode.getProperty('timestamp');

    stateProperty.setValue('pressed');
    timestampProperty.setValue(new Date().toISOString());

    this.publishProperty(terminal.id, buttonNodeId, stateProperty);
    this.publishProperty(terminal.id, buttonNodeId, timestampProperty);

    // Reset the button state after a short delay
    setTimeout(() => {
      stateProperty.setValue('released');
      this.publishProperty(terminal.id, buttonNodeId, stateProperty);
    }, 500);
  }

  createTerminalDevice(deviceId) {
    const terminal = new HomieDevice(deviceId);
    
    // Create vote node
    const voteNode = new HomieNode('vote', 'Vote', 'vote');
    voteNode.addProperty(new HomieProperty('option','Option',undefined,'string','0,1,2,3'));
    voteNode.addProperty(new HomieProperty('timestamp','Timestamp',undefined, 'datetime','ISO 8601'));
    terminal.addNode(voteNode);

    // Create button nodes
    const buttonANode = new HomieNode('button-a', 'Button A');
    buttonANode.addProperty(new HomieProperty('state','State',undefined, 'enum','pressed,released'));
    buttonANode.addProperty(new HomieProperty('timestamp','Timestamp',undefined, 'datetime','ISO 8601'));
    terminal.addNode(buttonANode);

    const buttonBNode =  new HomieNode('button-b', 'Button B');
    buttonBNode.addProperty(new HomieProperty('state','State',undefined, 'enum','pressed,released'));
    buttonBNode.addProperty(new HomieProperty('timestamp','Timestamp',undefined, 'datetime','ISO 8601'));
    terminal.addNode(buttonBNode);
    
    // Publish device and nodes
    this.publishTerminalDevice(terminal);

    return terminal;
  }

  publishTerminalDevice(terminal) {
    const baseTopic = `homie/${terminal.id}`;
    
    // Publish device properties
    this.homieObserver.publish(`${baseTopic}/$homie`, '4.0', { retain: true });
    this.homieObserver.publish(`${baseTopic}/$name`, `Terminal ${terminal.id.split('-')[1]}`, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$nodes`, 'vote,button-a,button-b', { retain: true });
    this.homieObserver.publish(`${baseTopic}/$extensions`, '', { retain: true });
    this.homieObserver.publish(`${baseTopic}/$implementation`, 'custom', { retain: true });

    // Publish nodes
    terminal.nodes.forEach(node => {
      this.publishNode(terminal.id, node);
    });
  }

  publishNode(deviceId, node) {
    const baseTopic = `homie/${deviceId}/${node.id}`;
    
    this.homieObserver.publish(`${baseTopic}/$name`, node.name, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$type`, node.id, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$properties`, node.properties.keys().toArray().join(','), { retain: true });

    // Publish properties for this node
    Object.values(node.properties).forEach(property => {
      this.publishPropertyAttributes(deviceId, node.id, property);
    });
  }

  publishPropertyAttributes(deviceId, nodeId, property) {
    const baseTopic = `homie/${deviceId}/${nodeId}/${property.id}`;
    
    this.homieObserver.publish(`${baseTopic}/$name`, property.name, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$datatype`, property.datatype, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$format`, property.format, { retain: true });
  }

  publishProperty(deviceId, nodeId, property) {
    const topic = `homie/${deviceId}/${nodeId}/${property.id}`;
    this.homieObserver.publish(topic, property.getValue().toString(), { retain: true });
  }

  async switchMode(newMode) {
    if (newMode !== 'VOTING' && newMode !== 'SENSOR') {
      console.error('Invalid mode:', newMode);
      return;
    }

    if (newMode === this.currentMode) {
      console.log(`Already in ${newMode} mode`);
      return;
    }

    this.currentMode = newMode;
    console.log(`Switching to ${newMode} mode`);

    // Send mode change command to the bridge
    const command = `MODE:${newMode}\n`;
    await this.writer.write(command);

    // Publish mode change to MQTT for each terminal
    this.terminals.forEach(terminal => {
      this.homieObserver.publish(`homie/${terminal.id}/mode`, this.currentMode, { retain: true });
    });
  }
}

async function initializeGateway() {
    const mqttUrl = 'ws://localhost:9001';
    const homieObserver = createMqttHomieObserver(mqttUrl);

    homieObserver.subscribe("homie/terminal-+/#");

    const gateway = new Gateway(homieObserver);

    return gateway;
}

document.getElementById('connectButton').addEventListener('click', async () => {
    try {
        const gateway = await initializeGateway();
        document.getElementById('status').textContent = 'Connected successfully!';

        // Add mode switching buttons
        const votingButton = document.createElement('button');
        votingButton.textContent = 'Switch to Voting Mode';
        votingButton.addEventListener('click', () => gateway.switchMode('VOTING'));
        document.body.appendChild(votingButton);

        const sensorButton = document.createElement('button');
        sensorButton.textContent = 'Switch to Sensor Mode';
        sensorButton.addEventListener('click', () => gateway.switchMode('SENSOR'));
        document.body.appendChild(sensorButton);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = 'Connection failed: ' + error.message;
    }
});