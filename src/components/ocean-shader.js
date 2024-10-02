AFRAME.registerComponent('ocean-shader', {
    schema: {
      waterColor: {type: 'color', default: '#0000FF'},
      foamColor: {type: 'color', default: '#00FCFF'},
      waveHeight: {type: 'number', default: 0.005},
      colorStrength: {type: 'number', default: 0.05, min: 0, max: 1}
    },

    init: function () {
      this.el.addEventListener('model-loaded', this.updateMaterial.bind(this));
    },

    updateMaterial: function () {
      const mesh = this.el.getObject3D('mesh');
      const data = this.data;

      if (mesh) {
        mesh.traverse((node) => {
          if (node.isMesh) {
            const newMaterial = new THREE.ShaderMaterial({
              uniforms: {
                baseTexture: { value: node.material.map },
                waterColor: { value: new THREE.Color(data.waterColor) },
                foamColor: { value: new THREE.Color(data.foamColor) },
                waveHeight: { value: data.waveHeight },
                colorStrength: { value: data.colorStrength },
                time: { value: 0 }
              },
              vertexShader: `
                uniform float time;
                uniform float waveHeight;
                varying vec2 vUv;
                varying float vWaveHeight;
                
                void main() {
                  vUv = uv;
                  vec3 pos = position;
                  
                  float waveEffect = sin(pos.x * 10.0 + time) * cos(pos.z * 10.0 + time) * waveHeight;
                  pos.y += waveEffect;
                  
                  vWaveHeight = waveEffect;
                  
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
              `,
              fragmentShader: `
                uniform sampler2D baseTexture;
                uniform vec3 waterColor;
                uniform vec3 foamColor;
                uniform float colorStrength;
                varying vec2 vUv;
                varying float vWaveHeight;
                
                void main() {
                  vec4 texColor = texture2D(baseTexture, vUv);
                  
                  vec3 finalColor = mix(waterColor, foamColor, smoothstep(0.0, 0.5, vWaveHeight + 0.5));
                  
                  // Adjust this line to control color prominence
                  gl_FragColor = vec4(mix(texColor.rgb, finalColor, colorStrength), texColor.a);
                }
              `,
              transparent: true
            });

            // Preserve original material properties
            newMaterial.side = node.material.side;
            newMaterial.shadowSide = node.material.shadowSide;
            newMaterial.vertexColors = node.material.vertexColors;
            newMaterial.flatShading = node.material.flatShading;

            node.material = newMaterial;
          }
        });
      }
    },

    tick: function (time) {
      const mesh = this.el.getObject3D('mesh');
      if (mesh) {
        mesh.traverse((node) => {
          if (node.isMesh && node.material.uniforms) {
            node.material.uniforms.time.value = time * 0.001;
          }
        });
      }
    }
  });