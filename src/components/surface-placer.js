
AFRAME.registerComponent('surface-placer', {
    schema: {
      position: { type: 'vec3' },
      normal: { type: 'vec3' },
      originalParentScale: { type: 'number', default: 1 },
      scale: { type: 'number', default: 1 },
      leeway: { type: 'number', default: 0.05 }  // 5% leeway
    },
  
    init: function() {
      this.parentScale = new THREE.Vector3(1, 1, 1);
      this.boundingBox = new THREE.Box3();
      this.el.addEventListener('model-loaded', this.onModelLoaded.bind(this));
    },

    update: function(oldData) {
      if (this.dataChanged(oldData)) {
        this.calculateBoundingBox();
        this.placeOnSurface();
      }
    },

    tick: function() {
      const newParentScale = this.el.parentEl.object3D.scale;
      if (!this.parentScale.equals(newParentScale)) {
        this.parentScale.copy(newParentScale);
        this.placeOnSurface();
      }
    },
    
    dataChanged: function(oldData) {
      return (
        // !AFRAME.utils.deepEqual(oldData.position, this.data.position) ||
        // !AFRAME.utils.deepEqual(oldData.normal, this.data.normal) ||
        // oldData.originalParentScale !== this.data.originalParentScale ||
        // oldData.scale !== this.data.scale ||
        // oldData.leeway !== this.data.leeway
        true
      );
    },  

    onModelLoaded: function() {
      this.calculateBoundingBox();
      this.placeOnSurface();
    },
  
  
  
    calculateBoundingBox: function() {
      this.boundingBox.setFromObject(this.el.object3D);
    },
  
    placeOnSurface: function() {
      // Calculate the scale ratio for position adjustment
      const positionScaleRatio = this.data.originalParentScale / Math.max(this.parentScale.x, this.parentScale.y, this.parentScale.z);
      
      // Calculate and set the scale of the coral
      const coralScale = this.data.scale / Math.max(this.parentScale.x, this.parentScale.y, this.parentScale.z);
      this.el.object3D.scale.set(coralScale, coralScale, coralScale);
  
      // Recalculate bounding box with new scale
      this.calculateBoundingBox();
  
      // Calculate the size of the bounding box
      const size = new THREE.Vector3();
      this.boundingBox.getSize(size);
  
      // Calculate the offset to move the object below the surface
      const offsetY = size.y * (0.5 + this.data.leeway);
  
      // Adjust the position based on the scale ratio and bounding box
      const adjustedPosition = new THREE.Vector3(
        this.data.position.x * positionScaleRatio,
        (this.data.position.y + offsetY) * positionScaleRatio,
        this.data.position.z * positionScaleRatio
      );
  
      // Set the position of this entity
      this.el.object3D.position.copy(adjustedPosition);
  
      // Calculate the rotation based on the normal vector
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3(this.data.normal.x, this.data.normal.y, this.data.normal.z);
      normal.normalize();
  
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, normal);
  
      // Apply the rotation
      this.el.object3D.quaternion.copy(quaternion);
    }
    


  });
  