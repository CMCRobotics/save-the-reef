AFRAME.registerComponent('simple-navmesh', {
    schema: {
      radius: {type: 'number', default: 10},
      coralRadius: {type: 'number', default: 3}
    },
    
    init: function () {
      this.camera = document.getElementById('player-camera');
      this.playerPos = new THREE.Vector3();
    },
    
    tick: function () {
      // Get player position
      this.camera.object3D.getWorldPosition(this.playerPos);
      
      // // Check if player is outside the main area
      if (this.playerPos.length() > this.data.radius) {
        // Move player back inside
        this.playerPos.normalize().multiplyScalar(this.data.radius);
        this.camera.object3D.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      }
      
      // Check if player is too close to coral reef (assumed to be at 0,0,0)
      // if (this.playerPos.length() < this.data.coralRadius) {
      //   // Move player away from coral
      //   this.playerPos.normalize().multiplyScalar(this.data.coralRadius);
      //   this.camera.object3D.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      // }
    }
  });
