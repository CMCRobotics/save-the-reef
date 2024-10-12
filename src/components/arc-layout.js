AFRAME.registerComponent('arc-layout', {
    schema: {
      radius: {type: 'number', default: 3},
      startAngle: {type: 'number', default: -90},
      endAngle: {type: 'number', default: 90},
      itemSelector: {type: 'string', default: ''}
    },
  
    init: function() {
      this.positionItems();
    },
  
    update: function() {
      this.positionItems();
    },
  
    positionItems: function() {
      const data = this.data;
      const el = this.el;
      
      // Select items based on the provided selector
      let items = el.querySelectorAll(data.itemSelector);
      items = Array.from(items);
  
      // Sort items using natural sort order
      items.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true, sensitivity: 'base'}));
  
      const numItems = items.length;
      if (numItems < 2) return;  // Need at least 2 items to create an arc
  
      const angleStep = (data.endAngle - data.startAngle) / (numItems - 1);
  
      items.forEach((item, i) => {
        const angle = THREE.MathUtils.degToRad(data.startAngle + (angleStep * i));
        const x = data.radius * Math.cos(angle);
        const z = -data.radius * Math.sin(angle);  // Negative to place items in front
  
        item.setAttribute('position', `${x.toFixed(2)} 0 ${z.toFixed(2)}`); 
      });
    }
  });