# Sciter Self-Contained Python Module

Bộ thư viện **Sciter** đóng gói tự chứa (self-contained) dành riêng cho Python. Giải pháp này tích hợp sẵn cả mã nguồn Python Wrapper và nhân nhị phân engine (`sciter64.dll` / `sciter-webview.dll`), cho phép bạn xây dựng giao diện desktop HTML/CSS/JS một cách độc lập tuyệt đối.

---

## ⚡ Sự Tiện Lợi Vượt Trội: Không Phụ Thuộc Trình Duyệt & WebView

Hầu hết các thư viện GUI HTML5 cho Python hiện nay (như Eel, PyWebView, Electron,...) đều gặp phải những hạn chế lớn về mặt môi trường chạy của người dùng. Module **Sciter tự chứa** này giải quyết triệt để tất cả các vấn đề đó:

* **Không phụ thuộc Google Chrome / Chromium**: 
  Trái ngược với `Eel`, Sciter không yêu cầu máy tính của người dùng phải cài đặt sẵn Google Chrome hoặc trình duyệt nhân Chromium. Ứng dụng của bạn sẽ tự render giao diện mà không cần gọi bất kỳ tiến trình trình duyệt bên ngoài nào.
* **Không phụ thuộc WebView của hệ điều hành (WebView2 / WebKit)**:
  Các thư viện như `PyWebView` phụ thuộc vào trình duyệt nhúng của OS (như Microsoft Edge WebView2 trên Windows, Safari trên macOS, WebKitGtk trên Linux). Nếu hệ điều hành của người dùng chưa được cập nhật WebView2 (rất phổ biến trên các bản Windows rút gọn hoặc máy doanh nghiệp), ứng dụng sẽ bị crash ngay khi mở. Sciter mang theo engine render riêng của mình, đảm bảo **luôn chạy được 100%** trên mọi máy Windows.
* **Siêu nhẹ & Tiết kiệm tài nguyên**:
  Nhân Sciter chỉ là một tệp DLL duy nhất (~19MB). Khi chạy, lượng RAM tiêu thụ cực kỳ nhỏ (chỉ khoảng 15-30MB RAM, bằng 1/10 so với các ứng dụng cồng kềnh chạy nhân Chromium như Electron hoặc CEF).
* **Đóng gói di động 100%**:
  Mọi thứ cần thiết cho giao diện đều nằm gọn trong thư mục `sciter/`. Bạn chỉ cần copy thư mục này đi bất cứ đâu là có thể `import sciter` lập tức mà không cần cài đặt thêm bất kỳ SDK hay thiết lập đường dẫn môi trường (PATH/DLL Directory) nào.

---

## 📁 Cấu Trúc Module

```text
sciter/
├── sciter64.dll        # Nhân engine render chính (Windows 64-bit)
├── sciter-webview.dll  # Tiện ích webview mở rộng (nếu cần dùng tag <frame behaviour="webview">)
├── capi/               # Cấu trúc C-API giao tiếp với Python
│   ├── scapi.py        # Đã được tuỳ biến để tự nhận diện và nạp DLL nội bộ trong package
│   └── ...
└── ... (Các file chức năng để lập trình giao diện trên Python)
```

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh

### 1. Cách tích hợp vào dự án mới
Chỉ cần copy thư mục `sciter/` này vào thư mục nguồn của dự án của bạn.

### 2. Viết code Python gọi giao diện Sciter
Tạo file script Python bất kỳ (ví dụ: `app.py`) cùng cấp với thư mục `sciter/` và sử dụng như sau:

```python
import os
import sciter

# Khởi tạo cửa sổ Sciter
class MyAppWindow(sciter.Window):
    def __init__(self):
        # Tạo cửa sổ chính
        super().__init__(ismain=True, uni_theme=True)
        
    def setup_ui(self):
        # Nạp trực tiếp mã HTML giao diện
        self.load_html("""
        <html>
        <head>
            <style>
                body { 
                    font-family: system-ui; 
                    background: linear-gradient(135deg, #1e3c72, #2a5298); 
                    color: white; 
                    text-align: center;
                    vertical-align: middle;
                }
                h1 { margin-top: 15%; }
            </style>
        </head>
        <body>
            <h1>Chào mừng bạn đến với Sciter!</h1>
            <p>Giao diện HTML5 siêu nhẹ, không phụ thuộc Chrome hay WebView2.</p>
        </body>
        </html>
        """)

if __name__ == "__main__":
    wnd = MyAppWindow()
    wnd.setup_ui()
    # Hiển thị cửa sổ và chạy vòng lặp sự kiện
    wnd.collapse(False).expand()
    wnd.run_app()
```

### 3. Đóng gói ứng dụng thành file .EXE
Vì module này tự chứa đầy đủ các file DLL, bạn có thể dễ dàng dùng PyInstaller để đóng gói thành 1 file EXE duy nhất để phân phối cho người dùng chạy trực tiếp:
```bash
pyinstaller --noconfirm --onedir --windowed --add-data "sciter;sciter" app.py
```
*(Giao diện sẽ chạy mượt mà trên tất cả các máy tính chạy Windows của khách hàng mà không lo bị lỗi thiếu trình duyệt hay thiếu driver WebView2).*
