import { TextureLoader } from 'three';

AFRAME.registerComponent('texture-map', {
    schema: {
      src: { type: 'string' },
      roughness: { type: 'float', default: 0.85}
    },

    init: function() {
      this.applyTexture();
    },
  
    update: function() {
      this.applyTexture();
    },

    applyTexture: function() {
      const { src, roughness } = this.data;
      const el = this.el;
      const loader = new TextureLoader();

      loader.load(src, function (texture) {
        texture.flipY = false;
        el.object3D.traverse(function (node) {
          if (node.isSkinnedMesh) {
            node.material.map = texture;
            node.material.roughness = roughness;
            node.material.needsUpdate = true;
          }
        });
      });
    }
  });