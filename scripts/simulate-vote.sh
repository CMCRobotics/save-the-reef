#!/bin/bash

# Configuration
MQTT_BROKER="localhost"
MQTT_PORT=1883
HOMIE_BASE_TOPIC="homie"
DEVICE_ID="vote"

# Function to publish a message
publish() {
    mosquitto_pub -h $MQTT_BROKER -p $MQTT_PORT -t "$1" -m "$2" -r
}

# Setup vote device
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/\$homie" "4.0"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/\$name" "Voting round"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/\$state" "ready"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/\$nodes" "config"

# Setup config node
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/\$name" "Voting Configuration"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/\$type" "config"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/\$properties" "question-id,question-statement,voting-open,total-votes,option-1,option-2,option-3,option-4,correct-option"

# Setup properties for config node
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/question-id/\$name" "Current Question ID"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/question-id/\$datatype" "string"

publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/question-statement/\$name" "Question Statement"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/question-statement/\$datatype" "string"

publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/voting-open/\$name" "Voting Status"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/voting-open/\$datatype" "boolean"

publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/total-votes/\$name" "Total Votes Cast"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/total-votes/\$datatype" "integer"

for i in {1..4}
do
    publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/option-$i/\$name" "Option $i"
    publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/option-$i/\$datatype" "string"
done

publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/correct-option/\$name" "Correct option index"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/correct-option/\$datatype" "integer"

# Populate data
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/question-id" "Q1"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/question-statement" "What is the primary cause of coral bleaching?"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/voting-open" "true"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/total-votes" "0"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/option-1" "Ocean acidification"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/option-2" "Increased water temperature"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/option-3" "Overfishing"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/option-4" "Plastic pollution"
publish "$HOMIE_BASE_TOPIC/$DEVICE_ID/config/correct-option" "2"

echo "Vote device setup complete and sample data populated"