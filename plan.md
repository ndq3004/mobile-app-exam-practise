# Kế hoạch xây dựng app đọc câu hỏi và lời giải

## Mục tiêu

Xây dựng một app Flutter dùng chung code cho iOS và web, hiển thị dữ liệu exam đã crawl để học trên điện thoại và trình duyệt.

- Stack: Flutter, Firebase Auth, Cloud Firestore và Firebase Hosting.
- Phạm vi bản đầu: đọc câu hỏi, xem đáp án và lời giải, bookmark và tiếp tục đọc.
- Luồng chính: danh sách exam → danh sách câu hỏi → nội dung câu hỏi và lời giải.
- Crawler chạy riêng; dữ liệu được chuẩn hóa và import vào Firestore.
- Firebase Hosting phục vụ bản web. Bản iOS được build, ký và phân phối qua công cụ của Apple; cần môi trường macOS/Xcode.

## Các task triển khai

### 1. Kiểm tra dữ liệu crawler

- [x] Kiểm tra cấu trúc và dữ liệu hiện có trong repo.
- [x] Xác định các trường exam, câu hỏi, lựa chọn, đáp án, lời giải và nguồn dữ liệu.
- [x] Kiểm tra hình ảnh, bảng, đoạn code và công thức nếu có.
- [x] Thống nhất cách xử lý nội dung thiếu hoặc trùng.

**Đầu ra:** mẫu dữ liệu thực và quy tắc chuẩn hóa để thiết kế schema.

Kết quả khảo sát: [docs/crawler-data-review.md](docs/crawler-data-review.md). Báo cáo và mẫu dữ liệu: [docs/data-audit.json](docs/data-audit.json). Kiểm tra lại bằng `node scripts/audit-data.mjs`.

### 2. Thiết kế dữ liệu Firestore

- [x] Thiết kế cấu trúc lưu exam và câu hỏi.
- [x] Chọn ID ổn định để import lại hoặc cập nhật mà không tạo bản trùng.
- [x] Thiết kế dữ liệu bookmark và vị trí đọc theo người dùng.
- [x] Xác định truy vấn, thứ tự câu hỏi, phân trang và index cần thiết.
- [x] Chốt định dạng nội dung và cách tham chiếu hình ảnh nếu có.

**Đầu ra:** tài liệu schema và ví dụ document cho từng loại dữ liệu.

Thiết kế: [docs/firestore-schema.md](docs/firestore-schema.md). Ví dụ: [docs/firestore-examples.json](docs/firestore-examples.json). Index: [firestore.indexes.json](firestore.indexes.json).

### 3. Khởi tạo Flutter và Firebase

- [x] Tạo project Flutter hỗ trợ iOS và web.
- [x] Tổ chức phần giao diện, model và lớp truy cập dữ liệu dùng chung.
- [x] Kết nối Firebase Auth và Firestore.
- [x] Tách cấu hình phát triển và production.
- [x] Thiết lập theme, điều hướng và bố cục thích ứng màn hình.

**Đầu ra:** app khởi chạy được trên web và có cấu hình nền tảng iOS.

Task 3 hoàn thành: app iOS/web trong `app/`, cấu hình Firebase thật cho `exam-render-dev`, tách môi trường và bố cục responsive. Đã kiểm tra analyze, 3 tests, build web với dev config và smoke test Chrome (khởi tạo Firebase/Auth, điều hướng desktop/mobile, reload). Firestore từ chối truy cập chưa đăng nhập. Chưa deploy cloud hoặc build native iOS trên Mac. Hướng dẫn: [docs/flutter-setup.md](docs/flutter-setup.md).

### 4. Import dữ liệu

- [ ] Tạo công cụ chuyển dữ liệu crawl sang schema đã chốt.
- [ ] Kiểm tra dữ liệu trước khi ghi vào Firestore.
- [ ] Hỗ trợ chạy lại để cập nhật dữ liệu theo ID ổn định.
- [ ] Báo cáo số lượng bản ghi thành công, bị bỏ qua và lỗi.
- [ ] Import bộ dữ liệu mẫu để phát triển giao diện.

**Đầu ra:** công cụ import có hướng dẫn sử dụng và dữ liệu thực để kiểm thử.

### 5. Xây luồng đọc chính

- [ ] Hiển thị danh sách exam và thông tin cơ bản.
- [ ] Hiển thị danh sách câu hỏi theo exam.
- [ ] Hiển thị nội dung câu hỏi, lựa chọn nếu có, đáp án và lời giải.
- [ ] Cho phép mở hoặc thu gọn phần lời giải.
- [ ] Chuyển câu trước và câu sau.
- [ ] Hiển thị đúng các dạng nội dung đã xác định ở task 1.
- [ ] Điều chỉnh bố cục cho điện thoại và màn hình web rộng.

**Đầu ra:** đọc được dữ liệu thật từ đầu đến cuối trên luồng chính.

### 6. Đăng nhập và lưu việc học

- [ ] Chọn phương thức đăng nhập cho bản đầu và tích hợp Firebase Auth.
- [ ] Xử lý đăng nhập, đăng xuất và trạng thái phiên đăng nhập.
- [ ] Thêm hoặc bỏ bookmark câu hỏi.
- [ ] Hiển thị danh sách câu hỏi đã bookmark.
- [ ] Lưu vị trí đọc gần nhất theo exam và cho phép tiếp tục đọc.
- [ ] Đồng bộ bookmark và vị trí đọc giữa iOS và web theo tài khoản.

**Đầu ra:** người dùng có thể chuyển thiết bị và tiếp tục việc học.

### 7. Hoàn thiện trải nghiệm và quyền truy cập

- [ ] Phân trang và hạn chế tải dữ liệu không cần thiết.
- [ ] Xử lý trạng thái đang tải, lỗi, dữ liệu rỗng và mất kết nối.
- [ ] Kiểm tra cỡ chữ, khoảng cách và vùng bấm khi đọc trên điện thoại.
- [ ] Thiết lập Firestore Rules bảo vệ dữ liệu cá nhân theo người dùng.
- [ ] Giới hạn quyền ghi nội dung exam cho công cụ import được cấp quyền.
- [ ] Kiểm tra truy vấn và index với dữ liệu thực.

**Đầu ra:** trải nghiệm đọc ổn định và quyền truy cập được kiểm tra.

### 8. Kiểm thử và phát hành

- [ ] Kiểm tra luồng đọc, đăng nhập, bookmark và tiếp tục đọc.
- [ ] Kiểm tra nội dung dài và các dạng nội dung đặc biệt có trong dữ liệu.
- [ ] Kiểm tra bố cục trên điện thoại và trình duyệt desktop.
- [ ] Build bản web và cấu hình Firebase Hosting, bao gồm đường dẫn điều hướng.
- [ ] Triển khai và kiểm tra bản web trên URL thực tế.
- [ ] Build, ký và kiểm tra bản iOS trên macOS/Xcode.
- [ ] Phân phối bản iOS qua TestFlight và kiểm tra trên iPhone.
- [ ] Ghi hướng dẫn cấu hình, import dữ liệu, build và phát hành.

**Đầu ra:** bản web sử dụng được và bản iOS thử nghiệm qua TestFlight.

## Các mốc bàn giao

1. **Đọc được dữ liệu thật:** hoàn thành task 1–5.
2. **Dùng để học hằng ngày:** hoàn thành task 6–7 với đăng nhập, bookmark và nhớ vị trí đọc.
3. **Phát hành:** hoàn thành task 8 với URL web và bản TestFlight.

## Ngoài phạm vi bản đầu

- Làm bài thi, chấm điểm hoặc đếm giờ.
- Tìm kiếm toàn văn.
- Tải trọn bộ exam để đọc offline.
- Trang quản trị nội dung.

## Điểm cần chốt khi triển khai

- Phương thức đăng nhập cho bản đầu.
- Định dạng nội dung và nơi lưu hình ảnh dựa trên dữ liệu crawl thực tế.
- Firebase project cho môi trường phát triển và production.
- Môi trường macOS/Xcode và tài khoản Apple phục vụ phát hành iOS.

Chỉ ước lượng thời gian chi tiết sau khi hoàn thành task 1, đặc biệt khi dữ liệu có hình ảnh, bảng hoặc công thức.
