AFRAME.registerComponent('floating-camera', {
    schema: {
      damping: { type: 'number', default: 0.1 },
      buoyancy: { type: 'number', default: 0.01 },
      maxTilt: { type: 'number', default: 5 }
    },
    
    init: function () {
      this.velocity = new THREE.Vector3();
      this.acceleration = new THREE.Vector3();
      this.originalPosition = new THREE.Vector3();
      this.el.object3D.getWorldPosition(this.originalPosition);
    },
    
    tick: function (time, deltaTime) {
      // if (!this.el.sceneEl.is('vr-mode')) {
        const cameraPosition = this.el.object3D.position;
        const cameraRotation = this.el.object3D.rotation;
    
        // Calculate movement
        const movement = cameraPosition.clone().sub(this.originalPosition);
    
        // Apply buoyancy
        this.acceleration.y = -movement.y * this.data.buoyancy;
    
        // Apply water resistance (damping)
        this.acceleration.sub(this.velocity.clone().multiplyScalar(this.data.damping));
    
        // Update velocity and position
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime / 1000));
        cameraPosition.add(this.velocity.clone().multiplyScalar(deltaTime / 1000));
    
        // Apply subtle tilt based on movement
        const tiltX = THREE.MathUtils.clamp(this.velocity.z * 2, -this.data.maxTilt, this.data.maxTilt);
        const tiltZ = THREE.MathUtils.clamp(-this.velocity.x * 2, -this.data.maxTilt, this.data.maxTilt);
        cameraRotation.x = THREE.MathUtils.degToRad(tiltX);
        cameraRotation.z = THREE.MathUtils.degToRad(tiltZ);
    
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
      // }
    }
    });
    
    AFRAME.registerComponent('simple-float', {
      schema: {
        amplitude: { type: 'number', default: 0.05 },
        speed: { type: 'number', default: 1 },
        horizontalDrift: { type: 'number', default: 0.02 },
        minHeight: { type: 'number', default: 0.5 },
        tiltAmount: { type: 'number', default: 2 }  // Maximum tilt in degrees
      },
    
      init: function() {
        this.targetPosition = new THREE.Vector3();
        this.initialY = this.el.object3D.position.y;
        this.tiltObject = new THREE.Object3D();
        this.el.object3D.add(this.tiltObject);
      },
    
      tick: function (time, deltaTime) {
        const camera = this.el.object3D;
        const { amplitude, speed, horizontalDrift, minHeight, tiltAmount } = this.data;
    
        // Calculate target position
        const floatY = Math.sin(time * 0.001 * speed) * amplitude;
        const driftX = Math.sin(time * 0.0007 * speed) * horizontalDrift;
        const driftZ = Math.cos(time * 0.0005 * speed) * horizontalDrift;
    
        this.targetPosition.set(
          camera.position.x + driftX,
          Math.max(this.initialY + floatY, this.initialY + minHeight),
          camera.position.z + driftZ
        );
    
        // Smoothly interpolate current position to target position
        camera.position.lerp(this.targetPosition, 0.02);
    
        // Apply tilt to the tilt object, not directly to the camera
        this.tiltObject.rotation.x = THREE.MathUtils.degToRad(Math.sin(time * 0.002 * speed) * tiltAmount);
        this.tiltObject.rotation.z = THREE.MathUtils.degToRad(Math.cos(time * 0.002 * speed) * tiltAmount);
      }
    });
    