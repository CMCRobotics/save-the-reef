import AFRAME from 'aframe';
import QuizzSceneController from './quizz/QuizzSceneController';

import './components/caustics';
import './components/floating-camera';
import './components/arc-layout';
import './components/texture-map';
import './components/look-towards';

import 'aframe-orbit-controls';
import 'aframe-extras';
import 'aframe-label';
import 'aframe-htmlembed-component';


// Polyfill global Buffer
import { Buffer } from 'buffer';
window.Buffer = Buffer;

const utils = AFRAME.utils;

AFRAME.registerComponent('scene-controller', {
  init: function() {
    // TODO: Replace this with actual MQTT broker
    this.controller = new QuizzSceneController('ws://localhost:9001');
    
    console.log("Hello Wonderful Quizz");
  },
  
// //   tick: function(time, timeDelta) {
// //     // You can add additional per-frame logic here if needed
// //   }
});