# Flutter foundation — task 3

App nằm trong `app/`, độc lập với crawler Node.js. Firebase development: `exam-render-dev`. Bundle ID iOS: `com.examrender.examreader`, iOS deployment target 15.0. Production chưa được tạo; có template riêng và kiểm tra chặn dùng nhầm project dev.

## Trạng thái kiểm tra

Task 3 hoàn thành ngày 19/10/2026:

- Firebase đã xác thực; app WEB và IOS đã đăng ký, cấu hình thật trong config/dev.web.json và config/dev.ios.json. Chạy lại script cấu hình thành công, tái sử dụng app hiện có.
- flutter analyze: No issues found; flutter test: 3 tests passed.
- flutter build web --no-wasm-dry-run --dart-define-from-file=config/dev.web.json: thành công.
- node scripts/smoke-flutter-web.mjs: PASS trên Chrome; Firebase Core/Auth/Firestore khởi tạo, nhận trạng thái chưa đăng nhập, điều hướng desktop/mobile và reload hash route hoạt động, không có lỗi runtime.
- Endpoint Firestore thật trả 403 PERMISSION_DENIED / Missing or insufficient permissions cho yêu cầu không có đăng nhập; không ghi dữ liệu.
- Chưa kiểm tra luồng đăng nhập người dùng hoặc đọc exam có quyền (task 5–7). Chưa build native iOS do đang ở Windows, chưa deploy cloud.

## Cấu trúc

- `lib/core/app_config.dart`: đọc cấu hình build, kiểm tra môi trường.
- `lib/data/`: khởi tạo Firebase Core, Auth, Firestore, interface để thay bằng dịch vụ test; truy vấn exam published giới hạn 20 theo schema task 2.
- `lib/models/`: model Exam.
- `lib/ui/`: shell responsive, Thư viện/Đã lưu/Tài khoản. Đây là màn hình nền; đọc đề ở task 5, giao diện đăng nhập/bookmark/progress ở task 6.
- `lib/app.dart`: theme và router dùng chung iOS/web; web dùng hash route mặc định để hỗ trợ refresh/deep link.
- `config/dev.web.json`, `config/dev.ios.json`: được tạo từ cấu hình Firebase thật sau khi đăng nhập.
- `config/prod.example.json`: mẫu để tạo prod.web.json hoặc prod.ios.json khi có project production. Không fallback sang dev.

## Công cụ cục bộ trên Windows

Flutter stable 3.47.7/Dart 3.13.5 và Firebase CLI nằm dưới `.tools/` (đã ignore), không thay PATH hệ thống. Trong terminal ở thư mục gốc:

```powershell
$env:PUB_CACHE = Join-Path $PWD '.tools/pub-cache'
$env:Path = (Join-Path $PWD '.tools/flutter/bin') + ';' + $env:Path
```

Nếu máy khác đã có Flutter thì dùng SDK sẵn có tương thích `pubspec.yaml`. Cài Firebase CLI nếu chưa có; script cấu hình trong repo hiện tìm CLI cục bộ tại `.tools/firebase/node_modules/firebase-tools/lib/bin/firebase.js`, có thể cài bằng `npm install --prefix .tools/firebase firebase-tools`.

## Kết nối Firebase

```powershell
node .tools/firebase/node_modules/firebase-tools/lib/bin/firebase.js login
node scripts/configure-firebase.mjs
```

Firebase CLI có thể cung cấp URL đăng nhập và yêu cầu chạy lại login kèm mã xác thực; nhập mã trong terminal riêng, không ghi vào repo/chat. Script cấu hình tìm app đúng displayName web/Bundle ID iOS hoặc tạo nếu thiếu, tải cấu hình SDK và xuất JSON cho Flutter. Không import dữ liệu, không deploy Hosting hay rules. Các Firebase client config là định danh công khai của app; chúng không thay thế quyền truy cập. Không đưa service-account key/token vào app.

## Chạy và kiểm tra web

```powershell
cd app
flutter pub get
flutter analyze
flutter test
flutter run -d chrome --dart-define-from-file=config/dev.web.json
flutter build web --dart-define-from-file=config/dev.web.json
```

Sau này deploy Hosting từ thư mục gốc bằng Firebase CLI, chọn rõ `--project exam-render-dev --only hosting`. `firebase.json` trỏ public tới `app/build/web`; không trỏ public vào thư mục gốc chứa dữ liệu crawl. `firestore.rules` hiện là baseline đóng toàn bộ, chưa deploy; chính sách chi tiết và kiểm thử ở task 7. Thư viện chưa đọc dữ liệu khi chưa có đăng nhập.

## iOS trên macOS

Copy repo và cấu hình dev.ios.json, cài Flutter và toolchain Xcode theo Flutter doctor. Chạy:

```sh
cd app
flutter pub get
flutter run -d <ios-device-id> --dart-define-from-file=config/dev.ios.json
flutter build ios --no-codesign --dart-define-from-file=config/dev.ios.json
```

Firebase được initialize bằng FirebaseOptions truyền từ cấu hình build cho từng nền tảng; không cần app tự tìm GoogleService-Info.plist. Xcode Runner dùng Bundle ID đã đăng ký. Ký thiết bị/TestFlight và build native iOS cần macOS; không thể xác nhận build iOS từ Windows.

## Production

Tạo Firebase project riêng, đăng ký app iOS/web và lấy client config tương ứng; copy template thành config cho mỗi nền tảng rồi điền đúng các giá trị. Build dùng `--dart-define-from-file=config/prod.web.json` hoặc `config/prod.ios.json`. Triển khai phải truyền rõ project production; không thêm alias production giả vào `.firebaserc`. Nếu dev/prod cùng cài trên iPhone sau này, cần bundle ID/flavor riêng trước khi đăng ký app production.
