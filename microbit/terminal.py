import radio
import utime
from microbit import *
from micropython import const
import machine

DEVICE_ID = const("{:016x}".format(int.from_bytes(machine.unique_id(), "big")))
TERMINALS = 12
TIME_SLOT = 100  # milliseconds
CYCLE_TIME = TERMINALS * TIME_SLOT

radio.config(group=1, power=1)
radio.on()

# Mode configuration
MODE_VOTING = const('VOTING')
MODE_SENSOR = const('SENSOR')
IMAGE_SENSOR_MODE = const(Image.DIAMOND)
current_mode = None

OPTIONS = ['a', 'b', 'c', 'd']
current_option = 0
vote_to_send = None

def send_vote(choice):
    msg = "VOTE,{},{}".format(DEVICE_ID, choice)
    radio.send(msg)
    return wait_for_ack()

def send_sensor_data(button):
    msg = "SENS,{},{}".format(DEVICE_ID, button)
    radio.send(msg)

def wait_for_ack():
    ack_wait_start = utime.ticks_ms()
    while utime.ticks_diff(utime.ticks_ms(), ack_wait_start) < 200:  # 200ms timeout
        ack = radio.receive()
        if ack and ack.startswith("ACK,{}".format(DEVICE_ID)):
            return True
        utime.sleep_ms(1)
    return False

def get_time_slot():
    return (int(DEVICE_ID, 16) % TERMINALS) * TIME_SLOT

def request_mode():
    radio.send("MODE_REQUEST,{}".format(DEVICE_ID))
    mode_wait_start = utime.ticks_ms()
    while utime.ticks_diff(utime.ticks_ms(), mode_wait_start) < 1000:  # 1 second timeout
        mode_response = radio.receive()
        if mode_response and mode_response.startswith("MODE,"):
            parts = mode_response.split(',')
            if len(parts) == 3 and (parts[1] == "ALL" or parts[1] == DEVICE_ID):
                return parts[2]
        utime.sleep_ms(10)
    return None

# Request mode on startup
while current_mode is None:
    display.show("?")
    current_mode = request_mode()
    if current_mode:
        display.show(Image.YES)
    else:
        display.show(Image.NO)
    utime.sleep_ms(500)

display.clear()

if current_mode == MODE_VOTING:
    display.show(OPTIONS[current_option])
elif current_mode == MODE_SENSOR:
    display.show(IMAGE_SENSOR_MODE)

while True:
    cycle_start = utime.ticks_ms()

    if current_mode == MODE_VOTING:
        if button_a.was_pressed():
            current_option = (current_option + 1) % len(OPTIONS)
            display.show(OPTIONS[current_option])
        if button_b.was_pressed():
            vote_to_send = current_option
    elif current_mode == MODE_SENSOR:
        if button_a.was_pressed():
            send_sensor_data('A')
            display.show("A")
            utime.sleep_ms(500)
            display.show(IMAGE_SENSOR_MODE)
        if button_b.was_pressed():
            send_sensor_data('B')
            display.show("B")
            utime.sleep_ms(500)
            display.show(IMAGE_SENSOR_MODE)



    # Wait for this terminal's time slot
    while utime.ticks_diff(utime.ticks_ms(), cycle_start) < get_time_slot():
        utime.sleep_ms(1)

    # Send vote if one is queued (in voting mode)
    if current_mode == MODE_VOTING and vote_to_send is not None:
        if send_vote(vote_to_send):
            display.show(Image.YES)
        else:
            display.show(Image.NO)
        utime.sleep_ms(500)
        display.show(OPTIONS[current_option])
        vote_to_send = None

    # Check for mode change
    mode_change = radio.receive()
    if mode_change and mode_change.startswith("MODE,"):
        parts = mode_change.split(',')
        if len(parts) == 3 and (parts[1] == DEVICE_ID or parts[1] == "ALL"):
            new_mode = parts[2]
            if new_mode in [MODE_VOTING, MODE_SENSOR]:
                current_mode = new_mode
                current_option = 0
                display.show(OPTIONS[current_option] if current_mode == MODE_VOTING else IMAGE_SENSOR_MODE)
                utime.sleep_ms(500)

    # Wait for the next cycle
    while utime.ticks_diff(utime.ticks_ms(), cycle_start) < CYCLE_TIME:
        utime.sleep_ms(1)
