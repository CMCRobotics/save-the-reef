# Notes on USB serial debugging

This is how you can open the Microbit's serial port (assuming ttyACM0) and tail its output :

```bash
stty -F /dev/ttyACM0 115200 raw -echo
cat /dev/ttyACM0
```


