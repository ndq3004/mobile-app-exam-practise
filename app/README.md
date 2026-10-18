# Exam Render

Flutter app cho iOS và web. Hướng dẫn: [Flutter setup](../docs/flutter-setup.md).

```powershell
flutter pub get
flutter run -d chrome --dart-define-from-file=config/dev.web.json
```

Các file dev được tạo từ Firebase project `exam-render-dev` bằng `node scripts/configure-firebase.mjs` từ thư mục gốc sau khi đăng nhập Firebase CLI. Không chạy với cấu hình production trỏ về project dev.
