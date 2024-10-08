import { TextureLoader, SkinnedMesh } from 'three';

AFRAME.registerComponent('texture-map', {
    schema: {
      src: { type: 'string' },
      roughness: { type: 'float', default: 0.85}
    },

    init() {
      const { src, roughness } = this.data;
      const el = this.el;
      const loader = new TextureLoader();

      loader.load(src, function (texture) {
        // texture.encoding = sRGBEncoding;
        texture.flipY = false;
        el.object3D.traverse(function (node) {
          console.log(typeof node);
          if (node.isSkinnedMesh) {
            node.material.map = texture;
            node.material.roughness = roughness;
            node.material.needsUpdate = true;
          }
        });
      });
    }
  });