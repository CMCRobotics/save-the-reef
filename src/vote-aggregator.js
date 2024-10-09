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
  constructor() {
    super('vote-aggregator');
    this.setupWebUSB();
    // this.setupVoteProcessing();
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
        // this.processVote(value.trim());
        console.log("Received vote ", value.trim());
      }
    } catch (error) {
      console.error('Error reading from micro:bit:', error);
    }
  }

//   processVote(voteData) {
//     const [, terminalId, choice] = voteData.split(',');
//     if (!terminalId || !choice) {
//       console.error('Invalid vote data:', voteData);
//       return;
//     }

//     let terminalNode = this.getNode(`terminal-${terminalId}`);
//     if (!terminalNode) {
//       terminalNode = this.createTerminalNode(terminalId);
//     }

//     const voteProperty = terminalNode.getProperty('vote');
//     const timestampProperty = terminalNode.getProperty('timestamp');

//     voteProperty.setValue(choice);
//     timestampProperty.setValue(new Date().toISOString());
//   }

//   createTerminalNode(terminalId) {
//     const node = new HomieNode(`terminal-${terminalId}`, 'Terminal Vote');
//     node.addProperty(new HomieProperty('vote', 'Vote', 'string'));
//     node.addProperty(new HomieProperty('timestamp', 'Timestamp', 'datetime'));
//     this.addNode(node);
//     return node;
//   }

//   setupVoteProcessing() {
//     // Create an observable for vote updates
//     this.voteUpdates$ = new Observable(subscriber => {
//       this.on('property/vote', (node, property) => {
//         subscriber.next({ node, property });
//       });
//     }).pipe(
//       map(({ node, property }) => ({
//         terminalId: node.id.split('-')[1],
//         vote: property.getValue()
//       }))
//     );

//     // Subscribe to vote updates
//     this.voteUpdates$.subscribe(({ terminalId, vote }) => {
//       console.log(`Received vote from terminal ${terminalId}: ${vote}`);
//       // Here you can add any additional processing or forwarding logic
//     });
//   }

}

async function initializeVoteAggregator(){

    // Setup MQTT connection and Homie observer
    const mqttUrl = 'ws://localhost:9001';
    const homieObserver = createMqttHomieObserver(mqttUrl);

    homieObserver.subscribe("vote/#")

    // Create and initialize the VoteAggregator
    const voteAggregator = new VoteAggregator();

    // Connect the VoteAggregator to the MQTT broker
    homieObserver.created$.pipe(
    filter(event => event.type === 'device' && event.device.id === voteAggregator.id)
    ).subscribe(() => {
    console.log('VoteAggregator connected to MQTT broker');
    });

    // Initialize the Homie device
    // voteAggregator.init();
};

document.getElementById('connectButton').addEventListener('click', async () => {
    try {
        if (typeof initializeVoteAggregator === 'function') {
            await initializeVoteAggregator();
            document.getElementById('status').textContent = 'Connected successfully!';
        } else {
            throw new Error('initializeVoteAggregator function not found');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = 'Connection failed: ' + error.message;
    }
});

