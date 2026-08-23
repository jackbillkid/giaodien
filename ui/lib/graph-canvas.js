/**
 * GraphCanvasEngine - DOM + Inline SVG Based Interactive Graph Engine
 * Compatible with both Sciter.JS and Chrome/standard browsers.
 * Uses absolutely-positioned DIVs for nodes and innerHTML SVG for edges.
 * No HTML5 <canvas> or createElementNS dependency.
 */
class GraphCanvasEngine {
  constructor(containerId, options) {
    if (!options) options = {};
    // containerId can point to the old <canvas> or any container element
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) {
      console.error("GraphCanvasEngine error: Container element not found:", containerId);
      return;
    }

    // If the found element is a <canvas>, replace it with a <div>
    if (container.tagName && container.tagName.toLowerCase() === 'canvas') {
      var wrapper = document.createElement('div');
      wrapper.id = containerId;
      wrapper.style.cssText = 'width:100%;height:100%;position:relative;overflow:hidden;cursor:grab;';
      if (container.parentNode) {
        container.parentNode.insertBefore(wrapper, container);
        try { container.remove(); } catch(e) {
          try { container.detach(); } catch(e2) {
            if (container.parentNode) container.parentNode.removeChild(container);
          }
        }
      }
      container = wrapper;
    }

    this.container = container;
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    this.nodes = [];
    this.edges = [];
    this.selectedNode = null;
    this.draggedNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.onNodeSelect = options.onNodeSelect || null;
    this.isAnimating = false;
    this.animOffset = 0;
    this.animFrameId = null;

    // Create edge layer (SVG via innerHTML - Sciter safe)
    this.edgeLayer = document.createElement('div');
    this.edgeLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    this.container.appendChild(this.edgeLayer);

    // Create node layer (DOM divs)
    this.nodeLayer = document.createElement('div');
    this.nodeLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;';
    this.container.appendChild(this.nodeLayer);

    // Draw background grid via CSS gradient
    this.container.style.background = 'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.04) 23px, rgba(255,255,255,0.04) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(255,255,255,0.04) 23px, rgba(255,255,255,0.04) 24px)';

    this._attachEvents();
  }

  _attachEvents() {
    var self = this;

    // Mouse down on container — detect node hit via coordinate check
    var onMouseDown = function(e) {
      var rect = self.container.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;

      var hit = self._findNodeAt(mx, my);
      if (hit) {
        self.draggedNode = hit;
        self.selectedNode = hit;
        self.dragOffsetX = mx - hit.x;
        self.dragOffsetY = my - hit.y;
        self.container.style.cursor = 'grabbing';
        if (self.onNodeSelect) self.onNodeSelect(hit);
      } else {
        self.selectedNode = null;
      }
      self.render();
    };

    var onMouseMove = function(e) {
      if (self.draggedNode) {
        var rect = self.container.getBoundingClientRect();
        var newX = e.clientX - rect.left - self.dragOffsetX;
        var newY = e.clientY - rect.top - self.dragOffsetY;
        // Clamp
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        var maxX = (self.container.clientWidth || 800) - self.draggedNode.width;
        var maxY = (self.container.clientHeight || 450) - self.draggedNode.height;
        if (newX > maxX) newX = maxX;
        if (newY > maxY) newY = maxY;
        self.draggedNode.x = newX;
        self.draggedNode.y = newY;
        self.render();
      }
    };

    var onMouseUp = function() {
      self.draggedNode = null;
      self.container.style.cursor = 'grab';
    };

    // Use addEventListener (Chrome) or on (Sciter)
    if (typeof self.container.addEventListener === 'function') {
      self.container.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    } else if (typeof self.container.on === 'function') {
      self.container.on('mousedown', onMouseDown);
      document.on('mousemove', onMouseMove);
      document.on('mouseup', onMouseUp);
    }

    // Resize
    var onResize = function() { self.render(); };
    try {
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('resize', onResize);
      }
    } catch(e) {}
  }

  _findNodeAt(x, y) {
    for (var i = this.nodes.length - 1; i >= 0; i--) {
      var n = this.nodes[i];
      if (x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height) {
        return n;
      }
    }
    return null;
  }

  addNode(node) {
    var defaultNode = {
      id: Date.now(),
      label: "Node",
      type: "Processor",
      x: 100,
      y: 100,
      width: 150,
      height: 65,
      status: "Idle",
      color: "#6366f1",
      data: {}
    };
    var newObj = {};
    var k;
    for (k in defaultNode) newObj[k] = defaultNode[k];
    for (k in node) newObj[k] = node[k];
    this.nodes.push(newObj);
    this.render();
    return newObj;
  }

  addEdge(fromId, toId, options) {
    if (!options) options = {};
    var edge = {
      from: fromId,
      to: toId,
      label: options.label || "",
      color: options.color || "#6366f1",
      active: options.active || false
    };
    this.edges.push(edge);
    this.render();
    return edge;
  }

  render() {
    this._renderEdges();
    this._renderNodes();
  }

  _renderEdges() {
    // Build SVG as HTML string (Sciter-safe: no createElementNS needed)
    var w = this.container.clientWidth || 800;
    var h = this.container.clientHeight || 450;
    var svgParts = [];
    svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" style="display:block;">');

    for (var i = 0; i < this.edges.length; i++) {
      var edge = this.edges[i];
      var fromNode = null, toNode = null;
      for (var j = 0; j < this.nodes.length; j++) {
        if (this.nodes[j].id === edge.from) fromNode = this.nodes[j];
        if (this.nodes[j].id === edge.to) toNode = this.nodes[j];
      }
      if (!fromNode || !toNode) continue;

      var startX = fromNode.x + fromNode.width;
      var startY = fromNode.y + fromNode.height / 2;
      var endX = toNode.x;
      var endY = toNode.y + toNode.height / 2;
      var ctrlDist = Math.abs(endX - startX) / 2;
      if (ctrlDist < 30) ctrlDist = 30;

      var strokeColor = edge.active ? '#10b981' : '#374151';
      var strokeWidth = edge.active ? 3 : 2;
      var dashAttr = edge.active ? '' : ' stroke-dasharray="6,4"';

      var d = 'M ' + startX + ' ' + startY + ' C ' + (startX + ctrlDist) + ' ' + startY + ', ' + (endX - ctrlDist) + ' ' + endY + ', ' + endX + ' ' + endY;
      svgParts.push('<path d="' + d + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '"' + dashAttr + '/>');

      // Arrow head
      var arrowSize = 7;
      var t = 0.95;
      var tx = 3*(1-t)*(1-t)*((startX+ctrlDist) - startX) + 6*(1-t)*t*((endX-ctrlDist) - (startX+ctrlDist)) + 3*t*t*(endX - (endX-ctrlDist));
      var ty = 3*(1-t)*(1-t)*(startY - startY) + 6*(1-t)*t*(endY - startY) + 3*t*t*(endY - endY);
      var angle = Math.atan2(ty, tx);
      var ax1 = endX - arrowSize * Math.cos(angle - 0.4);
      var ay1 = endY - arrowSize * Math.sin(angle - 0.4);
      var ax2 = endX - arrowSize * Math.cos(angle + 0.4);
      var ay2 = endY - arrowSize * Math.sin(angle + 0.4);
      svgParts.push('<polygon points="' + endX + ',' + endY + ' ' + ax1.toFixed(1) + ',' + ay1.toFixed(1) + ' ' + ax2.toFixed(1) + ',' + ay2.toFixed(1) + '" fill="' + strokeColor + '"/>');

      // Animated dot on active edge
      if (edge.active && this.isAnimating) {
        var at = (this.animOffset % 100) / 100;
        var px = Math.pow(1-at,3)*startX + 3*Math.pow(1-at,2)*at*(startX+ctrlDist) + 3*(1-at)*at*at*(endX-ctrlDist) + Math.pow(at,3)*endX;
        var py = Math.pow(1-at,3)*startY + 3*Math.pow(1-at,2)*at*startY + 3*(1-at)*at*at*endY + Math.pow(at,3)*endY;
        svgParts.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5" fill="#10b981"/>');
        // Glow
        svgParts.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="10" fill="#10b981" opacity="0.25"/>');
      }
    }

    svgParts.push('</svg>');
    this.edgeLayer.innerHTML = svgParts.join('');
  }

  _renderNodes() {
    var parts = [];

    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i];
      var isSelected = this.selectedNode && this.selectedNode.id === n.id;

      // Status color
      var statusColor = '#6b7280';
      if (n.status === 'Success') statusColor = '#10b981';
      else if (n.status === 'Running') statusColor = '#f59e0b';
      else if (n.status === 'Danger') statusColor = '#ef4444';

      var borderStyle = isSelected ? '2px solid #6366f1' : '1px solid #374151';
      var shadowStyle = isSelected ? 'box-shadow:0 0 12px rgba(99,102,241,0.5);' : '';
      var pulseAnim = n.status === 'Running' ? 'animation:gce-pulse 1s ease-in-out infinite;' : '';

      var valStr = (n.data && n.data.endpoint) ? n.data.endpoint : (n.status || 'Idle');
      // Escape text for HTML
      var label = String(n.label).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      var typeStr = String(n.type || 'Processor').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      valStr = String(valStr).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

      var colorAlpha = (n.color || '#6366f1') + '33';

      parts.push(
        '<div style="position:absolute;box-sizing:border-box;border-radius:8px;overflow:hidden;cursor:pointer;' +
        'left:' + n.x + 'px;top:' + n.y + 'px;width:' + n.width + 'px;height:' + n.height + 'px;' +
        'background:#1f2937;border:' + borderStyle + ';' + shadowStyle + '">' +

        // Header strip
        '<div style="width:100%;height:24px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-sizing:border-box;background:' + colorAlpha + ';">' +
          '<span style="font-size:11px;font-weight:bold;color:' + (n.color || '#6366f1') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</span>' +
          '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + statusColor + ';flex-shrink:0;' + pulseAnim + '"></span>' +
        '</div>' +

        // Body
        '<div style="padding:6px 10px;">' +
          '<div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">' + typeStr + '</div>' +
          '<div style="font-size:11px;font-weight:bold;color:#f9fafb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + valStr + '</div>' +
        '</div>' +

        '</div>'
      );
    }

    this.nodeLayer.innerHTML = parts.join('');
  }

  startFlowAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    var self = this;
    var loop = function() {
      self.animOffset = (self.animOffset + 1.5) % 100;
      self.render();
      if (self.isAnimating) {
        self.animFrameId = requestAnimationFrame(loop);
      }
    };
    loop();
  }

  stopFlowAnimation() {
    this.isAnimating = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.render();
  }

  reset() {
    this.nodes = [];
    this.edges = [];
    this.selectedNode = null;
    this.render();
  }
}

// Inject keyframe for pulse animation (Sciter + Chrome safe)
try {
  var _gceStyle = document.createElement('style');
  _gceStyle.textContent = '@keyframes gce-pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }';
  if (document.head) document.head.appendChild(_gceStyle);
  else if (document.body) document.body.appendChild(_gceStyle);
} catch(e) {}
