# crawler-exam

Node.js 24+, TypeScript, Playwright và SQLite (`node:sqlite`).

```powershell
npm install
npx playwright install chromium
npm start -- --url "https://www.examprepper.co/exam/ID/ID" --pages 1
```

Trình duyệt hiển thị để đăng nhập Google thủ công. Profile được lưu trong `data/profile`.
Nếu Google không chấp nhận Chromium, dùng `--channel chrome` với Chrome đã cài.

Nhập cookie từ JSON export (mảng cookie hoặc Playwright storageState):

```powershell
npm start -- --url "URL_DE" --cookies "D:\private\cookies.json" --pages 1
```

CLI ghi tên endpoint JSON và số câu nhận diện được; không ghi cookie/token vào log.
Hỗ trợ JSON trong response XHR/fetch và JSON `__NEXT_DATA__` nhúng trong response HTML.
Đã quan sát đề `/exam/36/1`: JSON nhúng có `props.pageProps.questions` chứa 5 câu,
`exam` và `currentPage`; Next đổi URL thành `/exam/36/2` (câu 6–10).
Phiên đăng nhập trong trình duyệt Codex riêng với profile của CLI; chưa nhập cookie giữa hai phiên.
JSON trang 1 đã được lưu từ DOM vào `data/examprepper-page-1.json` và import vào SQLite.
Đây là dữ liệu JSON nhúng nguyên bản, không phải file HAR hay bản ghi response network.

```powershell
npx tsx src/import-page.ts --file data/examprepper-page-1.json --url https://www.examprepper.co/exam/36/1
```

Mặc định chỉ lưu response chứa object có trường question/questionText/question_text/stem/prompt
và answers/options/choices/answer/correctAnswer/correct_answer. Khi xác minh schema thực tế,
có thể chọn endpoint bằng `--match "REGEX_URL"`; endpoint này lưu JSON ngay cả khi chưa nhận diện được câu.
Giữ regex hẹp để tránh nhận nhầm response khác.

`data/crawler.sqlite` lưu nguyên chuỗi JSON, URL response, URL trang, thời gian, câu hỏi và checkpoint
trong một transaction. `data/last-response.json` là bản JSON mới nhất để kiểm tra.
Chống trùng response theo SHA-256 dữ liệu gốc trong từng URL đề, chống trùng câu theo JSON chuẩn hóa thứ tự key.

```powershell
npm start -- --url "URL_DE" --pages 10 --next "button.next" --resume
```

Không có `--next`, CLI tìm một button tên Next hoặc Next question. Chỉ bấm sau khi lưu thành công.
`--resume` mở lại URL checkpoint và profile. Với đề dùng cùng một URL cho nhiều câu và giữ vị trí
chỉ trong bộ nhớ trang, chưa thể phục hồi đúng câu sau khi khởi động lại; cần xác minh network để
lưu cursor/question ID của ExamPrepper. Không tự bấm để đoán vị trí.

`--timeout 600` giới hạn thời gian chờ toàn phiên, tính bằng giây. Không có dữ liệu sẽ thoát lỗi,
không báo đã lưu thành công. Mỗi trang chỉ chọn response câu hỏi đầu tiên phù hợp.
Giữ `data/` và file cookie riêng tư vì chứa phiên đăng nhập và nội dung đề.

Kiểm tra: `npm run build` và `npm test`.

## Tool scan giấy tờ

```powershell
npm run scan
```

Mở http://127.0.0.1:4173, chọn ảnh JPG/PNG/WebP, kéo bốn chấm vào góc tờ giấy
rồi bấm **Tạo bản scan** và **Tải PNG**. Có thể nhập tọa độ góc để chỉnh chính xác.
Chế độ đen trắng dùng ngưỡng cục bộ để giảm ảnh hưởng của bóng trên giấy;
giảm “Ngưỡng chữ” nếu chữ mờ bị mất, tăng nếu nền còn nhiều nhiễu.
Chọn xám để làm sáng nền hoặc giữ màu để giữ ảnh, dấu và chữ màu.

Tool chạy cục bộ, không gửi ảnh lên server. Góc giấy được chọn thủ công;
không có OCR hoặc tự nhận diện mép giấy. Ảnh đầu vào được thu nhỏ tối đa 2400 px
ở cạnh dài, bản scan tối đa 2200 px. HEIC cần đổi sang JPG/PNG trước.
Đổi cổng bằng `$env:SCAN_PORT=4174`; Ctrl+C để dừng server.

Kiểm tra xử lý ảnh: `node --test scan/scan-core.test.js`.
Kiểm tra giao diện với Chrome đã cài: `node scan/smoke.mjs` (tự mở server ở cổng 4175).
