# Miniblink Self-Contained Python Module (SmartApp SaaS)

Bộ thư viện **Miniblink** đóng gói tự chứa (self-contained) dành riêng cho Python. Giải pháp này sử dụng nhân Chromium siêu nhẹ (`node.dll`), cho phép bạn xây dựng giao diện desktop HTML/CSS/JS chất lượng cao, hoàn toàn độc lập và không phụ thuộc vào hệ thống.

---

## ⚡ Sự Tiện Lợi Vượt Trội: Không Phụ Thuộc WebView2 hay Chrome

Hầu hết các thư viện GUI HTML5 cho Python hiện nay (như Eel, PyWebView, Electron,...) đều gặp phải những hạn chế lớn về mặt môi trường chạy của người dùng. Module **Miniblink tự chứa** này giải quyết triệt để tất cả các vấn đề đó:

* **Không phụ thuộc WebView của hệ điều hành (WebView2 / WebKit)**:
  Các thư viện như `PyWebView` phụ thuộc vào trình duyệt nhúng của OS (như Microsoft Edge WebView2 trên Windows 10/11, Safari trên macOS, WebKitGtk trên Linux). Nếu hệ điều hành của người dùng chưa được cập nhật WebView2 (ví dụ trên các bản Windows rút gọn hoặc máy doanh nghiệp cũ), ứng dụng sẽ bị crash ngay khi mở. Miniblink mang theo engine render riêng của mình (`node.dll`), đảm bảo **chạy tốt trên cả Windows cũ (như Windows 7, Windows 10 LTSC) đến Windows 11**.
* **Không yêu cầu cài đặt sẵn Google Chrome**: 
  Trái ngược với `Eel`, Miniblink tự render giao diện mà không cần gọi bất kỳ tiến trình Chrome bên ngoài nào của người dùng.
* **Siêu nhẹ & Tiết kiệm tài nguyên**:
  Nhân Chromium của Miniblink chỉ gói gọn trong một tệp DLL duy nhất (`node.dll` ~15MB-40MB). Lượng RAM tiêu thụ tối ưu hơn rất nhiều so với các ứng dụng chạy Electron cồng kềnh.
* **Đầy đủ tính năng Web hiện đại**:
  Hỗ trợ hoàn hảo **WebSockets thời gian thực**, **HTML5/CSS3/JS**, Canvas, SVG và tích hợp thư viện vẽ sơ đồ **Drawflow** mà không gặp bất kỳ lỗi kết nối hay đơ giao diện nào.

---

## 📁 Cấu Trúc Dự Án

```text
d:\giaodiensciter\giaodien/
├── main.py             # Điểm khởi chạy chính (FastAPI Server + Miniblink WebUI Window)
├── node.dll            # Nhân Chromium của Miniblink (bản 64-bit tự động tích hợp)
├── icon.ico            # Biểu tượng ứng dụng
├── uploads/            # Thư mục lưu trữ tệp tin tải lên của người dùng
└── ui/                 # Thư mục chứa toàn bộ giao diện HTML/CSS/JS tĩnh
    ├── index.html      # Giao diện chính chứa các tab (đã inlined tránh lỗi bất đồng bộ)
    ├── style.css       # File định kiểu giao diện hiện đại (Dark Mode, UI Elements)
    ├── common.js       # Script tiện ích và kết nối WebSocket thời gian thực
    └── ... (Các file script theo từng tab chức năng: users, files, workflow,...)
```

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh

### 1. Cài đặt các thư viện cần thiết
Đảm bảo máy tính của bạn đã cài đặt Python 3.8+ (đã hỗ trợ hoàn toàn Python 3.14 x64). Chạy lệnh cài đặt các gói phụ thuộc:
```bash
pip install fastapi uvicorn psutil WkeMiniblink
```

### 2. Khởi chạy Ứng dụng
Chạy trực tiếp file `main.py` từ Terminal/Command Prompt:
```bash
python main.py
```
Ứng dụng sẽ tự động kích hoạt FastAPI backend chạy ở cổng `5000` và khởi tạo cửa sổ desktop Miniblink hiển thị giao diện SmartApp SaaS.

### 3. Đóng gói ứng dụng thành file `.EXE`
Vì dự án tự chứa đầy đủ tệp `node.dll` và thư mục `ui/`, bạn có thể dễ dàng dùng PyInstaller để đóng gói thành thư mục hoặc tệp EXE duy nhất để phân phối cho người dùng chạy trực tiếp:
```bash
pyinstaller --noconfirm --onedir --windowed --add-data "ui;ui" --add-data "node.dll;." main.py
```
*(Giao diện sẽ chạy mượt mà trên tất cả các máy tính chạy Windows của khách hàng mà không lo bị lỗi thiếu trình duyệt hay thiếu driver WebView2).*
