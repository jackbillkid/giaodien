import os
import sys
import threading
import tempfile
import shutil
import urllib.request
from flask import Flask, request, jsonify

class SciterGUIManager:
    def __init__(self, port=5000, host="127.0.0.1"):
        """
        Khởi tạo GUIManager tự chứa hoàn toàn giao diện (HTML/CSS/JS) và
        cho phép liên kết hành động từ Python thông qua các decorators.
        """
        self.port = port
        self.host = host
        self.flask_app = Flask("SciterGUIManager")
        self.sciter_window = None
        self.temp_dir = None
        
        # Danh sách các hàm callback mặc định (sẽ được ghi đè bằng Decorators từ bên ngoài)
        self._callbacks = {
            'save': lambda data: f"Default Save: {data}",
            'update': lambda item_id, new_data: f"Default Update: {item_id} -> {new_data}",
            'delete': lambda item_id: f"Default Delete: {item_id}",
            'open_file': lambda path: f"Default Open File: {path}",
            'open_folder': lambda path: f"Default Open Folder: {path}",
            'upload_image': lambda file, filepath: f"Default Upload: {filepath}",
            'handle_drop': lambda filepath: f"Default Drop: {filepath}",
        }
        
        # Cấu hình CORS để tránh lỗi bảo mật khi gọi từ file://
        @self.flask_app.after_request
        def after_request(response):
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            return response

        self._setup_api_routes()

    def _setup_api_routes(self):
        """
        Định nghĩa các route API nội bộ gọi tới các callback đã được đăng ký.
        """
        @self.flask_app.route('/api/save', methods=['POST'])
        def api_save():
            data = request.json.get('data')
            res = self._callbacks['save'](data)
            return jsonify({"result": res})

        @self.flask_app.route('/api/update', methods=['POST'])
        def api_update():
            req_data = request.json
            item_id = req_data.get('id')
            new_data = req_data.get('new_data')
            res = self._callbacks['update'](item_id, new_data)
            return jsonify({"result": res})

        @self.flask_app.route('/api/delete', methods=['POST'])
        def api_delete():
            item_id = request.json.get('id')
            res = self._callbacks['delete'](item_id)
            return jsonify({"result": res})

        @self.flask_app.route('/api/open_file', methods=['POST'])
        def api_open_file():
            path = request.json.get('path')
            res = self._callbacks['open_file'](path)
            return jsonify({"result": res})

        @self.flask_app.route('/api/open_folder', methods=['POST'])
        def api_open_folder():
            path = request.json.get('path')
            res = self._callbacks['open_folder'](path)
            return jsonify({"result": res})

        @self.flask_app.route('/api/upload_image', methods=['POST'])
        def api_upload_image():
            if 'file' not in request.files:
                return jsonify({"result": "Không nhận được file"}), 400
            file = request.files['file']
            filepath = request.form.get('filepath', '')
            res = self._callbacks['upload_image'](file, filepath)
            return jsonify({"result": res})

        @self.flask_app.route('/api/handle_drop', methods=['POST'])
        def api_handle_drop():
            filepath = request.json.get('filepath')
            res = self._callbacks['handle_drop'](filepath)
            return jsonify({"result": res})

    # Các Decorators đăng ký callback cho ứng dụng bên ngoài sử dụng
    def on_save(self, func):
        self._callbacks['save'] = func
        return func

    def on_update(self, func):
        self._callbacks['update'] = func
        return func

    def on_delete(self, func):
        self._callbacks['delete'] = func
        return func

    def on_open_file(self, func):
        self._callbacks['open_file'] = func
        return func

    def on_open_folder(self, func):
        self._callbacks['open_folder'] = func
        return func

    def on_upload_image(self, func):
        self._callbacks['upload_image'] = func
        return func

    def on_drop(self, func):
        self._callbacks['handle_drop'] = func
        return func

    def start(self):
        """
        Bắt đầu chạy Flask ngầm và mở cửa sổ giao diện Sciter.
        """
        import sciter
        from sciter import window

        # Nội dung file HTML giao diện
        HTML_CONTENT = """<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="style.css">
  <script src="app.js"></script>
</head>
<body>
  <h1>Demo Sciter CRUD + File</h1>
  <button onclick="save()">Save</button>
  <button onclick="update()">Update</button>
  <button onclick="del()">Delete</button>
  <button onclick="openFile()">Open File</button>
  <button onclick="openFolder()">Open Folder</button>
  <input type="file" onchange="upload(this.files[0])">
  <div id="dropzone" ondrop="dropHandler(event)" ondragover="event.preventDefault()">
    Kéo thả file vào đây
  </div>
</body>
</html>"""

        # Nội dung file CSS
        CSS_CONTENT = """body {
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #f7f9fc;
  color: #333333;
  padding: 20px;
}
h1 {
  color: #1a73e8;
}
#dropzone {
  width: 300px;
  height: 100px;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 15px;
  background-color: #ffffff;
}"""

        # Nội dung file JS (Có chứa API_URL giả định để thay thế bằng cổng động)
        JS_CONTENT = """const API_URL = "__DYNAMIC_API_URL__";

async function save() {
  try {
    const response = await fetch(`${API_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: "Dữ liệu mới" })
    });
    const result = await response.json();
    alert(result.result);
  } catch (error) {
    alert("Lỗi: " + error);
  }
}

async function update() {
  try {
    const response = await fetch(`${API_URL}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, new_data: "Dữ liệu sửa" })
    });
    const result = await response.json();
    alert(result.result);
  } catch (error) {
    alert("Lỗi: " + error);
  }
}

async function del() {
  try {
    const response = await fetch(`${API_URL}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1 })
    });
    const result = await response.json();
    alert(result.result);
  } catch (error) {
    alert("Lỗi: " + error);
  }
}

async function openFile() {
  try {
    const response = await fetch(`${API_URL}/open_file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: "test.txt" })
    });
    const result = await response.json();
    alert(result.result);
  } catch (error) {
    alert("Lỗi: " + error);
  }
}

async function openFolder() {
  try {
    const response = await fetch(`${API_URL}/open_folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: "C:\\\\Users" })
    });
    const result = await response.json();
    alert(result.result);
  } catch (error) {
    alert("Lỗi: " + error);
  }
}

async function upload(file) {
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filepath', file.path || '');

    const response = await fetch(`${API_URL}/upload_image`, {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    alert(result.result);
  } catch (error) {
    alert("Lỗi: " + error);
  }
}

async function dropHandler(ev) {
  ev.preventDefault();
  const file = ev.dataTransfer.files[0];
  if (!file) return;

  try {
    const response = await fetch(`${API_URL}/handle_drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath: file.path })
    });
    const result = await response.json();
    alert(result.result);
  } catch (error) {
    alert("Lỗi: " + error);
  }
}"""

        # 1. Tạo thư mục tạm thời và lưu trữ các file tài nguyên
        self.temp_dir = tempfile.mkdtemp(prefix="sciter_gui_")
        
        html_file = os.path.join(self.temp_dir, "index.html")
        css_file = os.path.join(self.temp_dir, "style.css")
        js_file = os.path.join(self.temp_dir, "app.js")
        
        # Ghi các file
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(HTML_CONTENT)
            
        with open(css_file, "w", encoding="utf-8") as f:
            f.write(CSS_CONTENT)
            
        # Thay thế địa chỉ API thật bằng cổng động
        actual_api_url = f"http://{self.host}:{self.port}/api"
        dynamic_js_content = JS_CONTENT.replace("__DYNAMIC_API_URL__", actual_api_url)
        with open(js_file, "w", encoding="utf-8") as f:
            f.write(dynamic_js_content)
        
        # 2. Khởi chạy Flask Server ở luồng phụ
        def run_flask():
            self.flask_app.run(host=self.host, port=self.port, debug=False, use_reloader=False)
            
        flask_thread = threading.Thread(target=run_flask, daemon=True)
        flask_thread.start()
        
        # 3. Chạy giao diện Sciter (Load tệp HTML từ thư mục tạm)
        class AppWindow(window.Window):
            def __init__(self, html_path_local):
                super().__init__(ismain=True)
                index_url = "file:" + urllib.request.pathname2url(html_path_local)
                self.load_file(index_url)
                
        self.sciter_window = AppWindow(html_file)
        self.sciter_window.run_app()

        # Dọn dẹp thư mục tạm sau khi ứng dụng kết thúc
        try:
            shutil.rmtree(self.temp_dir)
        except Exception:
            pass
