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
  var cleanId = String(id).startsWith('#') ? String(id).slice(1) : String(id);
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

if (typeof window !== "undefined") {
  window.API_URL = API_URL;
  window.getElement = getElement;
}

// Universal <include src="..."> Polyfill for Web Browsers (HTTP Mode)
if (typeof document !== "undefined" && typeof window !== "undefined" && window.location && window.location.protocol && window.location.protocol.startsWith("http")) {
  var loadIncludes = function() {
    var includes = document.querySelectorAll("include[src]");
    for (var i = 0; i < includes.length; i++) {
      (function(inc) {
        var src = inc.getAttribute("src");
        if (src) {
          fetch(src)
            .then(function(res) { return res.text(); })
            .then(function(html) {
              var tempDiv = document.createElement("div");
              tempDiv.innerHTML = html;
              while (tempDiv.firstChild) {
                inc.parentNode.insertBefore(tempDiv.firstChild, inc);
              }
              inc.parentNode.removeChild(inc);
            })
            .catch(function(e) {});
        }
      })(includes[i]);
    }
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(loadIncludes, 50);
  } else {
    document.addEventListener("DOMContentLoaded", loadIncludes);
  }
}

// Sciter & Browser Polyfills
if (typeof document !== "undefined") {
  if (typeof document.createElementNS !== "function") {
    document.createElementNS = function(ns, tagName) {
      return document.createElement(tagName);
    };
  }
}

if (typeof Element !== "undefined") {
  if (typeof Element.prototype.setAttributeNS !== "function") {
    Element.prototype.setAttributeNS = function(ns, name, value) {
      return this.setAttribute(name, value);
    };
  }
  if (typeof Element.prototype.removeAttributeNS !== "function") {
    Element.prototype.removeAttributeNS = function(ns, name) {
      return this.removeAttribute(name);
    };
  }
}

// Safe Helper for Class Tokens
function safeGetClassList(el) {
  var cls = (typeof el.getAttribute === 'function' ? (el.getAttribute('class') || '') : (el.className || '')).trim();
  return cls.split(/\s+/).filter(Boolean);
}

// Safe Helper for Bounding Rect
function safeRect(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') {
    return { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0 };
  }
  var r = el.getBoundingClientRect();
  var l = r.left !== undefined ? r.left : (r.x || 0);
  var t = r.top !== undefined ? r.top : (r.y || 0);
  return {
    left: l,
    top: t,
    x: l,
    y: t,
    width: r.width || 0,
    height: r.height || 0
  };
}

if (typeof document !== "undefined") {
  try {
    document.getElementById = function(id) { return getElement(id); };
  } catch(e) {}
  if (typeof document.querySelector !== "function") {
    document.querySelector = function(selector) {
      if (typeof document.$ === "function") {
        return document.$(selector);
      }
      return null;
    };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function log(msg) {
  if (typeof console !== 'undefined' && console.log) {
    console.log("APP LOG:", msg);
  }
}

// Universal Event Delegation Helper for Sciter + Chrome
function addEvent(selector, eventName, handler) {
  if (typeof document === 'undefined') return;
  document.addEventListener(eventName, function(evt) {
    var target = null;
    if (evt && evt.target) {
      if (typeof evt.target.closest === 'function') {
        try { target = evt.target.closest(selector); } catch(e) {}
      }
      if (!target && typeof safeClosest === 'function') {
        target = safeClosest(evt.target, selector);
      }
    }
    if (target) {
      handler(evt, target);
    }
  });
}

// Mock jQuery ($) for Sciter & Chrome
var $ = function(selector) {
  if (typeof selector === 'string') {
    var el = getElement(selector);
    if (!el) {
      return {
        val: function() { return ""; },
        html: function() {},
        on: function() {},
        prop: function() { return false; },
        attr: function() { return null; },
        remove: function() {}
      };
    }
    
    return {
      element: el,
      val: function(value) {
        if (value !== undefined) {
          el.value = value;
          return this;
        }
        return el.value || "";
      },
      html: function(html) {
        if (html !== undefined) {
          el.innerHTML = html;
          return this;
        }
        return el.innerHTML;
      },
      on: function(event, handler) {
        if (typeof el.addEventListener === 'function') {
          el.addEventListener(event, handler);
        }
        return this;
      },
      prop: function(propertyName, value) {
        if (value !== undefined) {
          el[propertyName] = value;
          return this;
        }
        return el[propertyName];
      },
      attr: function(attrName, value) {
        if (value !== undefined) {
          el.setAttribute(attrName, value);
          return this;
        }
        return el.getAttribute(attrName);
      },
      remove: function() {
        if (typeof el.remove === 'function') {
          el.remove();
        } else if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }
    };
  }
  return selector;
};

$.ajax = function(options) {
  var url = options.url;
  var method = (options.method || options.type || 'GET').toUpperCase();
  var data = options.data;

  if (typeof XMLHttpRequest !== 'undefined') {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              var json = JSON.parse(xhr.responseText);
              if (options.success) options.success(json);
            } catch(e) {
              if (options.success) options.success(xhr.responseText);
            }
          } else {
            if (options.error) options.error({ message: "HTTP " + xhr.status });
          }
        }
      };
      xhr.send(method === 'GET' ? null : (typeof data === 'string' ? data : JSON.stringify(data)));
      return;
    } catch(e) {}
  }

  if (typeof fetch === 'function') {
    try {
      fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'GET' ? null : (typeof data === 'string' ? data : JSON.stringify(data))
      })
      .then(function(res) {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(function(json) {
        if (options.success) options.success(json);
      })
      .catch(function(err) {
        if (options.error) options.error(err);
      });
    } catch(e) {}
  }
};

// Toast Notification
function showToast(message, type) {
  type = type || 'info';
  log("Toast: [" + type + "] " + message);
  var container = getElement('toast-container');
  if (!container) {
    if (typeof alert !== 'undefined') alert(message);
    return;
  }
  
  var id = 'toast-' + Date.now() + Math.floor(Math.random() * 1000);
  var html = '<div id="' + id + '" class="toast ' + type + '">' +
    '<span>' + escapeHtml(message) + '</span>' +
    '<button class="toast-close" onclick="(getElement(\'' + id + '\') && getElement(\'' + id + '\').remove())">&times;</button>' +
  '</div>';
  
  if (typeof container.insertAdjacentHTML === 'function') {
    container.insertAdjacentHTML('beforeend', html);
  } else {
    container.innerHTML += html;
  }
  
  setTimeout(function() {
    var el = getElement(id);
    if (el && typeof el.remove === 'function') {
      el.remove();
    }
  }, 4000);
}

function showMsg(msg, type) {
  type = type || 'info';
  showToast(msg, type);
}

// Navigation Tab Router
function switchTab(tabName) {
  var tabs = ['dashboard', 'users', 'files', 'workflow', 'settings', 'components'];
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var nav = getElement('nav-' + t);
    var content = getElement('tab-' + t);
    if (nav) {
      if (t === tabName) nav.className = 'active';
      else nav.className = '';
    }
    if (content) {
      if (t === tabName) content.className = 'tab-content active';
      else content.className = 'tab-content';
    }
  }
  
  var titleEl = getElement('page-title');
  if (titleEl) {
    if (tabName === 'dashboard') titleEl.innerText = 'Tổng Quan Hệ Thống';
    else if (tabName === 'users') titleEl.innerText = 'Quản Lý Thành Viên';
    else if (tabName === 'files') titleEl.innerText = 'Quản Lý Tệp Tin';
    else if (tabName === 'workflow') titleEl.innerText = 'Quy Trình Tự Động Hóa Workflow';
    else if (tabName === 'settings') titleEl.innerText = 'Cấu Hình Hệ Thống';
    else if (tabName === 'components') titleEl.innerText = 'Bộ Elements & UI Components';
  }

  if (tabName === 'workflow' && typeof onWorkflowTabActive === 'function') {
    setTimeout(onWorkflowTabActive, 50);
  }
}

// Export window methods
if (typeof window !== "undefined") {
  window.$ = $;
  window.showMsg = showMsg;
  window.showToast = showToast;
  window.switchTab = switchTab;
  window.safeRect = safeRect;
  window.safeGetClassList = safeGetClassList;
}
