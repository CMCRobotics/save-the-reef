AFRAME.registerShader('radial-gradient', {
    schema: {
      color: {type: 'color', is: 'uniform', default: '#7AD7F0'},
      opacity: {type: 'number', is: 'uniform', default: 1.0},
      radius: {type: 'number', is: 'uniform', default: 10.0},
      falloff: {type: 'number', is: 'uniform', default: 0.5},
      texture: {type: 'map', is: 'uniform'}
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
      uniform float opacity;
      uniform float radius;
      uniform float falloff;
      uniform sampler2D texture;
      varying vec2 vUv;
      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        float alpha = 1.0 - smoothstep(radius * (1.0 - falloff), radius, dist * radius * 2.0);
        vec4 texColor = texture2D(texture, vUv);
        gl_FragColor = vec4(color * texColor.rgb, alpha * opacity * texColor.a);
      }
    `
  });
  