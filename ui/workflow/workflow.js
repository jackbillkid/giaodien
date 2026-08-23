// --- Native Sciter + Web Workflow Graph Engine ---
var workflowNodes = {};
var workflowConnections = [];
var selectedNodeId = null;
var isDraggingNode = false;
var draggedNodeId = null;
var dragOffsetX = 0;
var dragOffsetY = 0;

var isConnecting = false;
var connectionStartNodeId = null;
var connectionStartPort = null;
var tempSvgLine = null;

function initWorkflowGraphCanvas() {
  var container = getElement("drawflow");
  if (!container) return;

  container.innerHTML = "";
  container.style.position = "relative";
  container.style.overflow = "hidden";
  container.style.userSelect = "none";

  // Create SVG layer for bezier connection paths
  var svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgLayer.setAttribute("id", "wf-svg-layer");
  svgLayer.style.position = "absolute";
  svgLayer.style.top = "0px";
  svgLayer.style.left = "0px";
  svgLayer.style.width = "100%";
  svgLayer.style.height = "100%";
  svgLayer.style.pointerEvents = "none";
  svgLayer.style.zIndex = "1";
  container.appendChild(svgLayer);

  // Global mouse move & mouse up for smooth drag
  document.addEventListener("mousemove", onWorkflowMouseMove);
  document.addEventListener("mouseup", onWorkflowMouseUp);

  setupDefaultWorkflowNodes();
}

function setupDefaultWorkflowNodes() {
  workflowNodes = {
    "node-1": {
      id: "node-1",
      label: "⚡ HTTP Webhook",
      type: "Trigger",
      status: "Success",
      color: "#6366f1",
      endpoint: "POST /api/upload",
      posX: 50,
      posY: 120,
      inputs: [],
      outputs: ["out-1"],
      params: { method: "POST", endpoint: "/api/upload", auth: "BearerToken" }
    },
    "node-2": {
      id: "node-2",
      label: "🔍 Data Filter",
      type: "Processor",
      status: "Idle",
      color: "#10b981",
      endpoint: "File & Format Check",
      posX: 320,
      posY: 120,
      inputs: ["in-1"],
      outputs: ["out-1", "out-2"],
      params: { rules: ["file_type == image", "size < 10MB"] }
    },
    "node-3": {
      id: "node-3",
      label: "🐍 Python Engine",
      type: "AI Pipeline",
      status: "Idle",
      color: "#f59e0b",
      endpoint: "Image ML Process",
      posX: 590,
      posY: 60,
      inputs: ["in-1"],
      outputs: ["out-1"],
      params: { model: "ResNet-50", device: "CUDA:0", threshold: 0.85 }
    },
    "node-4": {
      id: "node-4",
      label: "💾 Storage Sync",
      type: "Storage",
      status: "Idle",
      color: "#3b82f6",
      endpoint: "Save to Uploads",
      posX: 590,
      posY: 240,
      inputs: ["in-1"],
      outputs: ["out-1"],
      params: { path: "./uploads/", compression: "gzip" }
    },
    "node-5": {
      id: "node-5",
      label: "🔔 WebSocket Toast",
      type: "Output",
      status: "Idle",
      color: "#ec4899",
      endpoint: "UI Client Alert",
      posX: 860,
      posY: 150,
      inputs: ["in-1"],
      outputs: [],
      params: { channel: "system_alerts", toast_type: "success" }
    }
  };

  workflowConnections = [
    { fromNode: "node-1", fromPort: "out-1", toNode: "node-2", toPort: "in-1" },
    { fromNode: "node-2", fromPort: "out-1", toNode: "node-3", toPort: "in-1" },
    { fromNode: "node-2", fromPort: "out-2", toNode: "node-4", toPort: "in-1" },
    { fromNode: "node-3", fromPort: "out-1", toNode: "node-5", toPort: "in-1" }
  ];

  renderAllNodes();
  renderAllConnections();
  updateNodeCountBadge();

  if (workflowNodes["node-1"]) {
    selectNode("node-1");
  }
}

function renderAllNodes() {
  var container = getElement("drawflow");
  if (!container) return;

  // Remove existing nodes
  var existingNodes = container.querySelectorAll(".wf-node-card");
  for (var i = 0; i < existingNodes.length; i++) {
    existingNodes[i].parentNode.removeChild(existingNodes[i]);
  }

  for (var id in workflowNodes) {
    if (workflowNodes.hasOwnProperty(id)) {
      renderSingleNode(workflowNodes[id]);
    }
  }
}

function renderSingleNode(node) {
  var container = getElement("drawflow");
  if (!container) return;

  var card = document.createElement("div");
  card.setAttribute("id", node.id);
  card.className = "wf-node-card" + (selectedNodeId === node.id ? " selected" : "");
  card.style.position = "absolute";
  card.style.left = node.posX + "px";
  card.style.top = node.posY + "px";
  card.style.zIndex = "5";
  card.style.width = "200px";
  card.style.background = "var(--bg-surface, #1e293b)";
  card.style.border = "1px solid " + (selectedNodeId === node.id ? "var(--primary, #6366f1)" : "var(--border-default, #334155)");
  card.style.borderRadius = "10px";
  card.style.boxShadow = selectedNodeId === node.id ? "0 0 12px " + node.color + "60" : "0 4px 12px rgba(0,0,0,0.3)";
  card.style.cursor = "move";

  var statusColor = "#6b7280";
  if (node.status === "Success") statusColor = "#10b981";
  else if (node.status === "Running") statusColor = "#f59e0b";
  else if (node.status === "Danger") statusColor = "#ef4444";

  var html = '<div class="wf-node-header" style="background: ' + node.color + '25; color: ' + node.color + '; padding: 8px 12px; border-bottom: 1px solid ' + node.color + '40; border-radius: 9px 9px 0 0; font-weight: bold; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">' +
    '<span>' + escapeHtml(node.label) + '</span>' +
    '<span class="wf-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: ' + statusColor + ';"></span>' +
  '</div>' +
  '<div class="wf-node-body" style="padding: 10px 12px;">' +
    '<small style="color: var(--text-muted, #94a3b8); font-size: 0.75rem; display: block;">' + escapeHtml(node.type) + '</small>' +
    '<div style="font-size: 0.8rem; color: var(--text-main, #f8fafc); margin-top: 4px; font-weight: 500;">' + escapeHtml(node.endpoint) + '</div>' +
  '</div>';

  // Input Ports
  if (node.inputs && node.inputs.length > 0) {
    for (var i = 0; i < node.inputs.length; i++) {
      var portId = node.inputs[i];
      var portTop = 35 + (i * 24);
      html += '<div class="wf-port wf-input-port" data-node="' + node.id + '" data-port="' + portId + '" style="position: absolute; left: -8px; top: ' + portTop + 'px; width: 14px; height: 14px; background: #6366f1; border: 2px solid #ffffff; border-radius: 50%; cursor: pointer; z-index: 10;" title="Input Port"></div>';
    }
  }

  // Output Ports
  if (node.outputs && node.outputs.length > 0) {
    for (var j = 0; j < node.outputs.length; j++) {
      var outPortId = node.outputs[j];
      var outPortTop = 35 + (j * 24);
      html += '<div class="wf-port wf-output-port" data-node="' + node.id + '" data-port="' + outPortId + '" style="position: absolute; right: -8px; top: ' + outPortTop + 'px; width: 14px; height: 14px; background: #10b981; border: 2px solid #ffffff; border-radius: 50%; cursor: pointer; z-index: 10;" title="Output Port"></div>';
    }
  }

  card.innerHTML = html;

  // Node Drag Event Listener
  card.addEventListener("mousedown", function(evt) {
    // If clicked on port, start connection drag
    if (evt.target && evt.target.classList && evt.target.classList.contains("wf-output-port")) {
      startConnectionDrag(evt, node.id, evt.target.getAttribute("data-port"));
      return;
    }

    selectNode(node.id);
    isDraggingNode = true;
    draggedNodeId = node.id;
    var rect = safeRect(card);
    dragOffsetX = evt.clientX - rect.left;
    dragOffsetY = evt.clientY - rect.top;
    evt.stopPropagation();
  });

  container.appendChild(card);
}

function selectNode(id) {
  selectedNodeId = id;
  var node = workflowNodes[id];

  // Update styles
  var allCards = document.querySelectorAll(".wf-node-card");
  for (var i = 0; i < allCards.length; i++) {
    var c = allCards[i];
    if (c.id === id) {
      c.style.border = "1px solid var(--primary, #6366f1)";
      c.style.boxShadow = "0 0 12px " + (node ? node.color : "#6366f1") + "60";
    } else {
      c.style.border = "1px solid var(--border-default, #334155)";
      c.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    }
  }

  if (node) {
    updateInspectorPanel(node);
  }
}

function updateInspectorPanel(node) {
  var nameEl = getElement("wf-inspect-name");
  var typeEl = getElement("wf-inspect-type");
  var statusEl = getElement("wf-inspect-status");
  var paramsEl = getElement("wf-inspect-params");

  if (nameEl) nameEl.innerText = node.label;
  if (typeEl) typeEl.innerText = node.type;
  if (statusEl) {
    statusEl.innerText = node.status;
    statusEl.className = "badge " + (node.status === "Success" ? "badge-active" : "");
  }
  if (paramsEl) paramsEl.value = JSON.stringify(node.params, null, 2);
}

function onWorkflowMouseMove(evt) {
  if (isDraggingNode && draggedNodeId && workflowNodes[draggedNodeId]) {
    var container = getElement("drawflow");
    if (!container) return;
    var cRect = safeRect(container);
    var newX = evt.clientX - cRect.left - dragOffsetX;
    var newY = evt.clientY - cRect.top - dragOffsetY;

    // Constrain inside container bounds
    if (newX < 10) newX = 10;
    if (newY < 10) newY = 10;

    workflowNodes[draggedNodeId].posX = newX;
    workflowNodes[draggedNodeId].posY = newY;

    var card = getElement(draggedNodeId);
    if (card) {
      card.style.left = newX + "px";
      card.style.top = newY + "px";
    }

    renderAllConnections();
  }

  if (isConnecting && tempSvgLine) {
    var container = getElement("drawflow");
    if (!container) return;
    var cRect = safeRect(container);
    var endX = evt.clientX - cRect.left;
    var endY = evt.clientY - cRect.top;
    var startNode = workflowNodes[connectionStartNodeId];
    if (startNode) {
      var startX = startNode.posX + 200;
      var startY = startNode.posY + 40;
      var pathD = createBezierPath(startX, startY, endX, endY);
      tempSvgLine.setAttribute("d", pathD);
    }
  }
}

function onWorkflowMouseUp(evt) {
  if (isDraggingNode) {
    isDraggingNode = false;
    draggedNodeId = null;
  }

  if (isConnecting) {
    isConnecting = false;
    if (tempSvgLine && tempSvgLine.parentNode) {
      tempSvgLine.parentNode.removeChild(tempSvgLine);
    }
    tempSvgLine = null;

    // Check if released over an input port
    if (evt.target && evt.target.classList && evt.target.classList.contains("wf-input-port")) {
      var targetNodeId = evt.target.getAttribute("data-node");
      var targetPortId = evt.target.getAttribute("data-port");
      if (targetNodeId && targetNodeId !== connectionStartNodeId) {
        workflowConnections.push({
          fromNode: connectionStartNodeId,
          fromPort: connectionStartPort,
          toNode: targetNodeId,
          toPort: targetPortId
        });
        renderAllConnections();
        showMsg("Đã tạo kết nối Node thành công!", "success");
      }
    }
    connectionStartNodeId = null;
    connectionStartPort = null;
  }
}

function startConnectionDrag(evt, nodeId, portId) {
  isConnecting = true;
  connectionStartNodeId = nodeId;
  connectionStartPort = portId;

  var svgLayer = getElement("wf-svg-layer");
  if (!svgLayer) return;

  tempSvgLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tempSvgLine.setAttribute("stroke", "#10b981");
  tempSvgLine.setAttribute("stroke-width", "3");
  tempSvgLine.setAttribute("stroke-dasharray", "5,5");
  tempSvgLine.setAttribute("fill", "none");
  svgLayer.appendChild(tempSvgLine);
}

function createBezierPath(x1, y1, x2, y2) {
  var dx = Math.abs(x2 - x1) * 0.5;
  if (dx < 40) dx = 40;
  return "M " + x1 + " " + y1 + " C " + (x1 + dx) + " " + y1 + " " + (x2 - dx) + " " + y2 + " " + x2 + " " + y2;
}

function renderAllConnections() {
  var svgLayer = getElement("wf-svg-layer");
  if (!svgLayer) return;

  // Clear paths
  svgLayer.innerHTML = "";

  for (var i = 0; i < workflowConnections.length; i++) {
    var conn = workflowConnections[i];
    var fromNode = workflowNodes[conn.fromNode];
    var toNode = workflowNodes[conn.toNode];

    if (fromNode && toNode) {
      var startX = fromNode.posX + 200;
      var startY = fromNode.posY + 42;
      var endX = toNode.posX;
      var endY = toNode.posY + 42;

      var pathD = createBezierPath(startX, startY, endX, endY);
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathD);
      path.setAttribute("stroke", conn.active ? "#10b981" : "#64748b");
      path.setAttribute("stroke-width", conn.active ? "4" : "2.5");
      path.setAttribute("fill", "none");
      if (conn.active) {
        path.setAttribute("filter", "drop-shadow(0 0 6px #10b981)");
      }
      svgLayer.appendChild(path);
    }
  }
}

function updateNodeCountBadge() {
  var countBadge = getElement("wf-node-count");
  if (countBadge) {
    var total = Object.keys(workflowNodes).length;
    countBadge.innerText = total + " Nodes";
  }
}

function runWorkflowSimulation() {
  var wfStatus = getElement("wf-status-badge");
  var execTime = getElement("wf-exec-time");

  if (wfStatus) {
    wfStatus.innerText = "⏳ Simulation Running...";
    wfStatus.className = "badge";
  }

  showMsg("Bắt đầu mô phỏng chạy quy trình...", "info");

  var sequence = ["node-1", "node-2", "node-3", "node-4", "node-5"];
  var step = 0;
  var startTime = Date.now();

  function processStep() {
    if (step < sequence.length) {
      var nid = sequence[step];
      if (workflowNodes[nid]) {
        workflowNodes[nid].status = "Running";
        renderSingleNode(workflowNodes[nid]);
      }

      // Highlight connections
      for (var c = 0; c < workflowConnections.length; c++) {
        if (workflowConnections[c].fromNode === nid) {
          workflowConnections[c].active = true;
        }
      }
      renderAllConnections();

      setTimeout(function() {
        if (workflowNodes[nid]) {
          workflowNodes[nid].status = "Success";
          renderSingleNode(workflowNodes[nid]);
        }
        step++;
        processStep();
      }, 600);
    } else {
      var totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (wfStatus) {
        wfStatus.innerText = "🟢 Workflow Completed";
        wfStatus.className = "badge badge-active";
      }
      if (execTime) execTime.innerText = totalDuration + "s";
      showMsg("Mô phỏng quy trình hoàn thành trong " + totalDuration + "s!", "success");
    }
  }

  processStep();
}

function addNewWorkflowNode() {
  var total = Object.keys(workflowNodes).length + 1;
  var newId = "node-" + Date.now();
  var posX = 200 + Math.floor(Math.random() * 150);
  var posY = 100 + Math.floor(Math.random() * 150);

  workflowNodes[newId] = {
    id: newId,
    label: "⚙️ Custom Task #" + total,
    type: "Worker",
    status: "Idle",
    color: "#8b5cf6",
    endpoint: "Custom Processing",
    posX: posX,
    posY: posY,
    inputs: ["in-1"],
    outputs: ["out-1"],
    params: { task_id: total, created_at: new Date().toLocaleTimeString() }
  };

  renderAllNodes();
  updateNodeCountBadge();
  selectNode(newId);
  showMsg("Đã thêm Node mới vào sơ đồ!", "success");
}

function resetWorkflowGraph() {
  setupDefaultWorkflowNodes();
  var wfStatus = getElement("wf-status-badge");
  var execTime = getElement("wf-exec-time");
  if (wfStatus) {
    wfStatus.innerText = "🟢 Workflow Engine Ready";
    wfStatus.className = "badge badge-active";
  }
  if (execTime) execTime.innerText = "0.00s";
  showMsg("Đã reset trạng thái & sơ đồ Workflow!", "info");
}

function onWorkflowTabActive() {
  var container = getElement("drawflow");
  if (!container) return;
  if (Object.keys(workflowNodes).length === 0) {
    initWorkflowGraphCanvas();
  } else {
    renderAllNodes();
    renderAllConnections();
  }
}

// Auto Init on Page Load
if (typeof window !== "undefined") {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(initWorkflowGraphCanvas, 150);
  } else {
    window.addEventListener("DOMContentLoaded", function() {
      setTimeout(initWorkflowGraphCanvas, 150);
    });
  }
}
