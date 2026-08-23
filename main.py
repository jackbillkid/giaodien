import sys
sys.stdout.reconfigure(encoding='utf-8')

import os
import shutil
import urllib.parse
import asyncio
import psutil
import threading
import time
import ctypes
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app):
    asyncio.create_task(broadcast_stats_loop())
    yield

# 1. Khởi tạo ứng dụng FastAPI
app = FastAPI(title="SmartApp SaaS", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Cơ sở dữ liệu giả lập
users_db = [
    {
        "id": 1, 
        "name": "Alice Pham", 
        "email": "alice@example.com", 
        "role": "Admin",
        "active": True,
        "gender": "Nữ",
        "join_date": "2026-01-15",
        "notes": "Quản trị viên cấp cao."
    },
    {
        "id": 2, 
        "name": "Bob Nguyen", 
        "email": "bob@example.com", 
        "role": "Editor",
        "active": True,
        "gender": "Nam",
        "join_date": "2026-02-10",
        "notes": "Chịu trách nhiệm nội dung."
    },
    {
        "id": 3, 
        "name": "Charlie Tran", 
        "email": "charlie@example.com", 
        "role": "User",
        "active": False,
        "gender": "Nam",
        "join_date": "2026-03-01",
        "notes": "Tài khoản đăng ký tự động."
    },
]

# --- WebSocket Realtime Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Gửi thống số ngay khi kết nối thành công
        total_users = len(users_db)
        active_sessions = len(manager.active_connections)
        cpu_load = f"{psutil.cpu_percent(interval=None)}%"
        ram_load = f"{psutil.virtual_memory().percent}%"
        await websocket.send_json({
            "type": "stats",
            "data": {
                "total_users": total_users,
                "active_sessions": active_sessions,
                "cpu_load": cpu_load,
                "ram_load": ram_load,
                "status": "Online"
            }
        })
        while True:
            # Giữ kết nối mở
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

async def broadcast_stats_loop():
    while True:
        await asyncio.sleep(2)
        total_users = len(users_db)
        active_sessions = len(manager.active_connections)
        cpu_load = f"{psutil.cpu_percent(interval=None)}%"
        ram_load = f"{psutil.virtual_memory().percent}%"
        await manager.broadcast({
            "type": "stats",
            "data": {
                "total_users": total_users,
                "active_sessions": active_sessions,
                "cpu_load": cpu_load,
                "ram_load": ram_load,
                "status": "Online"
            }
        })

# --- API Endpoints ---
@app.get("/api/users")
def get_users():
    return {"status": "success", "users": users_db}

@app.post("/api/add_user")
async def add_user(request: Request):
    data = await request.json()
    print("Received data:", data)
    new_id = max([u["id"] for u in users_db]) + 1 if users_db else 1
    new_user = {
        "id": new_id,
        "name": data.get("name", ""),
        "email": data.get("email", ""),
        "role": data.get("role", "User"),
        "active": bool(data.get("active", False)),
        "gender": data.get("gender", "Nam"),
        "join_date": data.get("join_date", ""),
        "notes": data.get("notes", "")
    }
    users_db.append(new_user)
    await manager.broadcast({"type": "users_updated", "users": users_db})
    return {"status": "success", "message": f"Đã thêm user: {new_user['name']}", "user": new_user}

@app.put("/api/update_user")
async def update_user(request: Request):
    data = await request.json()
    print("Update user:", data)
    try:
        user_id = int(data.get("id"))
    except (TypeError, ValueError):
        return {"status": "error", "message": "ID không hợp lệ"}
        
    for u in users_db:
        if u["id"] == user_id:
            u["name"] = data.get("name", u["name"])
            u["email"] = data.get("email", u["email"])
            u["role"] = data.get("role", u["role"])
            u["active"] = bool(data.get("active", u["active"]))
            u["gender"] = data.get("gender", u["gender"])
            u["join_date"] = data.get("join_date", u["join_date"])
            u["notes"] = data.get("notes", u["notes"])
            await manager.broadcast({"type": "users_updated", "users": users_db})
            return {"status": "success", "message": f"Đã cập nhật user ID {user_id}", "user": u}
    return {"status": "error", "message": f"Không tìm thấy user ID {user_id}"}

@app.delete("/api/delete_user")
async def delete_user(request: Request):
    data = await request.json()
    try:
        user_id = int(data.get("id"))
    except (TypeError, ValueError):
        return {"status": "error", "message": "ID không hợp lệ"}
        
    print("Delete user ID:", user_id)
    for i, u in enumerate(users_db):
        if u["id"] == user_id:
            users_db.pop(i)
            await manager.broadcast({"type": "users_updated", "users": users_db})
            return {"status": "success", "message": f"Đã xóa user ID {user_id}"}
    return {"status": "error", "message": f"Không tìm thấy user ID {user_id}"}

# --- API Quản Lý Tệp (File Storage & Management) ---
UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

@app.get("/api/files")
def get_files():
    import datetime
    files_list = []
    total_size = 0
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(fpath):
                stat = os.stat(fpath)
                size = stat.st_size
                total_size += size
                mod_time = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                
                ext = os.path.splitext(fname)[1].lower().replace('.', '')
                files_list.append({
                    "name": fname,
                    "size": size,
                    "size_formatted": format_file_size(size),
                    "mod_time": mod_time,
                    "ext": ext,
                    "download_url": f"/api/download/{fname}"
                })
    
    files_list.sort(key=lambda x: x["mod_time"], reverse=True)
    return {
        "status": "success",
        "files": files_list,
        "total_files": len(files_list),
        "total_size_bytes": total_size,
        "total_size_formatted": format_file_size(total_size)
    }

@app.get("/api/select_file")
def select_file_dialog():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        filepath = filedialog.askopenfilename(
            title="Chọn Tệp Tải Lên",
            filetypes=[("Tất cả tệp", "*.*"), ("Hình ảnh", "*.jpg;*.jpeg;*.png;*.gif;*.webp;*.bmp")]
        )
        root.destroy()
        if filepath:
            return {"status": "success", "filepath": filepath}
        return {"status": "cancelled", "filepath": ""}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(None), filepath: str = Form("")):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_filename = ""
    
    if file and file.filename:
        safe_filename = os.path.basename(file.filename)
        dest = os.path.join(UPLOAD_DIR, safe_filename)
        contents = await file.read()
        with open(dest, "wb") as f:
            f.write(contents)
    elif filepath:
        clean_path = urllib.parse.unquote(filepath)
        clean_path = clean_path.replace("file:///", "").replace("file://", "")
        clean_path = os.path.abspath(clean_path)
        if os.path.exists(clean_path) and os.path.isfile(clean_path):
            safe_filename = os.path.basename(clean_path)
            dest = os.path.join(UPLOAD_DIR, safe_filename)
            shutil.copy2(clean_path, dest)
        else:
            return {"status": "error", "message": f"Tệp không tồn tại: {filepath}"}
    else:
        return {"status": "error", "message": "Không nhận được tệp hoặc đường dẫn tệp"}
        
    await manager.broadcast({"type": "files_updated"})
    return {"status": "success", "message": f"Đã tải lên tệp: {safe_filename}"}

@app.get("/api/download/{filename}")
def download_file(filename: str):
    safe_filename = os.path.basename(filename)
    dest = os.path.join(UPLOAD_DIR, safe_filename)
    if not os.path.exists(dest) or not os.path.isfile(dest):
        return {"status": "error", "message": "Tệp không tồn tại"}
    return FileResponse(dest, filename=safe_filename, media_type="application/octet-stream")

@app.delete("/api/delete_file/{filename}")
async def delete_file(filename: str):
    safe_filename = os.path.basename(filename)
    dest = os.path.join(UPLOAD_DIR, safe_filename)
    if os.path.exists(dest) and os.path.isfile(dest):
        os.remove(dest)
        await manager.broadcast({"type": "files_updated"})
        return {"status": "success", "message": f"Đã xóa tệp: {safe_filename}"}
    return {"status": "error", "message": "Tệp không tồn tại hoặc không thể xóa"}

# --- Serve Web UI & Assets for Chrome Browser Access & Miniblink ---
if os.path.exists("ui"):
    app.mount("/ui", StaticFiles(directory="ui"), name="ui")
    app.mount("/lib", StaticFiles(directory="ui/lib"), name="lib_static")
    app.mount("/dashboard", StaticFiles(directory="ui/dashboard"), name="dashboard_static")
    app.mount("/users", StaticFiles(directory="ui/users"), name="users_static")
    app.mount("/files", StaticFiles(directory="ui/files"), name="files_static")
    app.mount("/workflow", StaticFiles(directory="ui/workflow"), name="workflow_static")
    app.mount("/components", StaticFiles(directory="ui/components"), name="components_static")
    app.mount("/settings", StaticFiles(directory="ui/settings"), name="settings_static")
    app.mount("/auth", StaticFiles(directory="ui/auth"), name="auth_static")

@app.get("/")
@app.get("/web")
@app.get("/app")
def serve_web_ui():
    return FileResponse("ui/index.html")

@app.get("/style.css")
def serve_css():
    return FileResponse("ui/style.css")

@app.get("/common.js")
def serve_common_js():
    return FileResponse("ui/common.js")

@app.get("/app.js")
def serve_js():
    return FileResponse("ui/common.js")

# 3. Khởi chạy Ứng dụng
if __name__ == "__main__":
    print("Starting FastAPI Server...")
    import uvicorn

    def start_server():
        config = uvicorn.Config(app, host="127.0.0.1", port=5000, log_level="warning")
        server = uvicorn.Server(config)
        server.run()

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Chờ 1 giây để server khởi động hoàn tất
    time.sleep(1.0)

    print("Initializing Miniblink WebUI Window...")
    try:
        from wkeMiniblink.wke import WebWindow, Wke
        wke = Wke()
        win = WebWindow()
        
        # Tạo cửa sổ hiển thị (Popup Window)
        win.create(width=1200, height=800, _type=0)
        
        win.setWindowTitle("SmartApp SaaS (Powered by Miniblink)")
        win.showWindow(True)
        win.moveToCenter()
        
        # Load URL giao diện
        url_str = "http://127.0.0.1:5000/ui/index.html"
        win.loadURL(url_str)
        print(f"Web Window loaded: {url_str}")
        
        # Bắt đầu vòng lặp tin nhắn hệ thống
        wke.runMessageLoop()
            
    except Exception as e:
        print(f"Miniblink error: {e}")
