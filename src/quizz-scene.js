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

// AFRAME.registerComponent('scene-controller', {
//   init: function() {
//     // // Replace with your actual MQTT broker URL
//     this.controller = new QuizzSceneController('ws://localhost:9001');
    
//     // // Add some initial corals
//     // this.controller.addCoral('coral1', 0.5);
//     // this.controller.addCoral('coral2', 0.7);
//     // this.controller.addCoral('coral3', 0.6);
//     // console.log("Hello Wonderful World");
//   },
  
// //   tick: function(time, timeDelta) {
// //     // You can add additional per-frame logic here if needed
// //   }
// });