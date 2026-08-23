// --- Dashboard Module Controller ---
function initRealtime() {
  var url = typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000";
  var wsProto = url.indexOf("https") === 0 ? "wss" : "ws";
  var wsHost = url.replace("http://", "").replace("https://", "");
  var wsUrl = wsProto + "://" + wsHost + "/ws";

  if (typeof WebSocket === 'undefined') return;

  log("Connecting WebSocket to " + wsUrl);
  try {
    var ws = new WebSocket(wsUrl);

    ws.onopen = function() {
      log("WebSocket connection established!");
      var statusEl = getElement("stat-system-status");
      if (statusEl) {
        statusEl.innerText = "Online";
        statusEl.className = "stat success";
      }
    };

    ws.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === "stats") {
          var stats = msg.data;
          var totalUsersEl = getElement("stat-total-users");
          if (totalUsersEl) totalUsersEl.innerText = stats.total_users;

          var activeSessionsEl = getElement("stat-active-sessions");
          if (activeSessionsEl) activeSessionsEl.innerText = stats.active_sessions;

          var cpuUsageEl = getElement("stat-cpu-usage");
          if (cpuUsageEl) cpuUsageEl.innerText = stats.cpu_load;

          var ramUsageEl = getElement("stat-ram-usage");
          if (ramUsageEl) ramUsageEl.innerText = stats.ram_load;

          var statusEl = getElement("stat-system-status");
          if (statusEl) {
            statusEl.innerText = stats.status;
            statusEl.className = "stat success";
          }
        } else if (msg.type === "users_updated") {
          if (typeof renderUserTable === "function" && msg.users) {
            currentUsers = msg.users;
            renderUserTable(currentUsers);
          } else if (typeof loadUsers === "function") {
            loadUsers();
          }
        } else if (msg.type === "files_updated") {
          if (typeof loadFiles === "function") {
            loadFiles();
          }
        }
      } catch(e) {}
    };

    ws.onclose = function() {
      var statusEl = getElement("stat-system-status");
      if (statusEl) {
        statusEl.innerText = "Offline";
        statusEl.className = "stat danger";
      }
      setTimeout(initRealtime, 5000);
    };

    ws.onerror = function() {
      try { ws.close(); } catch(e) {}
    };
  } catch(e) {}
}

// Deferred Init Realtime after window load
setTimeout(initRealtime, 800);
