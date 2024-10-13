import AFRAME from 'aframe';

import './components/caustics';
import './components/bubble';
import './components/gradient';
import './components/ocean-shader';

import 'aframe-orbit-controls';
import 'aframe-extras';
import {html, render} from 'lit-html';
import jsYaml from 'js-yaml';


let coralModels = [];
let currentIndex = 0;

async function loadCoralModels(yamlUrl) {
    try {
        const response = await fetch(yamlUrl);
        const yamlText = await response.text();
        coralModels = jsYaml.load(yamlText);
        console.log('Loaded coral models:', coralModels);
        updateCoralModel();
    } catch (error) {
        console.log('Error loading coral models:', error);
    }
}

function updateCoralModel() {
    const coral = coralModels[currentIndex];
    const template = html`
        <a-entity
            gltf-model="#coral-${coral.assetId}"
            position="${coral.position.join(' ')}"
            scale="${coral.scale.join(' ')}"
        ></a-entity>
        <a-entity
            id="info-panel"
            position="0 2.5 5"
            geometry="primitive: plane; width: 4; height: 0.5"
            material="color: #000000; opacity: 0.7"
        >
            <a-text
                value="${coral.frenchName}\n${coral.latinName}"
                position="-1.9 0 0.01"
                scale="0.5 0.5 0.5"
                color="#FFFFFF"
                width="8"
            ></a-text>
        </a-entity>
    `;
    render(template, document.querySelector('#coralContainer'));
    console.log('Updated coral model:', coral);
}

function nextCoral() {
    currentIndex = (currentIndex + 1) % coralModels.length;
    updateCoralModel();
}

function prevCoral() {
    currentIndex = (currentIndex - 1 + coralModels.length) % coralModels.length;
    updateCoralModel();
}

document.getElementById('nextButton').addEventListener('click', nextCoral);
document.getElementById('prevButton').addEventListener('click', prevCoral);

// Load coral models from YAML file
loadCoralModels('./gallery.yaml');