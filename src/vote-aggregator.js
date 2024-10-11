import {initializeGateway} from './homie-lit-components/gateway';

document.getElementById('connectButton').addEventListener('click', async () => {
    try {
        const gateway = await initializeGateway('ws://localhost:9001');
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