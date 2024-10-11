import AFRAME from 'aframe';
import TutorialSceneController from './scene-tutorial/TutorialSceneController';

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


AFRAME.registerComponent('scene-controller', {
  init: function() {
    // TODO: Replace with actual MQTT broker
    this.controller = new TutorialSceneController('ws://localhost:9001', "team-1");
    
    console.log("Hello shiny happy people");
  }
});