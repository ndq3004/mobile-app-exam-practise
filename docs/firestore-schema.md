# Task 2 — Thiết kế dữ liệu Firestore v1

Ngày chốt: 18/10/2026. Dựa trên `crawler-data-review.md` và dữ liệu exam 36. Đây là hợp đồng dữ liệu cho task 3–7; chưa tạo Firebase project, triển khai rules/index hoặc import lên cloud.

## 1. Cấu trúc và danh tính

```text
exams/{examId}
  questions/{questionId}
    comments/{commentId}
users/{uid}
  bookmarks/{bookmarkId}
  readingProgress/{examId}
```

- `examId = examprepper_36` cho nguồn hiện tại. Tổng quát: `sourceKey + '_' + sourceExamId`, sourceKey do importer kiểm soát. ID exam nguồn phải là số nguyên dương; nguồn khác cần adapter riêng.
- `questionId = id` nguyên bản của câu, ví dụ `qxQ7x9dzXjDPaL2y3vCx`. Chỉ chấp nhận ID nguồn khớp `[A-Za-z0-9_-]{1,128}`; không dùng tiêu đề, số trang hoặc nội dung làm ID. ID lỗi/thiếu phải cách ly, không tự sinh ID mới mỗi lần import.
- `commentId = comment_id` string chữ số; duy nhất trong câu. Flatten replies thành document riêng, dùng `parentId` để giữ quan hệ. Trùng ID khác nội dung phải báo xung đột; thiếu ID phải cách ly bình luận, không làm mất câu hỏi.
- `uid` lấy từ Firebase Auth. `bookmarkId = examId + '__' + questionId`; quy tắc ID ở trên bảo đảm cách phân tách exam (kết thúc bằng số) không nhập nhằng.
- Giữ thứ tự bằng `position` số nguyên lấy từ `question_id`, không dựa vào document ID hoặc số trong URL ExamTopics. Mọi lần import phải kiểm tra trùng position trong exam.

## 2. Document và kiểu dữ liệu

Trường dưới đây bắt buộc trừ khi ghi nullable. Tất cả document có `schemaVersion: 1`. Timestamp ghi bằng kiểu Firestore Timestamp; các ví dụ JSON trong file đi kèm dùng ISO string để biểu diễn và phải chuyển kiểu trước khi ghi. Không ghi sentinel `serverTimestamp` dưới dạng string.

### exams/{examId}

| Trường | Kiểu | Quy ước |
|---|---|---|
| title, titleSort, provider | string | titleSort = title.normalize('NFKC').toLowerCase(); dùng thứ tự từ điển ổn định, chưa phải collation tiếng Việt |
| status | string enum | `draft`, `published`, `archived` |
| questionCount | integer | Số câu published thực tế sau kiểm tra, không chép số khai báo |
| source | map | `key`, `examId` string, `url`, `declaredQuestionCount` integer, `lastUpdatedRaw` string, `capturedAt` Timestamp, `flags` map giữ isBeta/isMCOnly/isImplemented |
| contentHash | string | SHA-256 theo quy tắc mục 4 |
| createdAt, updatedAt | Timestamp | Thời gian hệ thống nhập; createdAt giữ nguyên khi cập nhật |

### exams/{examId}/questions/{questionId}

| Trường | Kiểu | Quy ước |
|---|---|---|
| position, topic | integer, string | position > 0 |
| status | enum | `published`, `withdrawn`; lỗi nghiêm trọng bị cách ly trước khi xuất bản |
| preview | string | 180 Unicode code point đầu của text sau khi thay placeholder bằng khoảng trắng; không dùng làm ID |
| stem | block[] | Nội dung đề, thứ tự phần tử là thứ tự đọc |
| choices | array of map | `{label: string, blocks: block[]}`, sắp nhãn A–Z; thiếu choices → [] |
| answer | map | `{raw: string, labels: string[], examTopicsRaw: string, verified: false}`; giữ nguyên nguồn, không khẳng định đúng chuyên môn |
| explanation | map | `{kind: 'missing'|'reference'|'text', blocks: block[]}`; rỗng → missing + []; câu 158 → reference |
| community | map | `{raw: string[], parsed: [{labels: string[], percent: number}], unparsed: string[]}`; không ép tổng tỷ lệ |
| quality | map | `{flags: string[], duplicateTextHash: string|null}` |
| commentCount | integer | Đếm document bình luận hợp lệ kể cả replies |
| source | map | `questionId` string (ID nguồn), `url`, `timestampRaw`, `unixTimestamp` integer, `isMCRaw` boolean, `capturedAt` Timestamp |
| contentHash | string | Hash nội dung chuẩn hóa; bao gồm chất lượng và nguồn có ý nghĩa, không gồm giờ import |
| createdAt, updatedAt | Timestamp | Thời gian nhập/cập nhật |

Không nhúng toàn bộ discussion vào câu: danh sách câu không tải hàng nghìn bình luận. Bản đầu phân trang 20 câu; mỗi câu có thể chứa cả nội dung đọc để tránh thêm một lần đọc chi tiết. Nếu tải nặng thực tế, mới tách summary/detail ở phiên bản schema sau.

### comments/{commentId}

`parentId: string|null`, `author: string`, `blocks: block[]`, `upvotes: integer|null`, `sourceTimestampRaw: string`, `sourceCreatedAt: Timestamp|null`, `contentHash: string`, `createdAt: Timestamp`, `updatedAt: Timestamp`.

Parse upvotes khi là số nguyên không âm; timestamp bình luận là Unix seconds string có thể có phần thập phân; giá trị không hợp lệ giữ raw và null. Không dùng thứ tự timestamp để suy ra parent. Client không được sửa hoặc viết bình luận nguồn. Thảo luận chỉ là nội dung tham khảo, không phải lời giải.

### users/{uid}

`schemaVersion`, `createdAt`, `updatedAt` Timestamp. Không cần sao chép email, mật khẩu hoặc token từ Auth. Document cha không bắt buộc phải có để subcollection tồn tại; khi đăng nhập lần đầu app tạo metadata tối thiểu này.

### users/{uid}/bookmarks/{bookmarkId}

`schemaVersion`, `examId: string`, `questionId: string`, `createdAt: Timestamp`.

Set cùng path là idempotent; dùng transaction giữ createdAt nếu đã tồn tại. Bỏ bookmark = delete document. Không sao chép đề/đáp án vào bookmark. Danh sách đọc exam/câu bằng ID; nếu câu withdrawn/không còn truy cập được thì hiển thị nội dung không khả dụng và cho phép bỏ bookmark.

### users/{uid}/readingProgress/{examId}

`schemaVersion`, `questionId: string`, `positionSnapshot: integer`, `updatedAt: Timestamp`.

Một vị trí gần nhất cho mỗi exam. Chỉ lưu khi người dùng thực sự mở câu, debounce khoảng 2 giây và flush khi rời màn hình nếu có thể; không ghi theo từng pixel cuộn. `questionId` là tham chiếu chính; positionSnapshot chỉ giúp chọn câu gần nhất khi nguồn đổi thứ tự/rút câu. Không xem position là số câu đã học hoặc điểm hoàn thành. Đồng bộ dùng lần ghi được server chấp nhận cuối cùng; thiết bị offline đồng bộ muộn có thể thay vị trí mới hơn, chấp nhận ở v1. Bookmark thêm/xóa đồng thời cũng theo lần ghi cuối.

## 3. Nội dung và hình ảnh

Chốt v1 chỉ hai loại block, áp dụng cho stem, choices, explanation và comments:

```json
[
  {"type": "text", "text": "Đoạn văn có thể có\nxuống dòng"},
  {"type": "image", "url": "https://img.examtopics.com/aws-devops-engineer-professional/image6.png", "sourceUrl": "https://img.examtopics.com/aws-devops-engineer-professional/image6.png", "alt": "Ảnh trong câu hỏi 94"}
]
```

- Text là plain text UTF-8: chuẩn LF, trim hai đầu, giữ Unicode/bullet/khoảng trắng bên trong. URL văn bản được renderer nhận diện; không chạy HTML hoặc script. Chưa có block bảng, LaTeX hoặc code riêng vì nguồn hiện tại không cung cấp dạng cấu trúc đó; code trong ảnh giữ nguyên ảnh.
- Thay `//IMG//` tuần tự bằng question_images, answer_images áp dụng cho explanation. Nếu số lượng không khớp, giữ text chưa thay và thêm ảnh chưa dùng ở cuối, gắn `image_placeholder_mismatch`; không bỏ ảnh hoặc đoán vị trí.
- **Lưu ảnh v1:** giữ URL HTTPS gốc, không đưa bytes/base64 vào Firestore và chưa thêm Firebase Storage. `url` là URL hiển thị, `sourceUrl` là nguồn gốc; ban đầu hai trường giống nhau. Nếu cần mirror sau này chỉ đổi url và giữ sourceUrl.
- URL ảnh chỉ chấp nhận hostname `img.examtopics.com` hoặc `www.examtopics.com`, HTTPS, không userinfo; nguồn mới phải bổ sung allowlist có kiểm tra. Không fetch media trong task thiết kế này.
- Hiển thị ảnh bằng component dùng chung có phóng to, loading/error và mở nguồn. Khả năng tải ảnh trên iOS/web và CORS cần kiểm tra ở task 5/8; chưa có bảo đảm các host ngoài luôn phục vụ được. Ảnh lỗi không làm mất phần text. Nếu cần mirror để phát hành ổn định, xử lý ở task import/phát hành trước khi chốt release.
- Không tự tách choices của câu 145; giữ đề nguyên văn và choices []. Câu 67 gắn `answer_label_missing`; câu 103 `choice_content_incomplete`; câu 136/141 `encoding_suspect`; 188/189 có cùng duplicateTextHash. Chưa tự sửa lỗi nguồn.
- `quality.flags`: `choices_embedded_in_stem`, `answer_label_missing`, `choice_content_incomplete`, `encoding_suspect`, `image_placeholder_mismatch`, `duplicate_text`. Lỗi có thể chỉ nằm ở bình luận: báo trong log import thay vì gán sai lỗi cho đề.

## 4. Import lại và cập nhật

1. Kiểm tra exam/source ID, question ID, position, kiểu dữ liệu và URL trước khi ghi; dữ liệu không hợp lệ ghi vào báo cáo cách ly cục bộ. Không phát sinh document published thiếu ID hoặc đề.
2. Tính SHA-256 UTF-8 của canonical JSON: key object sắp theo thứ tự code point, array giữ thứ tự, không undefined/NaN. Với câu, hash các trường position/topic/status/preview/stem/choices/answer/explanation/community/quality và source trừ capturedAt; commentCount và thời gian nhập không thuộc hash. Exam hash title/titleSort/provider/status/questionCount và source trừ capturedAt. Bình luận hash parentId/author/blocks/upvotes/sourceTimestampRaw/sourceCreatedAt (ISO UTC hoặc null). Ghi `normalizationVersion: 1` vào báo cáo import để truy vết.
3. Cùng path + cùng hash → bỏ qua nội dung, giữ createdAt/updatedAt; báo cáo lần chạy vẫn lưu thời điểm quan sát mới nhất cục bộ. capturedAt trong document là lần thu thập của phiên bản nội dung đang lưu.
4. Cùng path + khác hash → thay các trường thuộc nguồn trong một document write, giữ createdAt, đặt updatedAt serverTimestamp. Cập nhật commentCount riêng khi bình luận thay đổi; parent question updatedAt cũng thay đổi. Không viết đè users hoặc sửa ID khi nội dung thay đổi.
5. Chỉ snapshot crawl đầy đủ đã kiểm tra mới được đánh dấu câu vắng mặt là withdrawn; partial crawl không xóa/rút câu. Rút câu giữ document để bookmark còn tham chiếu được. Tính lại questionCount sau khi hoàn tất; exam draft trong lần nhập đầu và published sau đối chiếu thành công.
6. V1 không bảo đảm snapshot nhất quán toàn exam trong lúc cập nhật nhiều document. Lần nhập đầu chỉ xuất bản sau cùng; các lần cập nhật giữ từng document hợp lệ và ghi báo cáo tiến trình, có thể chạy lại. Nếu cần đổi toàn bộ exam nguyên tử, thiết kế versioned releases sau.
7. Giữ raw JSON và báo cáo cách ly cục bộ, không đặt trong Hosting public directory. Không lưu cookie/token, Next.js wrapper hoặc toàn bộ raw discussion vào document câu.

## 5. Truy vấn, phân trang và index

Mọi query lấy trang bằng `limit(20)` và `startAfterDocument(lastSnapshot)`, không dùng offset. Thứ tự phụ document ID giải quyết giá trị bằng nhau. Cursor là snapshot có đủ các trường orderBy; khi đổi bộ lọc phải reset cursor. Tải một lần theo trang, chưa cần listener toàn exam.

| Màn hình | Collection / điều kiện / thứ tự | Index |
|---|---|---|
| Exam | exams: status == published; titleSort ASC, documentId ASC | composite status ASC + titleSort ASC |
| Câu trong exam | exams/E/questions: status == published; position ASC, documentId ASC | composite status ASC + position ASC |
| Đọc trực tiếp | get exams/E/questions/Q, kiểm tra status | không cần composite |
| Câu sau | query câu published; position > currentPosition; position ASC, documentId ASC; limit 1 | cùng index câu ASC |
| Câu trước | query câu published; position < currentPosition; position DESC, documentId DESC; limit 1 | composite status ASC + position DESC |
| Bookmark | users/U/bookmarks: createdAt DESC, documentId DESC | single-field createdAt DESC |
| Tiếp tục một exam | get users/U/readingProgress/E rồi get câu | không cần composite |
| Exam đọc gần đây | users/U/readingProgress: updatedAt DESC, documentId DESC | single-field updatedAt DESC |
| Thảo luận | exams/E/questions/Q/comments: documentId ASC | index tên document mặc định |

V1 tải thảo luận theo ID để render phẳng có chỉ dấu reply `parentId`; nếu trang hiện tại chưa có parent, cho phép đọc parent bằng ID. Không tải toàn cây đệ quy hoặc hứa thứ tự theo lượt thích. Không có collection-group query, lọc provider/topic hay full-text search trong v1.

Định nghĩa composite có thể triển khai ở `../firestore.indexes.json`; document ID là phần cuối index mặc định cùng chiều field sort cuối. Miễn index toàn bộ field của các collection group bằng wildcard; chỉ bật lại single-field createdAt của bookmarks và updatedAt của readingProgress. Các composite khai báo riêng vẫn phục vụ query. Nhờ đó stem/choices/explanation/community/source không bị index văn bản dài không cần thiết. Deploy và thử query trên emulator/project thuộc task 3/7, chưa được xác minh trên cloud.

## 6. Quyền truy cập và giới hạn

- Quyết định v1: yêu cầu đăng nhập để đọc exam published và câu published thuộc exam published; bookmark/progress chỉ chủ uid được đọc/ghi. Exam draft, archived và câu withdrawn không đọc từ client. Rules phải dùng điều kiện trạng thái tương ứng; queries status ở bảng trên là một phần hợp đồng, rules không tự lọc kết quả.
- Comments chỉ đọc khi exam/câu cha published; client không được ghi nội dung nguồn. Import bằng Admin SDK/IAM từ môi trường tin cậy, không nhúng service account vào Flutter/web. Rules và kiểm thử quyền là task 7.
- Chủ uid chỉ ghi field cho phép và schemaVersion 1, ID/path khớp payload; createdAt/updatedAt do serverTimestamp, createdAt bookmark không đổi khi update. Rules kiểm tra tham chiếu exam/câu published khi thêm bookmark hoặc lưu progress; delete bookmark vẫn được phép khi câu rút. Client không thể tự cấp quyền xuất bản qua users.
- Firestore giới hạn document 1 MiB. Import đặt ngưỡng nội bộ bảo thủ 900.000 byte ước tính có overhead tên/path, đồng thời kiểm tra giới hạn chính thức; vượt ngưỡng thì cách ly để thiết kế lại, không cắt text âm thầm. Bình luận tách riêng tránh dồn dung lượng vào câu.

## 7. Ví dụ và tiêu chí bàn giao

`firestore-examples.json` gồm ví dụ đầy đủ cho exam, question, comment, user, bookmark, readingProgress và câu có ảnh. Nội dung câu/ảnh/bình luận lấy từ dữ liệu thực; uid và các timestamp hệ thống minh họa. `contentHash` trong ví dụ là placeholder được ghi rõ, importer phải tính lại. Không phải file có thể import trực tiếp bằng Firebase CLI.

- [x] Cấu trúc exam/câu và từ điển trường/kiểu.
- [x] ID ổn định và quy tắc cập nhật/thiếu/trùng/rút câu.
- [x] Bookmark và vị trí đọc theo Auth uid, có xử lý xung đột thiết bị.
- [x] Truy vấn, thứ tự, cursor và danh sách index.
- [x] Định dạng text/ảnh, URL nguồn, lỗi dữ liệu và lời giải thiếu.
- [x] Ví dụ document cho từng loại.

Nguồn kỹ thuật đối chiếu: [giới hạn Firestore](https://firebase.google.com/docs/firestore/quotas), [cursor phân trang](https://firebase.google.com/docs/firestore/query-data/query-cursors), [index và miễn index](https://firebase.google.com/docs/firestore/query-data/index-overview). Các quy tắc nghiệp vụ ở trên là quyết định thiết kế của dự án.
