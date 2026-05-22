import os
from gui_manager import SciterGUIManager

# 1. Khởi tạo Trình quản lý giao diện
gui = SciterGUIManager(port=5000)

# 2. Đăng ký các Callback xử lý logic cụ thể của Tool bằng Decorators
@gui.on_save
def save_item(data):
    print("Main Tool - Save:", data)
    return "Đã lưu thành công bởi Main Tool"

@gui.on_update
def update_item(item_id, new_data):
    print("Main Tool - Update:", item_id, new_data)
    return f"Đã sửa ID {item_id} thành '{new_data}'"

@gui.on_delete
def delete_item(item_id):
    print("Main Tool - Delete:", item_id)
    return f"Đã xóa ID {item_id} thành công"

@gui.on_open_file
def open_file(path):
    print("Main Tool - Open File:", path)
    if os.path.exists(path):
        os.startfile(path)
        return "File đã được mở thành công"
    return "Lỗi: Không tìm thấy file"

@gui.on_open_folder
def open_folder(path):
    print("Main Tool - Open Folder:", path)
    if os.path.isdir(path):
        os.startfile(path)
        return "Thư mục đã được mở thành công"
    return "Lỗi: Thư mục không tồn tại"

@gui.on_upload_image
def upload_image(file, filepath):
    print("Main Tool - Upload Image:", filepath)
    os.makedirs("uploads", exist_ok=True)
    
    # Lấy tên file gốc
    filename = os.path.basename(filepath) if filepath else file.filename
    dest = os.path.join("uploads", filename)
    file.save(dest)
    return f"Đã lưu ảnh tải lên tại: {dest}"

@gui.on_drop
def handle_drop(filepath):
    print("Main Tool - Handle Drop:", filepath)
    return f"Tool đã xử lý tệp kéo thả: {filepath}"

# 3. Khởi chạy Ứng dụng
if __name__ == "__main__":
    gui.start()
