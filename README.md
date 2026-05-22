# Sciter GUI Self-Contained Module (Vietnamese Guide)

Dự án này là một bộ khung giao diện desktop hoàn chỉnh viết bằng **Python + Sciter (HTML/CSS/JS) + Flask**, đã được đóng gói cực kỳ tinh gọn và độc lập. Bạn có thể copy module này sang bất kỳ thư mục nào trên máy tính và chạy ngay lập tức mà không cần cài đặt cấu hình rườm rà.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
├── sciter/                 # Module Sciter tự chứa (Gồm mã Python & file DLL gốc)
│   ├── sciter64.dll        # File nhân Sciter engine 64-bit
│   ├── sciter-webview.dll  # Tiện ích webview bổ trợ
│   └── ... (các file python của PySciter)
├── gui_manager.py          # Trình quản lý giao diện chính (Nhúng sẵn HTML/CSS/JS)
├── main.py                 # File chạy Tool của bạn (Chỉ chứa logic nghiệp vụ Python)
└── .gitignore              # Cấu hình bỏ qua các thư mục rác khi đưa lên Git
```

---

## ⚡ Điểm Vượt Trội Của Module Này

1. **Không phụ thuộc file tĩnh ngoài ổ đĩa**: Toàn bộ giao diện HTML, CSS, và JS đã được nhúng thẳng vào file `gui_manager.py`. Khi khởi chạy, giao diện được ghi ra bộ nhớ tạm (`tempfile`) và tự động dọn dẹp khi tắt app.
2. **Không cần cài đặt Sciter SDK lên máy**: Tệp `sciter64.dll` được nhúng trực tiếp bên trong package `sciter`. Khi import, module sẽ tự động tìm và liên kết DLL nội bộ này.
3. **Cổng giao tiếp động (Dynamic Port)**: Không còn lỗi cứng cổng (hardcoded port). Cổng API Flask được cấu hình linh hoạt từ Python và tự động đồng bộ sang JavaScript.
4. **Liên kết logic dễ dàng bằng Decorators**: Chỉ cần dùng `@gui.on_save`, `@gui.on_open_file`,... bạn có thể dễ dàng map các nút bấm trên giao diện vào hàm xử lý Python tương ứng.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Thử

### 1. Yêu cầu hệ thống
* Python 3.8 trở lên (khuyên dùng Windows 64-bit).

### 2. Cài đặt thư viện phụ thuộc
Bạn chỉ cần cài đặt thư viện `Flask` để làm cổng giao tiếp API:
```bash
pip install flask
```
*(Không cần chạy `pip install pysciter` vì thư viện `sciter` tự chứa đã có sẵn trong dự án).*

### 3. Chạy ứng dụng
Chạy file `main.py` từ terminal:
```bash
python main.py
```

---

## 🛠️ Hướng Dẫn Tái Sử Dụng Cho Dự Án Khác

Để đem giao diện này sang bất kỳ tool Python nào khác của bạn, chỉ cần làm theo **3 bước**:

### Bước 1: Copy tài nguyên
Sao chép thư mục `sciter` (chứa DLL) và file `gui_manager.py` vào thư mục dự án mới của bạn.

### Bước 2: Viết code Python (`main.py`)
Tạo file chạy cho tool của bạn và viết code đăng ký các nút bấm như sau:

```python
import os
from gui_manager import SciterGUIManager

# 1. Khởi tạo giao diện (chạy cổng 5000 hoặc tùy ý)
gui = SciterGUIManager(port=5000)

# 2. Đăng ký các hàm Python tương tác với giao diện
@gui.on_save
def my_save_logic(data):
    # logic lưu dữ liệu của tool mới
    return "Đã lưu bởi Tool mới"

@gui.on_open_file
def my_open_file(filepath):
    # logic mở file
    if os.path.exists(filepath):
        os.startfile(filepath)
        return "Đã mở file thành công"
    return "File không tồn tại"

# 3. Chạy giao diện
if __name__ == "__main__":
    gui.start()
```

### Bước 3: Chạy ứng dụng mới
Mở terminal tại thư mục dự án mới và chạy `python main.py`. Giao diện Desktop sẽ hiện lên ngay lập tức và các nút bấm sẽ chạy theo logic Python mới bạn vừa viết!
