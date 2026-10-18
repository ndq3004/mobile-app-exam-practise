# Task 1 — Kiểm tra dữ liệu crawler

Ngày kiểm tra: 18/10/2026. Phạm vi là dữ liệu cục bộ trong repo; không crawl lại, không xác minh tính đúng đắn chuyên môn của đáp án và không kiểm tra khả năng tải các URL ảnh bên ngoài.

## Nguồn và độ đầy đủ

- `src/cli.ts`, `src/payload.ts`, `src/import-page.ts`, `src/store.ts`: crawler/import Node.js, nhận JSON Next.js và lưu SQLite; chưa có app Flutter.
- `data/examprepper-page-1.json` đến `examprepper-page-42.json`: 42 trang JSON Next.js, nội dung ở `props.pageProps`.
- `data/examprepper-exam-36.json`: bản tổng hợp gồm `source`, `capturedAt`, `exam`, `pages`, `questions`; là đầu vào thuận tiện cho bước thiết kế/import tiếp theo.
- `data/raw-json-row-1.json` trùng nội dung JSON trang 1, không phải một bộ exam mới.
- `data/crawler.sqlite`: 42 responses, 208 questions, 1 checkpoint. Đã đối chiếu toàn bộ JSON response và câu hỏi với file trang và bản tổng hợp, đều khớp.
- `data/data-audit.json` là báo cáo có sẵn. Báo cáo mới có thể tái tạo ở `docs/data-audit.json`, có thêm phát hiện lỗi nhãn đáp án và câu trùng nội dung.
- Chỉ có một exam: ID `36`, AWS DevOps Engineer Professional, provider `Amazon`, 208 câu. Metadata nguồn ghi `lastUpdated = 06 Aug 2025`; bản tổng hợp ghi thời điểm thu thập `2026-10-11T07:54:27.047Z`. Đây là hai mốc khác nhau.
- 42 trang liên tục; câu có `question_id` liên tục 1–208; không trùng `id` và không thiếu số thứ tự. Nguồn thu thập là ExamPrepper; từng câu có URL thảo luận ExamTopics riêng.

## Các trường dữ liệu

| Nhóm | Trường hiện có | Ý nghĩa/cách dùng |
|---|---|---|
| Exam | `id`, `name`, `provider`, `numberOfQuestions`, `lastUpdated` | Danh tính, tiêu đề, số lượng khai báo và ngày cập nhật từ nguồn |
| Cờ exam | `isBeta`, `isMCOnly`, `isImplemented` | Giữ metadata gốc; chưa suy diễn hành vi app từ các cờ này |
| Danh tính câu | `id` string, `exam_id` number, `question_id` number, `topic` string | Giữ ID nguồn; `question_id` dùng thứ tự trong exam, không thay bằng số câu trong URL ExamTopics |
| Nội dung | `question_text` string, `choices` object nhãn → text | Văn bản nhiều dòng; lựa chọn trong object không có thứ tự hiển thị đáng tin cậy |
| Đáp án | `answer`, `answer_ET` string | Một hoặc nhiều nhãn ghép, ví dụ `B`, `BCF`; lưu riêng theo tên trường nguồn, không gọi là đáp án đã được xác minh |
| Lời giải | `answer_description` string | 207/208 câu rỗng; câu 158 chỉ có một đường dẫn tham khảo |
| Cộng đồng | `answers_community` string array | 207 câu có dữ liệu; ví dụ `B (100%)`, cũng có `13%` hoặc `Other` thiếu nhãn |
| Thảo luận | `discussion` array | 208 câu có thảo luận, tổng 2.823 bình luận kể cả phản hồi lồng nhau |
| Bình luận | `comment_id`, `poster`, `content`, `upvote_count`, `timestamp`, `comments` | ID, tác giả, nội dung, lượt thích và thời gian phần lớn là string; phản hồi lồng trong `comments` |
| Ảnh | `question_images`, `answer_images` string array | 5 câu có ảnh đề; toàn bộ `answer_images` rỗng |
| Nguồn/thời gian | `url`, `timestamp`, `unix_timestamp` | URL gốc của từng câu; timestamp chuỗi không nêu timezone, không tự coi là UTC |
| Loại câu | `isMC` boolean | Có cả câu nhiều đáp án mang giá trị true; không dùng riêng cờ này để xác định số đáp án |

Tất cả câu có nội dung, đáp án, URL, ID và metadata thời gian. Chỉ `choices` thiếu ở câu 145. Thống kê kiểu dữ liệu, trường thiếu/rỗng và mẫu JSON thực nằm trong `docs/data-audit.json`.

## Dạng nội dung và vấn đề chất lượng

1. **Văn bản:** câu hỏi và lựa chọn là text có xuống dòng, không phát hiện marker HTML table/pre/code/img, fenced code hay các marker LaTeX được kiểm tra. Đây là kiểm tra biểu diễn có cấu trúc, không khẳng định nội dung không nhắc tới code hoặc công thức.
2. **Code dưới dạng ảnh:** câu 94 nhắc snippet CloudFormation, 103 nhắc IAM policy, 111 nhắc buildspec.yaml, 194 nhắc event pattern; đều đặt `//IMG//` trong text và URL ở `question_images`. Câu 141 cũng có ảnh. Không có file ảnh nhúng trong các JSON này. Chưa xem ảnh nên chưa kết luận ảnh có bảng/công thức nào; app cần hiển thị ảnh như nội dung gốc, không chờ OCR.
3. **Thiếu nội dung lựa chọn:** câu 103 có A/C/D/F chỉ ghi “Add the following conditional expression:” nhưng không có biểu thức kèm theo trong lựa chọn và `answer_images` rỗng. Đánh dấu cần kiểm tra nguồn, không tự viết biểu thức.
4. **Lỗi nhãn:** câu 67 có đáp án `ADF` nhưng choices chỉ A–E. Nội dung D có nối thêm `E. Create a VPC peering connection...`. Không tự đổi nhãn hoặc suy đoán F.
5. **Lựa chọn nằm trong đề:** câu 145 thiếu `choices`, nhưng toàn bộ A–D và các bullet nằm trong `question_text`; không phải mất toàn bộ lựa chọn. Có thể đọc nguyên văn; tách thành choices chỉ sau khi kiểm tra thủ công.
6. **Trùng nội dung đề:** câu 188/189 giống text khi chuẩn hóa khoảng trắng, nhưng khác ID, URL, thảo luận và một số nội dung lựa chọn. Giữ cả hai và gắn nhóm nghi trùng, không tự gộp.
7. **Ký tự lỗi:** phát hiện chuỗi nghi lỗi mã hóa ở choices câu 136, 141 và một phản hồi câu 123. Giữ bản gốc và yêu cầu kiểm tra trước khi sửa; không thay hàng loạt bằng phỏng đoán.
8. **Đáp án:** 46 câu có chuỗi đáp án nhiều nhãn. `answer` và `answer_ET` khớp ở cả 208 câu, nhưng điều này không chứng minh đáp án đúng về chuyên môn. Bình luận có ý kiến khác nhau.
9. **Lời giải:** bộ dữ liệu chưa có lời giải biên soạn đầy đủ. 2.823 bình luận là tài liệu thảo luận, không tự chuyển thành lời giải chính thức. Đây là hạn chế nội dung cần thể hiện rõ trên app.

## Quy tắc chuẩn hóa cho bước tiếp theo

- Giữ nguyên JSON nguồn làm bản đối chiếu; dữ liệu chuẩn hóa là bản dẫn xuất, có thông tin nguồn và phiên bản quy tắc.
- Giữ `id` nguồn cùng exam/provider nguồn làm căn cứ nhận diện, giữ riêng `question_id` để sắp xếp. Cùng danh tính và cùng nội dung thì bỏ qua khi import lại; cùng danh tính nhưng khác nội dung thì báo thay đổi/cập nhật có kiểm soát. Thiếu ID hoặc nội dung đề thì cách ly khỏi dữ liệu xuất bản để kiểm tra.
- Không xóa câu chỉ vì giống text. Gắn nhóm nghi trùng để kiểm tra; câu 188/189 vẫn là hai bản ghi nguồn.
- Chuẩn hóa xuống dòng về LF, bỏ khoảng trắng thừa ở hai đầu; giữ đoạn văn, bullet và Unicode bên trong. Không sửa nội dung chuyên môn tự động.
- Chuyển choices sang danh sách có nhãn rõ ràng, sắp nhãn A–Z, giữ raw để đối chiếu. `choices` thiếu → danh sách rỗng và cờ kiểm tra; câu 145 vẫn hiển thị toàn bộ đề nguyên bản.
- Giữ đáp án raw; có thể dẫn xuất danh sách nhãn như `BCF` → `[B,C,F]`. Kiểm tra nhãn tồn tại trong choices khi choices có dữ liệu; câu 67 cần cờ lỗi, không tự sửa.
- Lời giải rỗng → giá trị thiếu rõ ràng và hiển thị “Chưa có lời giải”. Câu 158 là tham khảo nguồn. Nếu hiển thị bình luận, đặt riêng dưới nhãn “Thảo luận cộng đồng”, giữ tác giả và nguồn; không dùng lượt thích để xác nhận đáp án.
- Giữ `answers_community` raw; chỉ parse mục đủ nhãn và tỷ lệ. `13%`/`Other` giữ dưới dạng chưa xác định, không gán nhãn và không ép tổng tỷ lệ thành 100%.
- Tách văn bản và ảnh thành các phần có thứ tự; thay `//IMG//` bằng ảnh theo thứ tự mảng khi số lượng phù hợp. Lệch số placeholder/ảnh → cờ kiểm tra, không âm thầm bỏ nội dung. Ảnh tải lỗi phải có trạng thái lỗi và đường dẫn nguồn; quyết định lưu ảnh ở đâu thuộc task 2.
- Không tự chuyển timestamp không có timezone sang UTC. Giữ raw; chỉ tạo thời gian chuẩn từ Unix timestamp khi hợp lệ. `lastUpdated` là ngày nguồn, `capturedAt` là thời gian thu thập.
- Không đưa profile đăng nhập, cookie, token hoặc toàn bộ Next.js wrapper vào dữ liệu phục vụ app.

## Mẫu và cách kiểm tra lại

Chạy từ thư mục gốc:

```powershell
node scripts/audit-data.mjs
```

Lệnh đọc SQLite bằng chế độ read-only, đối chiếu toàn bộ file trang/bản tổng hợp/SQLite và sinh `docs/data-audit.json`. Nếu các bản dữ liệu không khớp, lệnh dừng với lỗi assertion. Phần `samples` giữ mẫu thực ở câu 1, 94, 103, 141, 145, 158; phần còn lại có thống kê và vị trí bất thường để tra cứu. Các phép dò marker chỉ là hỗ trợ rà soát, không thay thế xem ảnh hoặc kiểm tra chuyên môn.

Task 1 hoàn thành ở mức khảo sát và chốt quy tắc xử lý. Việc sửa dữ liệu nguồn, bổ sung lời giải còn thiếu, thiết kế schema Firestore và triển khai import không được thực hiện trong task này.
