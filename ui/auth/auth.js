// --- Auth Module Controller ---
function openLoginModal() {
  const modal = getElement("login-modal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeLoginModal() {
  const modal = getElement("login-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function handleLoginSubmit() {
  const emailEl = getElement("login-email");
  const email = emailEl ? emailEl.value : "";
  
  showMsg("Đăng nhập hệ thống thành công! Quyền: Admin", "success");
  closeLoginModal();
}
