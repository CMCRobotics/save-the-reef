AFRAME.registerShader('stationary-caustics', {
  schema: {
    color: {type: 'color', is: 'uniform', default: '#0000ff'},
    timeMsec: {type: 'time', is: 'uniform'}
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec3 color;
    uniform float timeMsec;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
              -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      float time = timeMsec / 1000.0; // Convert from ms to seconds
      
      // Create stationary base pattern
      float baseNoise = snoise(vUv * 5.0);
      
      // Add subtle animation for shimmering effect
      float animNoise = snoise(vUv * 10.0 + vec2(sin(time * 0.3), cos(time * 0.3)) * 0.3);
      
      float combinedNoise = (baseNoise * 0.7 + animNoise * 0.3);
      
      float causticIntensity = smoothstep(-1.0, 1.0, combinedNoise);
      gl_FragColor = vec4(color * causticIntensity, causticIntensity * 0.7);
    }
  `
});

AFRAME.registerComponent('whitening-pass', {
  schema: {
    target: {type: 'selector'},
    intensity: {type: 'number', default: 0.5}
  },

  init: function () {
    this.effect = new THREE.ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: this.data.intensity }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = mix(texel, vec4(1.0, 1.0, 1.0, texel.a), intensity);
        }
      `
    });

    this.el.sceneEl.renderer.addPass(this.effect);
  },

  update: function () {
    this.effect.uniforms.intensity.value = this.data.intensity;
  },

  remove: function () {
    this.el.sceneEl.renderer.removePass(this.effect);
  },

  tick: function () {
    if (this.data.target.object3D) {
      this.data.target.object3D.traverse((node) => {
        if (node.isMesh) {
          node.layers.enable(1);
        }
      });
    }
  }
});

  

AFRAME.registerShader('water-surface', {
  schema: {
    color: {type: 'color', is: 'uniform', default: '#7AD7F0'},
    timeMsec: {type: 'time', is: 'uniform'}
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float timeMsec;
    varying vec2 vUv;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      float time = timeMsec / 1000.0;
      
      // Create wave effect
      float noise = snoise(vUv * 3.0 + vec2(time * 0.2, time * 0.1));
      
      // Add smaller ripples
      noise += snoise(vUv * 10.0 + vec2(time * -0.1, time * 0.3)) * 0.2;
      
      // Adjust color based on noise
      vec3 adjustedColor = color + vec3(noise * 0.1);
      
      // Add some transparency variation
      float alpha = 0.8 + noise * 0.2;
      
      gl_FragColor = vec4(adjustedColor, alpha);
    }
  `
});