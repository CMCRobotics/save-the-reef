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

class VoteAggregator extends HomieDevice {
  constructor(homieObserver) {
    super('vote');
    this.buffer = '';
    this.homieObserver = homieObserver;
    this.setupWebUSB();
  }

  async setupWebUSB() {
    try {
      const port = await getSerialPort();
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();
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
      this.processCompleteLine(line);
    }
  }

  processCompleteLine(line) {
    console.log("Received complete vote:", line);
    this.processVote(line);
  }

  processVote(voteData) {
    const [prefix, terminalId, choice] = voteData.split(',');
    if (prefix !== 'VOTE:VOTE' || !terminalId || !choice) {
      console.error('Invalid vote data:', voteData);
      return;
    }

    let terminalNode = this.getNode(`terminal-${terminalId}`);
    if (!terminalNode) {
      terminalNode = this.createTerminalNode(terminalId);
    }

    const voteProperty = terminalNode.getProperty('vote');
    const timestampProperty = terminalNode.getProperty('timestamp');

    voteProperty.setValue(choice);
    timestampProperty.setValue(new Date().toISOString());

    // Publish updated properties
    this.publishProperty(terminalNode, voteProperty);
    this.publishProperty(terminalNode, timestampProperty);
  }

  createTerminalNode(terminalId) {
    const node = new HomieNode(`terminal-${terminalId}`, 'Terminal Vote');
    node.addProperty(new HomieProperty('vote', 'Vote', 'string'));
    node.addProperty(new HomieProperty('timestamp', 'Timestamp', 'datetime'));
    this.addNode(node);

    // Publish node and properties
    this.publishTerminalVoteNode(node);

    return node;
  }

  publishTerminalVoteNode(node) {
    const baseTopic = `${this.name}/${node.name}`;
    
    // Publish node properties
    this.homieObserver.publish(`${baseTopic}/$name`, node.name, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$type`, 'Terminal Vote', { retain: true });
    this.homieObserver.publish(`${baseTopic}/$properties`, 'vote,timestamp', { retain: true });

    // Publish each property
    node.getAllProperties().forEach(property => {
      this.publishPropertyAttributes(node, property);
    });
  }

  publishPropertyAttributes(node, property) {
    const baseTopic = `${this.name}/${node.name}/${property.name}`;
    
    this.homieObserver.publish(`${baseTopic}/$name`, property.name, { retain: true });
    this.homieObserver.publish(`${baseTopic}/$datatype`, property.dataType, { retain: true });
  }

  publishProperty(node, property) {
    const topic = `${this.name}/${node.name}/${property.name}`;
    this.homieObserver.publish(topic, property.getValue().toString(), { retain: true });
  }
}

async function initializeVoteAggregator() {
    const mqttUrl = 'ws://localhost:9001';
    const homieObserver = createMqttHomieObserver(mqttUrl);

    homieObserver.subscribe("vote/#");

    const voteAggregator = new VoteAggregator(homieObserver);

    homieObserver.created$.pipe(
      filter(event => event.type === 'device' && event.device.id === voteAggregator.id)
    ).subscribe(() => {
      console.log('VoteAggregator connected to MQTT broker');
    });

    // Initialize the Homie device
    // voteAggregator.init();
}

document.getElementById('connectButton').addEventListener('click', async () => {
    try {
        await initializeVoteAggregator();
        document.getElementById('status').textContent = 'Connected successfully!';
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = 'Connection failed: ' + error.message;
    }
});