/* global AFRAME */
import log from 'loglevel';

// Initialize logging
log.setLevel("info");

// List of valid coral species from your homie device hierarchy
const VALID_SPECIES = [
  'acropora-cervicornis',
  'acropora-palmata',
  'acropora-prolifera',
  'agaricia-speciosa',
  'colpophyllia-natans',
  'dendrogyra-cylindricus',
  'diploria-labyrinthiformis',
  'eusmilia-fastigiata',
  'gorgona-ventalina',
  'meandrina-meandrites',
  'millepora-alcicornis',
  'montastrea-cavernosa',
  'orbicella-curta',
  'porites-lobata',
  'pseudodiploria-strigosa'
];

AFRAME.registerComponent('coral', {
  schema: {
    species: { 
      type: 'string', 
      default: 'acropora-cervicornis',
      oneOf: VALID_SPECIES
    },
    health: { type: 'number', default: 100 },
    bleaching: { type: 'number', default: 0 },
    growthIndex: { type: 'number', default: 1.0 }
  },

  init: function() {
    log.info('Initializing coral component:', {
      species: this.data.species,
      position: this.el.getAttribute('position')
    });

    // Create model entity
    this.modelEl = document.createElement('a-entity');
    
    // Reference the preloaded asset using the species name
    this.modelEl.setAttribute('gltf-model', `#${this.data.species}`);
    
    // Add the ocean shader component
    this.modelEl.setAttribute('ocean-shader', {
      waterColor: '#0000FF',
      foamColor: '#00FCFF',
      waveHeight: 0.005,
      colorStrength: 0.05
    });

    this.el.appendChild(this.modelEl);

    // Add event listener for model loading
    this.modelEl.addEventListener('model-loaded', () => {
      log.debug('Coral model loaded:', this.data.species);
      this.updateCoralAppearance();
    });

    // Add event listener for model loading errors
    this.modelEl.addEventListener('model-error', (error) => {
      log.error('Error loading coral model:', {
        species: this.data.species,
        error: error
      });
    });
  },

  update: function(oldData) {
    const changedProps = Object.keys(this.data).filter(key => this.data[key] !== oldData[key]);
    
    if (changedProps.length > 0) {
      log.debug('Coral properties updated:', {
        species: this.data.species,
        changedProps: changedProps
      });
      
      if (changedProps.includes('species')) {
        // Species changed, update model reference
        this.modelEl.setAttribute('gltf-model', `#${this.data.species}`);
      }
      
      this.updateCoralAppearance();
    }
  },

  updateCoralAppearance: function() {
    // Update ocean shader parameters based on coral health and bleaching
    const bleachingFactor = this.data.bleaching / 100;
    const healthFactor = this.data.health / 100;

    // Adjust shader parameters based on coral health
    this.modelEl.setAttribute('ocean-shader', {
      colorStrength: Math.max(0.05, bleachingFactor), // More bleaching = stronger white color
      waveHeight: 0.005 * healthFactor // Less healthy = less movement
    });

    // Update scale based on growth index
    this.el.object3D.scale.setScalar(this.data.growthIndex);
  },

  remove: function() {
    log.info('Removing coral component:', this.data.species);
  }
});

// Register coral primitive
AFRAME.registerPrimitive('a-coral', {
  defaultComponents: {
    coral: {}
  },

  mappings: {
    species: 'coral.species',
    health: 'coral.health',
    bleaching: 'coral.bleaching',
    'growth-index': 'coral.growthIndex'
  }
});