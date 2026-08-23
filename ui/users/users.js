// --- Users Module Controller (ES5 / Sciter Compatible) ---
var currentUsers = [];

function loadUsers() {
  var url = (typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000") + "/api/users?_=" + Date.now();
  $.ajax({
    url: url,
    method: 'GET',
    success: function(response) {
      if (response && response.users) {
        currentUsers = response.users;
        renderUserTable(currentUsers);
      }
    },
    error: function(err) {
      log("Error loading users: " + (err ? err.message : ""));
    }
  });
}

function renderUserTable(users) {
  var tbody = getElement("user-table-body");
  if (!tbody) return;
  
  var html = "";
  if (!users || users.length === 0) {
    html = '<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 24px;">Không tìm thấy thành viên nào.</td></tr>';
  } else {
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var statusBadge = u.active 
        ? '<span class="badge badge-active">Active</span>' 
        : '<span class="badge badge-inactive">Inactive</span>';
        
      html += '<tr>' +
        '<td>#' + u.id + '</td>' +
        '<td><strong>' + escapeHtml(u.name) + '</strong></td>' +
        '<td>' + escapeHtml(u.email) + '</td>' +
        '<td>' + escapeHtml(u.gender || "Nam") + '</td>' +
        '<td>' + escapeHtml(u.join_date || "2026-01-01") + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><span class="badge">' + escapeHtml(u.role) + '</span></td>' +
        '<td class="action-btn-group" style="text-align: right;">' +
          '<button class="btn-edit" data-id="' + u.id + '">Sửa</button>' +
          '<button class="btn-delete" data-id="' + u.id + '">Xóa</button>' +
        '</td>' +
      '</tr>';
    }
  }
  tbody.innerHTML = html;
}

function openModal(user) {
  user = user || null;
  var modal = getElement("user-modal");
  var title = getElement("modal-title");
  if (!modal) return;
  
  if (user) {
    if (title) title.innerText = "Sửa Người Dùng #" + user.id;
    $('#field-id').val(user.id);
    $('#field-name').val(user.name);
    $('#field-email').val(user.email);
    $('#field-role').val(user.role);
    $('#field-active').prop('checked', user.active);
    
    if (user.gender === "Nữ") {
      $('#field-gender-female').prop('checked', true);
    } else {
      $('#field-gender-male').prop('checked', true);
    }
    
    $('#field-date').val(user.join_date || "2026-01-01");
    $('#field-notes').val(user.notes || "");
  } else {
    if (title) title.innerText = "Thêm Người Dùng Mới";
    $('#field-id').val("");
    $('#field-name').val("");
    $('#field-email').val("");
    $('#field-role').val("User");
    $('#field-active').prop('checked', true);
    $('#field-gender-male').prop('checked', true);
    $('#field-date').val("2026-01-01");
    $('#field-notes').val("");
  }
  
  modal.style.display = "flex";
}

function closeModal() {
  var modal = getElement("user-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function saveUser(evt) {
  if (evt && evt.preventDefault) evt.preventDefault();
  
  var id = $('#field-id').val();
  var name = $('#field-name').val().trim();
  var email = $('#field-email').val().trim();
  var role = $('#field-role').val();
  var active = $('#field-active').prop('checked');
  var gender = $('#field-gender-female').prop('checked') ? "Nữ" : "Nam";
  var join_date = $('#field-date').val();
  var notes = $('#field-notes').val().trim();

  if (!name || !email) {
    showMsg("Vui lòng nhập đầy đủ Họ tên và Email!", "danger");
    return;
  }

  var payload = { id: id, name: name, email: email, role: role, active: active, gender: gender, join_date: join_date, notes: notes };
  var isUpdate = !!id;
  var baseUrl = typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000";
  var endpoint = isUpdate ? (baseUrl + "/api/update_user") : (baseUrl + "/api/add_user");
  var method = isUpdate ? 'PUT' : 'POST';

  $.ajax({
    url: endpoint,
    method: method,
    data: payload,
    success: function(resp) {
      showMsg(resp.message || "Lưu thông tin thành công!", "success");
      closeModal();
      if (resp.users) {
        currentUsers = resp.users;
        renderUserTable(currentUsers);
      } else {
        loadUsers();
      }
    },
    error: function(err) {
      showMsg("Lỗi khi lưu: " + (err ? err.message : ""), "danger");
    }
  });
}

function deleteUser(id) {
  if (!id) return;
  var baseUrl = typeof API_URL !== 'undefined' ? API_URL : "http://127.0.0.1:5000";
  $.ajax({
    url: baseUrl + "/api/delete_user/" + id,
    method: 'DELETE',
    success: function(resp) {
      showMsg(resp.message || "Đã xóa người dùng!", "info");
      if (resp.users) {
        currentUsers = resp.users;
        renderUserTable(currentUsers);
      } else {
        loadUsers();
      }
    },
    error: function(err) {
      showMsg("Không thể xóa người dùng: " + (err ? err.message : ""), "danger");
    }
  });
}

// Event Delegation for Edit & Delete buttons
try {
  addEvent('#user-table-body', 'click', function(evt, target) {
    var btnEdit = target.closest ? target.closest('.btn-edit') : null;
    var btnDel = target.closest ? target.closest('.btn-delete') : null;
    
    if (btnEdit) {
      var id = btnEdit.getAttribute('data-id');
      var user = currentUsers.find(function(u) { return String(u.id) === String(id); });
      if (user) openModal(user);
    } else if (btnDel) {
      var idDel = btnDel.getAttribute('data-id');
      deleteUser(idDel);
    }
  });

  addEvent('#user-search-input', 'input', function(evt, el) {
    var query = (el.value || "").toLowerCase().trim();
    if (!query) {
      renderUserTable(currentUsers);
    } else {
      var filtered = currentUsers.filter(function(u) {
        return (u.name && u.name.toLowerCase().indexOf(query) > -1) ||
               (u.email && u.email.toLowerCase().indexOf(query) > -1) ||
               (u.role && u.role.toLowerCase().indexOf(query) > -1);
      });
      renderUserTable(filtered);
    }
  });
} catch (e) {}

// Deferred Load Users after window layout completes
setTimeout(loadUsers, 600);
