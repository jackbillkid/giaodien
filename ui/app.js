var API_URL = "__DYNAMIC_API_URL__";
if (API_URL === "__DYNAMIC_API_URL__" || !API_URL.startsWith("http")) {
  if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http")) {
    API_URL = window.location.origin;
  } else {
    API_URL = "http://127.0.0.1:5000";
  }
}

// Universal element getter for Sciter & Chrome compatibility
function getElement(id) {
  if (!id) return null;
  if (typeof id === 'object') return id;
  const cleanId = String(id).startsWith('#') ? String(id).slice(1) : String(id);
  if (typeof document !== 'undefined') {
    if (typeof document.$ === 'function') {
      return document.$('#' + cleanId) || document.$('[id="' + cleanId + '"]');
    }
    if (typeof document.querySelector === 'function') {
      return document.querySelector('#' + cleanId);
    }
  }
  return null;
}

if (typeof document !== "undefined") {
  try {
    document.getElementById = function(id) { return getElement(id); };
  } catch(e) {}
  try {
    if (typeof Document !== 'undefined' && Document.prototype) {
      Document.prototype.getElementById = function(id) { return getElement(id); };
    }
  } catch(e) {}
  if (typeof document.querySelector !== "function") {
    document.querySelector = function(selector) {
      if (typeof document.$ === "function") {
        return document.$(selector);
      }
      return null;
    };
  }
  if (typeof document.querySelectorAll !== "function") {
    document.querySelectorAll = function(selector) {
      if (typeof document.$$ === "function") {
        return document.$$(selector);
      }
      return [];
    };
  }
}
if (typeof Element !== "undefined" && typeof Element.prototype.remove !== "function") {
  Element.prototype.remove = function() {
    if (typeof this.detach === "function") {
      this.detach();
    } else if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  };
}

// Environment detection
if (typeof Window !== "undefined" && Window.this) {
  if (document.body) document.body.classList.add("is-sciter");
} else {
  if (document.body) document.body.classList.add("is-chrome");
}

let currentUsers = [];
let currentFiles = [];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Logger Helper
function log(msg) {
  console.log("APP LOG:", msg);
}

// --- Mock jQuery ($) and Ajax Wrapper for Sciter.JS & Chrome ---
const $ = function(selector) {
  if (typeof selector === 'string') {
    const el = (typeof document.$ === 'function') ? document.$(selector) : document.querySelector(selector);
    if (!el) {
      return {
        val: () => "",
        html: () => {},
        on: () => {},
        prop: () => false,
        attr: () => null,
        remove: () => {}
      };
    }
    
    return {
      element: el,
      val: function(value) {
        if (value !== undefined) {
          if (el.tagName === 'SELECT' || el.tagName === 'select') {
            el.value = value;
            for (let i = 0; i < el.options.length; i++) {
              let opt = el.options[i];
              if (opt.value === value) {
                opt.setAttribute("selected", "true");
              } else {
                opt.removeAttribute("selected");
              }
            }
          } else {
            el.value = value;
          }
          return this;
        }
        return el.value;
      },
      html: function(html) {
        if (html !== undefined) {
          el.innerHTML = html;
          return this;
        }
        return el.innerHTML;
      },
      on: function(event, handler) {
        if (typeof el.on === 'function') {
          el.on(event, handler);
        } else if (typeof el.addEventListener === 'function') {
          el.addEventListener(event, handler);
        }
        return this;
      },
      prop: function(propertyName, value) {
        if (value !== undefined) {
          if (propertyName === 'checked') {
            el.checked = !!value;
            if (el.state) el.state.checked = !!value;
          } else {
            el[propertyName] = value;
          }
          return this;
        }
        if (propertyName === 'checked') {
          return (el.state && el.state.checked !== undefined) ? el.state.checked : el.checked;
        }
        return el[propertyName];
      },
      attr: function(attributeName, value) {
        if (value !== undefined) {
          el.setAttribute(attributeName, value);
          return this;
        }
        return el.getAttribute(attributeName) || (el.attributes && el.attributes[attributeName]);
      },
      remove: function() {
        el.remove();
      }
    };
  } else if (typeof selector === 'function') {
    if (typeof document.on === 'function') {
      document.on('ready', selector);
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', selector);
    } else {
      selector();
    }
  }
};

$.ajax = async function(options) {
  try {
    const fetchOptions = {
      method: options.type || options.method || 'GET',
      headers: options.headers || { 'Content-Type': 'application/json' }
    };
    if (options.data) {
      fetchOptions.body = JSON.stringify(options.data);
    }
    const response = await fetch(options.url, fetchOptions);
    const result = await response.json();
    if (options.success) options.success(result);
  } catch (error) {
    if (options.error) options.error(error);
  }
};

// Non-blocking Toast Notification
function showToast(message, type = 'info') {
  log("Toast: [" + type + "] " + message);
  const container = getElement('toast-container');
  if (!container) {
    if (typeof alert !== 'undefined') alert(message);
    return;
  }
  
  const id = 'toast-' + Date.now() + Math.floor(Math.random() * 1000);
  const html = `<div id="${id}" class="toast ${type}">
    <span>${message}</span>
    <button class="toast-close" onclick="getElement('${id}').remove()">&times;</button>
  </div>`;
  
  container.insertAdjacentHTML('beforeend', html);
  
  setTimeout(() => {
    const el = getElement(id);
    if (el) el.remove();
  }, 4000);
}

function showMsg(msg, type = 'info') {
  showToast(msg, type);
}

// --- Tab Navigation ---
function switchTab(tabId) {
  try {
    const tabs = ['dashboard', 'users', 'files', 'settings'];
    
    // Update menu active state
    for (let i = 0; i < tabs.length; i++) {
      let t = tabs[i];
      let nav = getElement('nav-' + t);
      if (nav) {
        if (t === tabId) {
          nav.className = 'active';
        } else {
          nav.className = '';
        }
      }
    }
    
    // Update page title
    const titleMap = {
      'dashboard': 'Tổng Quan Hệ Thống',
      'users': 'Quản Lý Thành Viên',
      'files': 'Quản Lý Tệp Tin',
      'settings': 'Cài Đặt Hệ Thống'
    };
    const titleEl = getElement('page-title');
    if (titleEl) {
      titleEl.innerHTML = titleMap[tabId] || 'SmartApp';
    }
    
    // Update tab content
    for (let i = 0; i < tabs.length; i++) {
      let t = tabs[i];
      let content = getElement('tab-' + t);
      if (content) {
        if (t === tabId) {
          content.className = 'tab-content active';
        } else {
          content.className = 'tab-content';
        }
      }
    }

    if (tabId === 'users') {
      loadUsers();
    } else if (tabId === 'files') {
      loadFiles();
    }
  } catch (error) {
    log("Tab Switch Error: " + error.message);
  }
}

// --- CRUD User logic (using JQuery AJAX) ---
function loadUsers() {
  $.ajax({
    url: `${API_URL}/api/users?_=${Date.now()}`,
    method: 'GET',
    success: function(result) {
      if (result.status === "success") {
        currentUsers = result.users;
        renderUserTable(currentUsers);
      } else {
        showMsg("Lỗi tải danh sách: " + result.message, "danger");
      }
    },
    error: function(error) {
      log("loadUsers connection error: " + error.message);
      showMsg("Lỗi kết nối API: " + error.message, "danger");
    }
  });
}

function renderUserTable(users) {
  const tbody = getElement("user-table-body");
  if (!tbody) return;
  
  let html = "";
  if (users.length === 0) {
    html = `<tr><td colspan="8" style="text-align:center; color:#999;">Không có thành viên nào.</td></tr>`;
  } else {
    for (let i = 0; i < users.length; i++) {
      let u = users[i];
      const activeBadge = u.active 
        ? `<span class="badge-active">Active</span>` 
        : `<span class="badge-inactive">Inactive</span>`;
      
      html += `<tr>
        <td>${u.id}</td>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td>${u.gender || "Nam"}</td>
        <td>${u.join_date || "N/A"}</td>
        <td>${activeBadge}</td>
        <td><span class="badge">${u.role}</span></td>
        <td class="action-btn-group">
          <button class="btn-edit" data-id="${u.id}" onclick="editUserById(${u.id})">Sửa</button>
          <button class="danger btn-delete" data-id="${u.id}" onclick="deleteUserById(${u.id})">Xóa</button>
        </td>
      </tr>`;
    }
  }
  tbody.innerHTML = html;
}

function editUserById(id) {
  try {
    const numericId = parseInt(id);
    const user = currentUsers.find(u => u.id == numericId);
    log("editUserById called with id " + numericId + ", found: " + JSON.stringify(user));
    if (user) {
      openModal(user);
    } else {
      showMsg("Lỗi: Không tìm thấy thành viên ID " + numericId, "danger");
    }
  } catch(e) {
    showMsg("Lỗi mở form sửa: " + e.message, "danger");
  }
}

function openModal(user = null) {
  try {
    const modal = getElement("user-modal");
    const title = getElement("modal-title");
    
    if (!modal || !title) return;
    
    if (user) {
      title.innerHTML = "Cập Nhật Người Dùng";
      $("#field-id").val(user.id);
      $("#field-name").val(user.name);
      $("#field-email").val(user.email);
      $("#field-date").val(user.join_date || "");
      $("#field-notes").val(user.notes || "");
      $("#field-role").val(user.role);
      
      // Handle Radios
      const isFemale = user.gender === "Nữ";
      $("#field-gender-female").prop("checked", isFemale);
      $("#field-gender-male").prop("checked", !isFemale);
      
      // Handle Checkbox
      $("#field-active").prop("checked", !!user.active);
    } else {
      title.innerHTML = "Thêm Người Dùng";
      $("#field-id").val("");
      $("#field-name").val("");
      $("#field-email").val("");
      $("#field-date").val("");
      $("#field-notes").val("");
      $("#field-role").val("User");
      
      $("#field-gender-female").prop("checked", false);
      $("#field-gender-male").prop("checked", true);
      $("#field-active").prop("checked", true);
    }
    
    // Set inline style display to block for 100% reliable visibility control
    modal.style.display = "block";
    log("Modal opened successfully.");
  } catch(e) {
    showMsg("Lỗi khi mở form nhập liệu: " + e.message, "danger");
  }
}

function closeModal() {
  const modal = getElement("user-modal");
  if (modal) {
    // Set inline style display to none
    modal.style.display = "none";
  }
}

function saveUser(e) {
  if (e) e.preventDefault();
  
  const id = $("#field-id").val();
  const name = $("#field-name").val();
  const email = $("#field-email").val();
  const join_date = $("#field-date").val();
  const notes = $("#field-notes").val();
  const role = $("#field-role").val();
  
  // Extract Gender radio value
  const gender = $("#field-gender-female").prop("checked") ? "Nữ" : "Nam";
  
  // Extract Active status checkbox value
  const active = $("#field-active").prop("checked");
  
  const payload = { name, email, role, gender, join_date, active, notes };
  let endpoint = "/api/add_user";
  let method = "POST";
  
  if (id) {
    payload.id = id;
    endpoint = "/api/update_user";
    method = "PUT";
  }
  
  $.ajax({
    url: `${API_URL}${endpoint}`,
    method: method,
    data: payload,
    success: function(result) {
      if (result.status === "success") {
        showMsg(result.message, "success");
        closeModal();
        loadUsers();
      } else {
        showMsg("Lỗi: " + result.message, "danger");
      }
    },
    error: function(error) {
      showMsg("Lỗi lưu thông tin: " + error.message, "danger");
    }
  });
  
  return true;
}

function deleteUserById(id) {
  $.ajax({
    url: `${API_URL}/api/delete_user`,
    method: 'DELETE',
    data: { id: id },
    success: function(result) {
      if (result.status === "success") {
        showMsg(result.message, "success");
        loadUsers();
      } else {
        showMsg("Lỗi: " + result.message, "danger");
      }
    },
    error: function(error) {
      showMsg("Lỗi kết nối: " + error.message, "danger");
    }
  });
}



// Universal Event Delegation Helper for Sciter + Chrome
function addEvent(selector, eventName, handler) {
  if (typeof document.on === 'function') {
    document.on(eventName, selector, function(evt, el) {
      handler(evt, el || this);
    });
  } else {
    document.addEventListener(eventName, function(evt) {
      const target = evt.target && evt.target.closest ? evt.target.closest(selector) : null;
      if (target) {
        handler(evt, target);
      }
    });
  }
}

// --- Attach Event Listeners ---
try {
  // Navigation
  addEvent('#nav-dashboard', 'click', function() { switchTab('dashboard'); });
  addEvent('#nav-users', 'click', function() { switchTab('users'); });
  addEvent('#nav-files', 'click', function() { switchTab('files'); });
  addEvent('#nav-settings', 'click', function() { switchTab('settings'); });

  // Modal actions
  addEvent('#btn-open-add-modal', 'click', function() { openModal(); });
  addEvent('#btn-close-modal', 'click', function() { closeModal(); });
  addEvent('#btn-cancel-modal', 'click', function() { closeModal(); });
  addEvent('#btn-save-user', 'click', function(evt) { saveUser(evt); });
  
  // Upload actions
  addEvent('.upload-btn', 'click', function() { triggerFileSelect(); });
  addEvent('#dropzone', 'click', function() { triggerFileSelect(); });
  
  // Submit Form fallback
  addEvent('#user-form', 'submit', function(evt) {
    saveUser(evt);
    return true;
  });

  // Table row actions (Edit & Delete delegation)
  addEvent('.btn-edit', 'click', function(evt, el) {
    try {
      const dataId = el.getAttribute('data-id') || (el.attributes && el.attributes['data-id']);
      log("Edit button clicked, raw data-id: " + dataId);
      if (!dataId) {
        showMsg("Lỗi: Không tìm thấy ID trên nút Sửa", "danger");
        return;
      }
      const id = parseInt(dataId);
      const user = currentUsers.find(u => u.id == id);
      log("Found user to edit: " + JSON.stringify(user));
      if (user) {
        openModal(user);
      } else {
        showMsg("Lỗi: Không tìm thấy thông tin thành viên ID " + id, "danger");
      }
    } catch(e) {
      log("btn-edit click handler error: " + e.message);
      showMsg("Lỗi nút Sửa: " + e.message, "danger");
    }
  });

  addEvent('.btn-delete', 'click', function(evt, el) {
    try {
      const dataId = el.getAttribute('data-id') || (el.attributes && el.attributes['data-id']);
      log("Delete button clicked, raw data-id: " + dataId);
      if (!dataId) {
        showMsg("Lỗi: Không tìm thấy ID trên nút Xóa", "danger");
        return;
      }
      const id = parseInt(dataId);
      deleteUserById(id);
    } catch(e) {
      log("btn-delete click handler error: " + e.message);
      showMsg("Lỗi nút Xóa: " + e.message, "danger");
    }
  });

  // File Upload input listener
  addEvent('#file-upload-input', 'change', function(evt, el) {
    handleFileInputChange(el);
  });

  // Dropzone drag-and-drop listeners
  addEvent('#dropzone', 'dragenter', function(evt, el) {
    if (evt && evt.preventDefault) evt.preventDefault();
    if (el && el.classList) el.classList.add('dragover');
    return true;
  });
  addEvent('#dropzone', 'dragover', function(evt, el) {
    if (evt && evt.preventDefault) evt.preventDefault();
    if (el && el.classList) el.classList.add('dragover');
    return true;
  });
  addEvent('#dropzone', 'dragleave', function(evt, el) {
    if (evt && evt.preventDefault) evt.preventDefault();
    if (el && el.classList) el.classList.remove('dragover');
  });
  addEvent('#dropzone', 'drop', function(evt, el) {
    if (evt && evt.preventDefault) evt.preventDefault();
    if (el && el.classList) el.classList.remove('dragover');
    
    log("Drop event triggered:", evt);
    
    let rawFiles = null;
    if (evt && evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files.length) {
      rawFiles = evt.dataTransfer.files;
    } else if (evt && evt.detail && evt.detail.files && evt.detail.files.length) {
      rawFiles = evt.detail.files;
    } else if (evt && evt.detail && typeof evt.detail === 'object') {
      rawFiles = evt.detail;
    } else if (evt && evt.files && evt.files.length) {
      rawFiles = evt.files;
    } else if (evt && evt.value) {
      rawFiles = evt.value;
    }
    
    log("Extracted drop files:", rawFiles);

    if (rawFiles) {
      if (Array.isArray(rawFiles) || rawFiles.length !== undefined) {
        for (let i = 0; i < rawFiles.length; i++) {
          let item = rawFiles[i];
          if (typeof item === 'string') {
            uploadSciterFile(item);
          } else if (item && item.path) {
            uploadSciterFile(item.path);
          } else if (item) {
            upload(item);
          }
        }
      } else if (typeof rawFiles === 'string') {
        uploadSciterFile(rawFiles);
      } else if (rawFiles.path) {
        uploadSciterFile(rawFiles.path);
      } else {
        upload(rawFiles);
      }
    }
    return true;
  });

  // File search filter listener
  addEvent('#file-search-input', 'input', function(evt, el) {
    const query = (el.value || "").toLowerCase().trim();
    if (!query) {
      renderFileTable(currentFiles);
    } else {
      const filtered = currentFiles.filter(f => f.name.toLowerCase().includes(query));
      renderFileTable(filtered);
    }
  });

  // User search filter listener
  addEvent('#user-search-input', 'input', function(evt, el) {
    const query = (el.value || "").toLowerCase().trim();
    if (!query) {
      renderUserTable(currentUsers);
    } else {
      const filtered = currentUsers.filter(u => 
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.role && u.role.toLowerCase().includes(query))
      );
      renderUserTable(filtered);
    }
  });
} catch (e) {
  console.error("Event binding error:", e);
}

function saveSettings() {
  const titleEl = getElement('setting-app-title');
  if (titleEl && titleEl.value) {
    const pageTitle = getElement('page-title');
    if (pageTitle) pageTitle.innerText = titleEl.value;
  }
  showMsg("Đã lưu thiết lập cấu hình hệ thống thành công!", "success");
}

// --- Real-time WebSocket connection ---
function initRealtime() {
  const wsProto = API_URL.startsWith("https") ? "wss" : "ws";
  const wsHost = API_URL.replace("http://", "").replace("https://", "");
  const wsUrl = `${wsProto}://${wsHost}/ws`;
  
  log("Connecting WebSocket to " + wsUrl);
  let ws = new WebSocket(wsUrl);
  
  ws.onopen = function() {
    log("WebSocket connection established!");
    const statusEl = getElement("stat-system-status");
    if (statusEl) {
      statusEl.innerHTML = "Online";
      statusEl.className = "stat success";
    }
  };
  
  ws.onmessage = function(event) {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "stats") {
        const stats = msg.data;
        
        const totalUsersEl = getElement("stat-total-users");
        if (totalUsersEl) totalUsersEl.innerHTML = stats.total_users;
        
        const activeSessionsEl = getElement("stat-active-sessions");
        if (activeSessionsEl) activeSessionsEl.innerHTML = stats.active_sessions;
        
        const cpuUsageEl = getElement("stat-cpu-usage");
        if (cpuUsageEl) cpuUsageEl.innerHTML = stats.cpu_load;
        
        const ramUsageEl = getElement("stat-ram-usage");
        if (ramUsageEl) ramUsageEl.innerHTML = stats.ram_load;
        
        const statusEl = getElement("stat-system-status");
        if (statusEl && stats.status) {
          statusEl.innerHTML = stats.status;
          statusEl.className = "stat success";
        }
      } else if (msg.type === "users_updated") {
        log("WebSocket notified users_updated. Reloading table.");
        if (msg.users) {
          currentUsers = msg.users;
          renderUserTable(currentUsers);
        } else {
          loadUsers();
        }
      } else if (msg.type === "files_updated") {
        log("WebSocket notified files_updated. Reloading file list.");
        loadFiles();
      }
    } catch(e) {
      log("WebSocket message processing error: " + e.message);
    }
  };
  
  ws.onclose = function() {
    log("WebSocket closed. Reconnecting in 3 seconds...");
    const statusEl = getElement("stat-system-status");
    if (statusEl) {
      statusEl.innerHTML = "Offline";
      statusEl.className = "stat danger";
    }
    setTimeout(initRealtime, 3000);
  };
  
  ws.onerror = function(err) {
    log("WebSocket error: " + (err.message || "Unknown error"));
    ws.close();
  };
}

// --- File Storage & Management Logic ---
function loadFiles() {
  $.ajax({
    url: `${API_URL}/api/files?_=${Date.now()}`,
    method: 'GET',
    success: function(result) {
      if (result.status === "success") {
        currentFiles = result.files || [];
        
        const countBadge = getElement("file-count-badge");
        if (countBadge) countBadge.innerHTML = `${result.total_files || 0} tệp`;
        
        const sizeBadge = getElement("file-size-badge");
        if (sizeBadge) sizeBadge.innerHTML = result.total_size_formatted || "0 B";
        
        renderFileTable(currentFiles);
      } else {
        showMsg("Lỗi tải danh sách tệp: " + result.message, "danger");
      }
    },
    error: function(error) {
      log("loadFiles connection error: " + (error.message || "Unknown error"));
    }
  });
}

function getFileIcon(ext) {
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
  const codeExts = ['js', 'py', 'html', 'css', 'json', 'txt', 'md', 'xml'];
  const pdfExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
  
  if (imageExts.includes(ext)) return '🖼️';
  if (archiveExts.includes(ext)) return '📦';
  if (codeExts.includes(ext)) return '📄';
  if (pdfExts.includes(ext)) return '📑';
  return '📁';
}

function renderFileTable(files) {
  const tbody = getElement("file-table-body");
  if (!tbody) return;
  
  let html = "";
  if (!files || files.length === 0) {
    html = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 24px;">Chưa có tệp tin nào được lưu trữ.</td></tr>`;
  } else {
    for (let i = 0; i < files.length; i++) {
      let f = files[i];
      let icon = getFileIcon(f.ext);
      
      html += `<tr>
        <td><strong>${icon} ${escapeHtml(f.name)}</strong></td>
        <td><span class="badge">${f.size_formatted}</span></td>
        <td style="color: var(--text-secondary);">${f.mod_time}</td>
        <td class="action-btn-group" style="text-align: right;">
          <button class="btn-download" onclick="downloadFileByName('${escapeJsString(f.name)}')">Tải về</button>
          <button class="btn-delete" onclick="deleteFileByName('${escapeJsString(f.name)}')">Xóa</button>
        </td>
      </tr>`;
    }
  }
  tbody.innerHTML = html;
}

function deleteFileByName(filename) {
  if (!confirm(`Bạn có chắc chắn muốn xóa tệp "${filename}"?`)) {
    return;
  }
  $.ajax({
    url: `${API_URL}/api/delete_file/${encodeURIComponent(filename)}`,
    method: 'DELETE',
    type: 'DELETE',
    success: function(result) {
      if (result.status === "success") {
        showMsg(result.message, "success");
        loadFiles();
      } else {
        showMsg("Lỗi xóa tệp: " + result.message, "danger");
      }
    },
    error: function(err) {
      showMsg("Lỗi kết nối khi xóa tệp: " + (err.message || "Unknown error"), "danger");
    }
  });
}

function upload(file) {
  if (!file) return;
  
  const progressContainer = getElement("upload-progress-container");
  const progressBar = getElement("upload-progress-bar");
  const filenameEl = getElement("upload-filename");
  const percentageEl = getElement("upload-percentage");
  
  if (progressContainer) progressContainer.style.display = "block";
  if (filenameEl) filenameEl.innerText = `Đang tải: ${file.name}`;
  if (progressBar) progressBar.style.width = "0%";
  if (percentageEl) percentageEl.innerText = "0%";
  
  const formData = new FormData();
  formData.append("file", file);
  
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${API_URL}/api/upload`, true);
  
  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      if (progressBar) progressBar.style.width = percent + "%";
      if (percentageEl) percentageEl.innerText = percent + "%";
    }
  };
  
  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        const resp = JSON.parse(xhr.responseText);
        if (resp.status === "success") {
          showMsg(resp.message || "Tải tệp lên thành công!", "success");
          loadFiles();
        } else {
          showMsg("Lỗi tải tệp lên: " + resp.message, "danger");
        }
      } catch(e) {
        showMsg("Tải tệp thành công!", "success");
        loadFiles();
      }
    } else {
      showMsg("Lỗi server khi tải tệp lên (" + xhr.status + ")", "danger");
    }
    setTimeout(() => {
      if (progressContainer) progressContainer.style.display = "none";
    }, 1500);
  };
  
  xhr.onerror = function() {
    showMsg("Lỗi kết nối mạng khi tải tệp lên", "danger");
    if (progressContainer) progressContainer.style.display = "none";
  };
  
  xhr.send(formData);
}

function handleFileInputChange(input) {
  if (!input) return;
  if (input.files && input.files[0]) {
    upload(input.files[0]);
  } else if (input.value) {
    uploadSciterFile(input.value);
  }
}

async function triggerFileSelect() {
  log("triggerFileSelect triggered");
  
  // 1. Try Direct Python Script Bridge (xcall select_and_upload_file)
  if (typeof Window !== "undefined" && Window.this && typeof Window.this.xcall === "function") {
    try {
      log("Calling Python select_and_upload_file bridge...");
      const res = Window.this.xcall("select_and_upload_file");
      if (res && res.status === "success") {
        showMsg("Đã tải lên tệp: " + (res.filename || "thành công"), "success");
        loadFiles();
        return;
      } else if (res && res.status === "cancelled") {
        return;
      }
    } catch(e) {
      log("xcall select_and_upload_file error: " + e.message);
    }
  }

  // 2. Try Sciter JS Window.this.selectFile
  if (typeof Window !== "undefined" && Window.this && typeof Window.this.selectFile === "function") {
    try {
      let fn = null;
      try {
        fn = Window.this.selectFile({ filter: "All Files (*.*)|*.*", mode: "open" });
      } catch(e1) {
        fn = Window.this.selectFile("open", "All Files (*.*)|*.*");
      }
      log("Sciter selectFile result: " + fn);
      if (fn && typeof fn === 'string') {
        uploadSciterFile(fn);
        return;
      }
    } catch(e) {
      log("Sciter selectFile error: " + e.message);
    }
  }
  
  // 3. Try Native Python API Endpoint if running in Sciter App
  if (document.body && document.body.classList.contains("is-sciter")) {
    try {
      log("Calling /api/select_file endpoint...");
      const resp = await fetch(`${API_URL}/api/select_file`);
      const data = await resp.json();
      if (data && data.status === "success" && data.filepath) {
        uploadSciterFile(data.filepath);
        return;
      }
    } catch(e) {
      log("Native select_file endpoint error: " + e.message);
    }
  }

  // 4. Browser Input Fallback
  const input = getElement('file-upload-input');
  if (input) {
    input.value = "";
    input.click();
  }
}

async function uploadSciterFile(filePath) {
  if (!filePath) return;
  try {
    log("Uploading Sciter file by path: " + filePath);
    const formData = new FormData();
    formData.append("filepath", filePath);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/upload`, true);

    xhr.onload = async function() {
      if (xhr.status === 200) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.status === "success") {
            showMsg(resp.message || "Tải tệp lên thành công!", "success");
            loadFiles();
            return;
          }
        } catch(e) {}
      }
      
      // Fallback: fetch local file URL as Blob if backend filepath copy returned error
      try {
        let cleanPath = String(filePath).replace(/^file:\/*/, '').replace(/\\/g, '/');
        let url = "file:///" + cleanPath;
        log("Fallback fetch Sciter file URL: " + url);
        const resp = await fetch(url);
        const blob = await resp.blob();
        const filename = cleanPath.split('/').pop() || "file";
        const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
        upload(file);
      } catch(fetchErr) {
        showMsg("Lỗi tải tệp lên: " + (xhr.responseText || fetchErr.message), "danger");
      }
    };

    xhr.onerror = function() {
      showMsg("Lỗi kết nối khi tải tệp lên", "danger");
    };

    xhr.send(formData);
  } catch(e) {
    log("uploadSciterFile error: " + e.message);
    showMsg("Lỗi tải tệp: " + e.message, "danger");
  }
}

function downloadFileByName(filename) {
  const url = `${API_URL}/api/download/${encodeURIComponent(filename)}`;
  log("Downloading file: " + url);
  if (typeof window !== "undefined" && window.open) {
    window.open(url, '_blank');
  } else {
    window.location.href = url;
  }
}

// Init Load
loadUsers();
loadFiles();
initRealtime();
