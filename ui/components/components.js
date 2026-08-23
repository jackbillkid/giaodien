// --- UI Components Module Controller ---
function updateSliderVal(elementId, value) {
  const el = getElement(elementId);
  if (el) {
    el.innerText = value;
  }
}

function handleSwitchChange(checkbox, featureName) {
  if (!checkbox) return;
  const status = checkbox.checked ? "ĐÃ BẬT" : "ĐÃ TẮT";
  showMsg(`Tính năng ${featureName}: ${status}`, checkbox.checked ? "success" : "info");
}
