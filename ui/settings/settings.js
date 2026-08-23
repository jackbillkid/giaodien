// --- Settings Module Controller ---
function saveSettings() {
  const titleEl = getElement('setting-app-title');
  if (titleEl && titleEl.value) {
    const pageTitle = getElement('page-title');
    if (pageTitle) pageTitle.innerText = titleEl.value;
  }
  showMsg("Đã lưu thiết lập cấu hình hệ thống thành công!", "success");
}

try {
  addEvent('#settings-form', 'submit', function(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();
    saveSettings();
    return false;
  });
} catch(e) {}
