AFRAME.registerComponent('custom-wasd-controls', {
    schema: {
      speed: { type: 'number', default: 5 }
    },
  
    init: function () {
      this.moveVector = new THREE.Vector3();
      this.keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };
  
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
  
      document.addEventListener('keydown', this.onKeyDown);
      document.addEventListener('keyup', this.onKeyUp);
    },
  
    onKeyDown: function (event) {
      if (this.keys.hasOwnProperty(event.code)) {
        this.keys[event.code] = true;
      }
    },
  
    onKeyUp: function (event) {
      if (this.keys.hasOwnProperty(event.code)) {
        this.keys[event.code] = false;
      }
    },
  
    tick: function (time, deltaTime) {
      const secondsElapsed = deltaTime / 1000;
      const currentPosition = this.el.object3D.position;
      const currentRotation = this.el.object3D.rotation;
  
      this.moveVector.set(0, 0, 0);
  
      if (this.keys.KeyW) this.moveVector.z -= 1;
      if (this.keys.KeyS) this.moveVector.z += 1;
      if (this.keys.KeyA) this.moveVector.x -= 1;
      if (this.keys.KeyD) this.moveVector.x += 1;
  
      if (this.moveVector.length() > 0) {
        this.moveVector.normalize();
        this.moveVector.multiplyScalar(this.data.speed * secondsElapsed);
  
        // Rotate movement vector based on camera's Y rotation
        this.moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation.y);
  
        currentPosition.add(this.moveVector);
      }
    },
  
    remove: function () {
      document.removeEventListener('keydown', this.onKeyDown);
      document.removeEventListener('keyup', this.onKeyUp);
    }
  });
  