import { HomieDevice, HomieNode, HomieProperty, createMqttHomieObserver } from '@cmcrobotics/homie-lit';


/**
 * The BridgeProxy controls a radio bridge Microbit and multiple wireless Microbit terminals, 
 * using the WebUSB serial port as a communication medium.
 */
class SerialBridgeProxy {
  constructor(homieObserver) {
    this.homieObserver = homieObserver;
    this.terminals = new Map();
    this.currentMode = 'SENSOR';
    this.buffer = '';
    this.writer = null;
    this.propagateReleasedButton = true;
    this.setupWebUSB();
  }

  async getSerialPort() {
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

  async setupWebUSB() {
    try {
      const port = await this.getSerialPort();
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
    const [prefix, terminalId, ...values] = data.split(',');
    if (!terminalId || values.length === 0) {
      console.log('Invalid data, ignoring:', data);
      return;
    }

    const deviceId = `terminal-${terminalId}`;
    let terminal = this.terminals.get(deviceId);
    if (!terminal) {
      terminal = this.createTerminalDevice(deviceId);
      this.terminals.set(deviceId, terminal);
    }

    if (prefix === 'VOTE' && this.currentMode === 'VOTING') {
      this.processVote(terminal, values[0]);
    } else if (prefix === 'SENS' && this.currentMode === 'SENSOR') {
      this.processSensorData(terminal, values);
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

  processSensorData(terminal, values) {
    const timestamp = new Date().toISOString();

    // Handle button press if it's a button value
    if (values[0].toLowerCase() === 'a' || values[0].toLowerCase() === 'b') {
      const buttonNodeId = `button-${values[0].toLowerCase()}`;
      const buttonNode = terminal.getNode(buttonNodeId);
      if (buttonNode) {
        const stateProperty = buttonNode.getProperty('state');
        const timestampProperty = buttonNode.getProperty('timestamp');

        stateProperty.setValue('pressed');
        timestampProperty.setValue(timestamp);

        this.publishProperty(terminal.id, buttonNodeId, stateProperty);
        this.publishProperty(terminal.id, buttonNodeId, timestampProperty);

        if(this.propagateReleasedButton){
          setTimeout(() => {
            stateProperty.setValue('released');
            this.publishProperty(terminal.id, buttonNodeId, stateProperty);
          }, 500);
        }
        return;
      }
    }

    // Handle environmental sensor data
    const [sensorType, value] = values;
    const sensorNodes = {
      'TEMP': 'temperature',
      'SOUND': 'sound',
      'LIGHT': 'light'
    };

    const nodeId = sensorNodes[sensorType];
    if (nodeId) {
      const node = terminal.getNode(nodeId);
      if (node) {
        const valueProperty = node.getProperty('value');
        const timestampProperty = node.getProperty('timestamp');

        valueProperty.setValue(value);
        timestampProperty.setValue(timestamp);

        this.publishProperty(terminal.id, nodeId, valueProperty);
        this.publishProperty(terminal.id, nodeId, timestampProperty);
      }
    }
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

    // Create temperature node
    const temperatureNode = new HomieNode('temperature', 'Temperature Sensor');
    temperatureNode.addProperty(new HomieProperty('value', 'Temperature', undefined, 'float', '-40:125'));
    temperatureNode.addProperty(new HomieProperty('timestamp', 'Timestamp', undefined, 'datetime', 'ISO 8601'));
    terminal.addNode(temperatureNode);

    // Create sound level node
    const soundNode = new HomieNode('sound', 'Sound Level Sensor');
    soundNode.addProperty(new HomieProperty('value', 'Sound Level', undefined, 'integer', '0:255'));
    soundNode.addProperty(new HomieProperty('timestamp', 'Timestamp', undefined, 'datetime', 'ISO 8601'));
    terminal.addNode(soundNode);

    // Create light level node
    const lightNode = new HomieNode('light', 'Light Level Sensor');
    lightNode.addProperty(new HomieProperty('value', 'Light Level', undefined, 'integer', '0:255'));
    lightNode.addProperty(new HomieProperty('timestamp', 'Timestamp', undefined, 'datetime', 'ISO 8601'));
    terminal.addNode(lightNode);
    
    // Publish device and nodes
    this.publishTerminalDevice(terminal);

    return terminal;
  }

  publishTerminalDevice(terminal) {
    const baseTopic = `${terminal.id}`;
    
    // Publish device properties
    this.homieObserver.publish(`${baseTopic}/$homie`, '4.0', { retain: true });
    this.homieObserver.publish(`${baseTopic}/$name`, `Terminal ${terminal.id.split('-')[1]}`, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$nodes`, 'vote,button-a,button-b,temperature,sound,light', { retain: true });
    this.homieObserver.publish(`${baseTopic}/$extensions`, '', { retain: true });
    this.homieObserver.publish(`${baseTopic}/$implementation`, 'custom', { retain: true });

    // Publish nodes
    terminal.nodes.forEach(node => {
      this.publishNode(terminal.id, node);
    });
  }

  publishNode(deviceId, node) {
    const baseTopic = `${deviceId}/${node.id}`;
    
    this.homieObserver.publish(`${baseTopic}/$name`, node.name, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$type`, node.id, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$properties`, node.properties.keys().toArray().join(','), { retain: true });

    // Publish properties for this node
    Object.values(node.properties).forEach(property => {
      this.publishPropertyAttributes(deviceId, node.id, property);
    });
  }

  publishPropertyAttributes(deviceId, nodeId, property) {
    const baseTopic = `${deviceId}/${nodeId}/${property.id}`;
    
    this.homieObserver.publish(`${baseTopic}/$name`, property.name, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$datatype`, property.datatype, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$format`, property.format, { retain: true });
  }

  publishProperty(deviceId, nodeId, property) {
    const topic = `${deviceId}/${nodeId}/${property.id}`;
    this.homieObserver.publish(topic, property.getValue().toString(), { retain: true });
  }

  /**
   * Switch the bridge 
   * @param {string} newMode The mode the gateway needs to switch to (either VOTING or SENSOR).
   */
  async switchMode(newMode) {
    if (newMode !== 'VOTING' && newMode !== 'SENSOR') {
      console.error('Invalid mode:', newMode);
      return;
    }

    // if (newMode === this.currentMode) {
    //   console.log(`Already in ${newMode} mode`);
    //   return;
    // }

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

async function initialize(mqttUrl) {
    const homieObserver = createMqttHomieObserver(mqttUrl);

    homieObserver.subscribe("homie/terminal-+/#");

    const bridgeProxy = new SerialBridgeProxy(homieObserver);

    return bridgeProxy;
}

export {initialize, SerialBridgeProxy};
