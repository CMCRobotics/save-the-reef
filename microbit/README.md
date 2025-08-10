# Microbit Bridge Protocol

This document describes the communication protocol used between Microbit terminals and the bridge Microbit for the Save the Reef project.

## Radio Configuration

All Microbits (bridge and terminals) use the following radio configuration:
```python
radio.config(group=1, power=6)
```

## Bridge-Terminal Communication

The system uses a Time Division Multiple Access (TDMA) approach to manage communication between multiple terminals and the bridge:

- Number of supported terminals: 12
- Time slot per terminal: 100ms
- Total cycle time: 1200ms (12 terminals × 100ms)

## Operating Modes

The system supports two operating modes:

### 1. VOTING Mode
Used for collecting vote data from terminals.

**Message Format:**
```
VOTE,terminalId,option
```
- `terminalId`: Unique identifier of the terminal (1-12)
- `option`: Vote option (0-3)

**Example:**
```
VOTE,1,2    # Terminal 1 votes for option 2
```

### 2. SENSOR Mode
Used for collecting environmental sensor data from terminals.

**Message Format:**
```
SENS,terminalId,sensorType,value
```
- `terminalId`: Unique identifier of the terminal (1-12)
- `sensorType`: Type of sensor reading
- `value`: Sensor reading value

**Supported Sensor Types:**
1. Button Presses
   ```
   SENS,1,A     # Terminal 1, Button A pressed
   SENS,1,B     # Terminal 1, Button B pressed
   ```

2. Temperature
   ```
   SENS,1,TEMP,23.5    # Terminal 1, Temperature: 23.5°C
   ```
   - Range: -40°C to 125°C
   - Type: Float

3. Sound Level
   ```
   SENS,1,SOUND,128    # Terminal 1, Sound Level: 128
   ```
   - Range: 0-255
   - Type: Integer

4. Light Level
   ```
   SENS,1,LIGHT,200    # Terminal 1, Light Level: 200
   ```
   - Range: 0-255
   - Type: Integer

## Mode Switching

### Mode Request
Terminals can request the current mode from the bridge:
```
MODE_REQUEST,terminalId
```

### Mode Response
Bridge responds to mode requests with:
```
MODE,terminalId,currentMode
```

### Mode Change
Bridge can broadcast mode changes to all terminals:
```
MODE,ALL,newMode
```

## Serial Communication

The bridge Microbit communicates with the host computer over USB serial:

- Baudrate: 115200
- Bits: 8
- Parity: None
- Stop bits: 1

### Serial Commands
Commands that can be sent to the bridge:
```
MODE:VOTING    # Switch to voting mode
MODE:SENSOR    # Switch to sensor mode
```

### Bridge Status Messages
Messages sent by the bridge:
```
BRIDGE:READY              # Bridge initialization complete
BRIDGE:MODE_CHANGED:VOTING    # Mode changed to voting
BRIDGE:MODE_CHANGED:SENSOR    # Mode changed to sensor
```

## Terminal Display Feedback

Terminals provide visual feedback through their LED display:
- Startup: Shows TARGET pattern
- Ready state: Shows HAPPY face
- Sensor readings: Visual representation of sensor values
- Mode changes: Brief animation

## Error Handling

1. Invalid messages are ignored
2. Missing acknowledgments trigger retransmission
3. Mode synchronization through periodic mode requests
4. Automatic recovery from communication errors

## Implementation Notes

1. All messages end with a newline character ('\n')
2. Terminal IDs should be unique within the radio group
3. Time synchronization is maintained through the TDMA cycle
4. Sensor readings are sent at appropriate intervals based on the type of data


# Notes on USB serial debugging

This is how you can open the Microbit's serial port (assuming ttyACM0) and tail its output :

```bash
stty -F /dev/ttyACM0 115200 raw -echo
cat /dev/ttyACM0
```

This is how you send data to the Microbit's serial port (assuming ttyACM0) :
``bash
echo -n -e "MODE:VOTING\r" > /dev/ttyACM0
echo -n -e "MODE:SENSOR\r" > /dev/ttyACM0
```