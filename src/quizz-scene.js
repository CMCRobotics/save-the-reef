import AFRAME from 'aframe';
import QuizzSceneController from './scene-quizz/QuizzSceneController';

import './components/caustics';
import './components/arc-layout';
import './components/texture-map';
import './components/look-towards';

import 'aframe-extras';
import 'aframe-label';
import 'aframe-htmlembed-component';
import 'aframe-draw-component';
import 'aframe-textwrap-component';


// Polyfill global Buffer
import { Buffer } from 'buffer';
window.Buffer = Buffer;


AFRAME.registerComponent('scene-controller', {
  init: function() {
    this.controller = new QuizzSceneController('ws://localhost:9001', 'teams', 'questions');
  }
});