from microbit import *
import radio
import utime

radio.config(group=1, power=1)
radio.on()

display.show(Image.TARGET)

uart.init(baudrate=115200, bits=8, parity=None, stop=1)

# TDMA configuration
TERMINALS = 12
TIME_SLOT = 100  # milliseconds
CYCLE_TIME = TERMINALS * TIME_SLOT

# Mode configuration
MODE_VOTING = 'VOTING'
MODE_SENSOR = 'SENSOR'
current_mode = MODE_VOTING

def send_serial(message):
    uart.write(message + '\n')

send_serial("BRIDGE:READY")

def process_vote(incoming):
    parts = incoming.split(',')
    if len(parts) == 3 and parts[0] == 'VOTE':
        terminal_id = parts[1]
        radio.send("ACK,{}".format(terminal_id))
        send_serial("{}".format(incoming))

def process_sensor_data(incoming):
    parts = incoming.split(',')
    if len(parts) == 3 and parts[0] == 'SENS':
        send_serial("{}".format(incoming))

def handle_mode_request(terminal_id):
    radio.send("MODE,{},{}".format(terminal_id, current_mode))

while True:
    cycle_start = utime.ticks_ms()

    for slot in range(TERMINALS):
        slot_start = utime.ticks_ms()

        # Listen for data during this time slot
        incoming = radio.receive()
        if incoming:
            if incoming.startswith("MODE_REQUEST,"):
                _, terminal_id = incoming.split(',')
                handle_mode_request(terminal_id)
            elif current_mode == MODE_VOTING:
                process_vote(incoming)
            elif current_mode == MODE_SENSOR:
                process_sensor_data(incoming)

        # Wait for the remainder of the time slot
        while utime.ticks_diff(utime.ticks_ms(), slot_start) < TIME_SLOT:
            utime.sleep_ms(1)

    # Check for any incoming serial data to change modes
    if uart.any():
        serial_data = uart.readline().decode('utf-8').strip()
        if serial_data == "MODE:VOTING":
            current_mode = MODE_VOTING
            send_serial("BRIDGE:MODE_CHANGED:VOTING")
            radio.send("MODE,ALL,{}".format(current_mode))
        elif serial_data == "MODE:SENSOR":
            current_mode = MODE_SENSOR
            send_serial("BRIDGE:MODE_CHANGED:SENSOR")
            radio.send("MODE,ALL,{}".format(current_mode))

    # Wait for the remainder of the cycle if necessary
    while utime.ticks_diff(utime.ticks_ms(), cycle_start) < CYCLE_TIME:
        utime.sleep_ms(1)
