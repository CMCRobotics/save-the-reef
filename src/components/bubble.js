AFRAME.registerComponent('bubbles', {
    schema: {
      count: {type: 'number', default: 100},
      color: {type: 'color', default: '#ffffff'},
      size: {type: 'number', default: 0.02},
      speed: {type: 'number', default: 0.1},
      opacity: {type: 'number', default: 0.5}  // New opacity parameter
    },
  
    init: function() {
      this.bubbles = [];
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: this.data.color,
        transparent: true,
        specular: new THREE.Color(0x1188ff),
        shininess: 100,
        reflectivity: 1,
        opacity: this.data.opacity  // Use the opacity from schema
      });
  
      for (let i = 0; i < this.data.count; i++) {
        const bubble = new THREE.Mesh(geometry, material);
        bubble.position.set(
          Math.random() * 10 - 5,
          Math.random() * 5 - 2.5,
          Math.random() * 10 - 5
        );
        bubble.scale.setScalar(this.data.size * (0.5 + Math.random()));
        this.el.object3D.add(bubble);
        this.bubbles.push(bubble);
      }
    },
  
    tick: function(time, deltaTime) {
      for (let bubble of this.bubbles) {
        bubble.position.y += this.data.speed * deltaTime / 1000;
        if (bubble.position.y > 3) {
          bubble.position.y = -2.5;
        }
        bubble.position.x += Math.sin(time * 0.001 + bubble.position.y) * 0.001;
        bubble.position.z += Math.cos(time * 0.0015 + bubble.position.y) * 0.001;
      }
    }
  });
  