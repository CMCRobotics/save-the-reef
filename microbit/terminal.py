import radio
import utime
from microbit import *
from micropython import const
import machine

DEVICE_ID = const("{:016x}".format(int.from_bytes(machine.unique_id(), "big")))  # Convert to hex and remove '0x' prefix
TERMINALS = 12
TIME_SLOT = 100  # milliseconds
CYCLE_TIME = TERMINALS * TIME_SLOT

radio.config(group=1, power=1)  # Lowest power setting
radio.on()

OPTIONS = ['a', 'b', 'c', 'd']
current_option = 0
vote_to_send = None
display.show(OPTIONS[current_option])

def send_vote(choice):
    msg = "VOTE,{},{}".format(DEVICE_ID, choice)
    radio.send(msg)

    # Wait for acknowledgment
    ack_received = False
    ack_wait_start = utime.ticks_ms()
    while utime.ticks_diff(utime.ticks_ms(), ack_wait_start) < 50:  # 50ms timeout
        ack = radio.receive()
        if ack and ack.startswith("ACK,{}".format(DEVICE_ID)):
            ack_received = True
            break
        utime.sleep_ms(1)

    return ack_received

# Calculate this device's time slot based on its ID
def get_time_slot():
    return (int(DEVICE_ID, 16) % TERMINALS) * TIME_SLOT

while True:
    cycle_start = utime.ticks_ms()

    # Check button presses
    if button_a.was_pressed():
        current_option = (current_option + 1) % len(OPTIONS)
        display.show(OPTIONS[current_option])

    if button_b.was_pressed():
        vote_to_send = current_option + 1  # Convert to 1-based index

    # Wait for this terminal's time slot
    while utime.ticks_diff(utime.ticks_ms(), cycle_start) < get_time_slot():
        utime.sleep_ms(1)

    # Send vote if one is queued
    if vote_to_send is not None:
        if send_vote(vote_to_send):
            display.show(Image.YES)
        else:
            display.show(Image.NO)
        utime.sleep_ms(500)  # Show the result briefly
        display.show(OPTIONS[current_option])  # Return to showing current option
        vote_to_send = None

    # Wait for the next cycle
    while utime.ticks_diff(utime.ticks_ms(), cycle_start) < CYCLE_TIME:
        utime.sleep_ms(1)
