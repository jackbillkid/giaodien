// --- Files Module Controller (ES5 / Sciter Compatible) ---
var currentFiles = [];

function loadFiles() {
  var baseUrl = typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000";
  $.ajax({
    url: baseUrl + "/api/files?_=" + Date.now(),
    method: 'GET',
    success: function(resp) {
      if (resp && resp.status === "success") {
        currentFiles = resp.files || [];
        renderFileTable(currentFiles);
        
        var countBadge = getElement("file-count-badge");
        if (countBadge) countBadge.innerText = (resp.total_files || 0) + " tệp";
        
        var sizeBadge = getElement("file-size-badge");
        if (sizeBadge) sizeBadge.innerText = resp.total_size_formatted || "0 B";
      }
    },
    error: function(err) {
      log("Error loading files: " + (err ? err.message : ""));
    }
  });
}

function renderFileTable(files) {
  var tbody = getElement("file-table-body");
  if (!tbody) return;
  
  var html = "";
  if (!files || files.length === 0) {
    html = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 32px;">' +
      '📁 Thư mục trống. Hãy nhấn "Tải Lên Tệp Tin" để chọn tệp.' +
    '</td></tr>';
  } else {
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var icon = f.is_image ? "🖼️" : "📄";
      var baseUrl = typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000";
      var downloadUrl = baseUrl + "/api/download/" + encodeURIComponent(f.name);
      
      html += '<tr>' +
        '<td><span style="margin-right: 8px;">' + icon + '</span><strong>' + escapeHtml(f.name) + '</strong></td>' +
        '<td>' + escapeHtml(f.size_formatted) + '</td>' +
        '<td><span class="badge">' + escapeHtml(f.ext.toUpperCase()) + '</span></td>' +
        '<td>' + escapeHtml(f.modified) + '</td>' +
        '<td><span class="badge badge-active">Uploads</span></td>' +
        '<td class="action-btn-group" style="text-align: right;">' +
          '<a href="' + downloadUrl + '" class="primary" style="text-decoration:none; padding:4px 8px; font-size:0.8rem; border-radius:4px; margin-right:4px;">Tải về</a>' +
          '<button class="btn-delete-file" data-name="' + escapeHtml(f.name) + '" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; font-size:0.8rem; border-radius:4px; cursor:pointer;">Xóa</button>' +
        '</td>' +
      '</tr>';
    }
  }
  tbody.innerHTML = html;
}

function deleteFile(filename) {
  if (!filename) return;
  var baseUrl = typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000";
  $.ajax({
    url: baseUrl + "/api/delete_file/" + encodeURIComponent(filename),
    method: 'DELETE',
    success: function(resp) {
      showMsg(resp.message || "Đã xóa tệp tin!", "info");
      loadFiles();
    },
    error: function(err) {
      showMsg("Lỗi khi xóa tệp: " + (err ? err.message : ""), "danger");
    }
  });
}

function triggerFileSelect() {
  if (typeof Window !== 'undefined' && Window.this && typeof Window.this.select_and_upload_file === 'function') {
    try {
      Window.this.select_and_upload_file();
      setTimeout(loadFiles, 1200);
      return;
    } catch(e) {}
  }
  
  var fileInput = getElement("hidden-file-input");
  if (fileInput) fileInput.click();
}

function uploadSelectedFile(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
  var file = inputEl.files[0];
  var formData = new FormData();
  formData.append("file", file);

  var baseUrl = typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000";
  if (typeof fetch === 'function') {
    fetch(baseUrl + "/api/upload", {
      method: "POST",
      body: formData
    })
    .then(function(res) { return res.json(); })
    .then(function(resp) {
      if (resp && resp.status === "success") {
        showMsg(resp.message || "Tải tệp lên thành công!", "success");
        loadFiles();
      } else {
        showMsg(resp.message || "Lỗi khi tải tệp lên!", "danger");
      }
    })
    .catch(function(err) {
      showMsg("Lỗi kết nối máy chủ: " + (err ? err.message : ""), "danger");
    });
  }
}

// Attach Event Listeners
try {
  addEvent('#file-table-body', 'click', function(evt, target) {
    var btnDel = target.closest ? target.closest('.btn-delete-file') : null;
    if (btnDel) {
      var fname = btnDel.getAttribute('data-name');
      deleteFile(fname);
    }
  });

  addEvent('#file-search-input', 'input', function(evt, el) {
    var query = (el.value || "").toLowerCase().trim();
    if (!query) {
      renderFileTable(currentFiles);
    } else {
      var filtered = currentFiles.filter(function(f) {
        return f.name.toLowerCase().indexOf(query) > -1;
      });
      renderFileTable(filtered);
    }
  });
} catch(e) {}

// Deferred Load Files after window load
setTimeout(loadFiles, 600);
