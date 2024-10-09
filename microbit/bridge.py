from microbit import *
import radio
import utime

radio.config(group=1, power=1)
radio.on()

display.show(Image.TARGET)

uart.init(baudrate=115200, bits=8, parity=None, stop=1)

# TDMA configuration
TERMINALS = 12  # Maximum number of voting terminals
TIME_SLOT = 100  # milliseconds
CYCLE_TIME = TERMINALS * TIME_SLOT

def send_serial(message):
    uart.write(message + '\n')

send_serial("BRIDGE:READY")


while True:
    cycle_start = utime.ticks_ms()

    for slot in range(TERMINALS):
        slot_start = utime.ticks_ms()

        # Listen for votes during this time slot
        incoming = radio.receive()
        if incoming:
            send_serial("VOTE:{}".format(incoming))

            # Parse the vote data and send acknowledgment
            parts = incoming.split(',')
            if len(parts) == 3 and parts[0] == 'VOTE':
                terminal_id, choice = parts[1], parts[2]
                radio.send("ACK,{}".format(terminal_id))

        # Wait for the remainder of the time slot
        while utime.ticks_diff(utime.ticks_ms(), slot_start) < TIME_SLOT:
            utime.sleep_ms(1)

    # Check for any incoming serial data (if needed for future expansion)
    # if uart.any():
    #    serial_data = uart.readline().decode('utf-8').strip()
    #
        # Process serial data here if needed

    # Wait for the remainder of the cycle if necessary
    while utime.ticks_diff(utime.ticks_ms(), cycle_start) < CYCLE_TIME:
        utime.sleep_ms(1)

