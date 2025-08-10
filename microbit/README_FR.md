# Protocole du Pont Microbit

Ce document décrit le protocole de communication utilisé entre les terminaux Microbit et le Microbit pont pour le projet Save the Reef.

## Configuration Radio

Tous les Microbits (pont et terminaux) utilisent la configuration radio suivante :
```python
radio.config(group=1, power=6)
```

## Communication Pont-Terminal

Le système utilise une approche TDMA (Time Division Multiple Access) pour gérer la communication entre plusieurs terminaux et le pont :

- Nombre de terminaux supportés : 12
- Durée du créneau par terminal : 100ms
- Temps total du cycle : 1200ms (12 terminaux × 100ms)

## Modes de Fonctionnement

Le système prend en charge deux modes de fonctionnement :

### 1. Mode VOTING (Vote)
Utilisé pour collecter les données de vote des terminaux.

**Format du Message :**
```
VOTE,terminalId,option
```
- `terminalId` : Identifiant unique du terminal (1-12)
- `option` : Option de vote (0-3)

**Exemple :**
```
VOTE,1,2    # Le terminal 1 vote pour l'option 2
```

### 2. Mode SENSOR (Capteur)
Utilisé pour collecter les données des capteurs environnementaux des terminaux.

**Format du Message :**
```
SENS,terminalId,sensorType,value
```
- `terminalId` : Identifiant unique du terminal (1-12)
- `sensorType` : Type de lecture du capteur
- `value` : Valeur de lecture du capteur

**Types de Capteurs Supportés :**
1. Pressions des Boutons
   ```
   SENS,1,A     # Terminal 1, Bouton A pressé
   SENS,1,B     # Terminal 1, Bouton B pressé
   ```

2. Température
   ```
   SENS,1,TEMP,23.5    # Terminal 1, Température : 23.5°C
   ```
   - Plage : -40°C à 125°C
   - Type : Flottant

3. Niveau Sonore
   ```
   SENS,1,SOUND,128    # Terminal 1, Niveau Sonore : 128
   ```
   - Plage : 0-255
   - Type : Entier

4. Niveau de Luminosité
   ```
   SENS,1,LIGHT,200    # Terminal 1, Niveau de Luminosité : 200
   ```
   - Plage : 0-255
   - Type : Entier

## Changement de Mode

### Demande de Mode
Les terminaux peuvent demander le mode actuel au pont :
```
MODE_REQUEST,terminalId
```

### Réponse de Mode
Le pont répond aux demandes de mode avec :
```
MODE,terminalId,currentMode
```

### Changement de Mode
Le pont peut diffuser les changements de mode à tous les terminaux :
```
MODE,ALL,newMode
```

## Communication Série

Le Microbit pont communique avec l'ordinateur hôte via USB série :

- Débit : 115200
- Bits : 8
- Parité : Aucune
- Bits d'arrêt : 1

### Commandes Série
Commandes pouvant être envoyées au pont :
```
MODE:VOTING    # Passer en mode vote
MODE:SENSOR    # Passer en mode capteur
```

### Messages d'État du Pont
Messages envoyés par le pont :
```
BRIDGE:READY              # Initialisation du pont terminée
BRIDGE:MODE_CHANGED:VOTING    # Mode changé en vote
BRIDGE:MODE_CHANGED:SENSOR    # Mode changé en capteur
```

## Retour Visuel du Terminal

Les terminaux fournissent un retour visuel via leur affichage LED :
- Démarrage : Affiche le motif TARGET
- État prêt : Affiche un visage HAPPY
- Lectures des capteurs : Représentation visuelle des valeurs des capteurs
- Changements de mode : Brève animation

## Gestion des Erreurs

1. Les messages invalides sont ignorés
2. Les accusés de réception manquants déclenchent une retransmission
3. Synchronisation des modes via des demandes périodiques
4. Récupération automatique des erreurs de communication

## Notes d'Implémentation

1. Tous les messages se terminent par un caractère nouvelle ligne ('\n')
2. Les ID des terminaux doivent être uniques dans le groupe radio
3. La synchronisation temporelle est maintenue via le cycle TDMA
4. Les lectures des capteurs sont envoyées à des intervalles appropriés selon le type de données


# Notes sur le Débogage Série USB

Voici comment ouvrir le port série du Microbit (en supposant ttyACM0) et suivre sa sortie :

```bash
stty -F /dev/ttyACM0 115200 raw -echo
cat /dev/ttyACM0
```

Voici comment envoyer des données au port série du Microbit (en supposant ttyACM0) :
```bash
echo -n -e "MODE:VOTING\r" > /dev/ttyACM0
echo -n -e "MODE:SENSOR\r" > /dev/ttyACM0
