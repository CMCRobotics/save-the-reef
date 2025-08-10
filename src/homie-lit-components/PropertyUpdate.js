class PropertyUpdate {
    constructor(deviceId, nodeId, propertyId, value) {
      this.deviceId = deviceId;
      this.nodeId = nodeId;
      this.propertyId = propertyId;
      this.value = value;
    }
  }

export default PropertyUpdate;