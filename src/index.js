import AFRAME from 'aframe';
import NoolsSceneController from './NoolsSceneController';

import './components/caustics';
import './components/bubble';
import './components/floating-camera';
import './components/custom-controls';
import './components/gradient';
import './components/simple-navmesh';
import './components/surface-placer';
import './components/ocean-shader';

// Polyfill global Buffer
import { Buffer } from 'buffer';
window.Buffer = Buffer;



AFRAME.registerComponent('scene-controller', {
  init: function() {
    // // Replace with your actual MQTT broker URL
    this.controller = new NoolsSceneController('ws://localhost:9001');
    
    // // Add some initial corals
    this.controller.addCoral('coral1', 0.5);
    this.controller.addCoral('coral2', 0.7);
    this.controller.addCoral('coral3', 0.6);
    // console.log("Hello Wonderful World");
  },
  
//   tick: function(time, timeDelta) {
//     // You can add additional per-frame logic here if needed
//   }
});