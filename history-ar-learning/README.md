# History AR Learning

Web app học lịch sử tích hợp WebAR để quét bản đồ vật lý và hiển thị các mốc, mô hình 3D, video diễn biến và lời thuyết minh theo timeline.

## Tính Năng Chính

- Quét bản đồ chiến dịch Điện Biên Phủ bằng camera điện thoại với MindAR.
- Hiển thị marker và mô hình 3D trên bản đồ thực tế.
- Phát video diễn biến khi người dùng chọn mốc có nội dung, ví dụ Him Lam.
- Cấu hình marker, timeline, action và đường dẫn media qua file JSON/editor.

## Tech Stack

- React 19 + Vite
- Tailwind CSS
- Three.js cho phần xem trước/chỉnh sửa 3D
- A-Frame + MindAR Image Tracking cho trải nghiệm AR trên trình duyệt

## Cài Đặt Và Chạy

Yêu cầu: Node.js và npm.

```bash
cd history-ar-learning
npm install
```

Chạy trên máy tính:

```bash
npm run dev
```

Chạy AR trên điện thoại cùng mạng Wi-Fi:

```bash
npm run dev:https
```

Sau đó mở địa chỉ HTTPS theo IP máy tính trên điện thoại, chấp nhận chứng chỉ phát triển nếu trình duyệt yêu cầu, cho phép quyền camera và bấm `Bắt đầu AR + voice`.

Camera trên điện thoại yêu cầu HTTPS; truy cập bằng địa chỉ HTTP nội bộ sẽ không mở được camera.

## Tài Nguyên Media

Voice lời thoại và video diễn biến của nhóm được lưu trên Google Drive:

- [Tải voice lời thoại và video diễn biến](https://drive.google.com/drive/u/0/folders/1RM9LX91uqjJJz_0Hf2BQ_MQp-2-1JDTb)

Sau khi tải về, đưa file cần dùng vào thư mục public của web app, ví dụ:

```text
public/ar-assets/videos/him-lam.mp4
public/ar-assets/audios/ten-loi-thoai.mp3
```

Trong `public/ar-config/ar-timeline-config.json`, luôn dùng đường dẫn public bắt đầu bằng `/ar-assets/`, không dùng đường dẫn tuyệt đối trên máy cá nhân:

```json
{
  "videoPath": "/ar-assets/videos/him-lam.mp4",
  "audioPath": "/ar-assets/audios/ten-loi-thoai.mp3"
}
```

## Cấu Trúc Phần AR

```text
public/ar-targets/
  dien_bien_phu_map.jpg       Ảnh bản đồ target
  dien_bien_phu_map.mind      Dữ liệu nhận diện MindAR

public/ar-assets/
  marker.glb                  Model marker
  airplane.glb                Model máy bay
  videos/                     Video tại các mốc lịch sử
  audios/                     Voice/thuyết minh timeline

public/ar-config/
  ar-timeline-config.json     Tọa độ marker và kịch bản AR

src/
  MapImageARScene.jsx         Cảnh AR khi chạy trên camera
  TimelineEditor.jsx          Giao diện chỉnh timeline
  TimelineMap3DPreview.jsx    Xem trước marker/action trên bản đồ
```

## Chỉnh Sửa Nội Dung AR

File `public/ar-config/ar-timeline-config.json` chứa:

- `markers`: các địa điểm, tọa độ trên bản đồ và video mở khi chọn marker.
- `segments`: các đoạn thuyết minh và action 3D theo trình tự.
- `actions`: hiệu ứng như máy bay, vị trí, đường bay, thời gian và model.

Khi thêm media mới:

1. Tải file từ Drive và đặt vào `public/ar-assets/videos/` hoặc `public/ar-assets/audios/`.
2. Cập nhật `videoPath` hoặc `audioPath` trong config bằng đường dẫn `/ar-assets/...`.
3. Kiểm tra trên điện thoại bằng `npm run dev:https`.
4. Với media được chia sẻ qua Drive, không commit file video/audio vào repo; mỗi thành viên tải file về đúng đường dẫn đã cấu hình.

## Kiểm Tra Trước Khi Đẩy Code

```bash
npm run lint
npm run build
```

## AI Video Chatbot

Tính năng này thêm backend riêng để index transcript YouTube và trả lời câu hỏi dựa trên nội dung phụ đề video. Frontend chỉ gọi API backend; Gemini API key nằm trong `backend/.env` và không được đưa vào React.

### Luồng Xử Lý

1. Người dùng gửi YouTube URL có phụ đề.
2. Backend lấy transcript kèm timestamp bằng `youtube-transcript`.
3. Transcript được chia thành chunks theo `CHUNK_SECONDS` và `OVERLAP_SECONDS`.
4. Backend tạo embedding bằng Gemini và lưu chunks vào MongoDB.
5. Khi người dùng hỏi, backend tạo embedding cho câu hỏi.
6. Backend lấy chunks trong MongoDB, tính cosine similarity và chọn top chunks liên quan.
7. Gemini nhận câu hỏi cùng transcript chunks liên quan và trả lời bằng tiếng Việt.
8. Frontend hiển thị câu trả lời cùng timestamp nguồn để bấm nhảy video.

### Cài Đặt Backend

Từ thư mục root của project:

```bash
cd backend
npm install
```

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Nội dung mẫu:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/history_ar_learning
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_GENERATION_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_TEMPERATURE=0.2
FRONTEND_URL=http://localhost:5173
CHUNK_SECONDS=90
OVERLAP_SECONDS=15
TOP_K=5
MAX_QUESTION_LENGTH=1000
MIN_RELEVANCE_SCORE=0.2
EMBEDDING_RETRY_COUNT=2
```

Biến bổ sung:

- `MIN_RELEVANCE_SCORE`: ngưỡng điểm similarity tối thiểu. Nếu không có chunk đủ liên quan, chatbot trả lời `Mình không tìm thấy thông tin này trong video.`
- `EMBEDDING_RETRY_COUNT`: số lần retry khi Gemini embedding API lỗi tạm thời.
- `GEMINI_TEMPERATURE`: mức độ sáng tạo của Gemini khi sinh câu trả lời; nên để thấp để bám transcript.

### Chạy MongoDB

Nếu đã cài MongoDB local:

```bash
mongod
```

Hoặc dùng Docker:

```bash
docker run --name history-ar-mongo -p 27017:27017 -d mongo:7
```

### Chạy Backend

```bash
cd backend
npm run dev
```

Backend chạy tại:

```text
http://localhost:3000/api
```

### Chạy Frontend

Trong `history-ar-learning`, tạo `.env`:

```bash
cp .env.example .env
```

Nội dung:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Chạy frontend:

```bash
npm install
npm run dev
```

Nếu cần HTTPS cho AR:

```bash
npm run dev:https
```

### API Test Bằng Postman

Index video:

```http
POST http://localhost:3000/api/videos/index
Content-Type: application/json
```

```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=a6ucOeP11Gk",
  "title": "Chiến dịch Điện Biên Phủ",
  "description": "Video thuyết minh chiến dịch Điện Biên Phủ",
  "relatedMarkerId": "him-lam",
  "relatedTimelineSegmentId": "segment-him-lam"
}
```

Danh sách video:

```http
GET http://localhost:3000/api/videos
GET http://localhost:3000/api/videos?relatedMarkerId=him-lam
```

Chat với video:

```http
POST http://localhost:3000/api/videos/{videoId}/chat
Content-Type: application/json
```

```json
{
  "question": "Trận Him Lam có ý nghĩa gì trong chiến dịch Điện Biên Phủ?"
}
```

Lấy chunks và lịch sử chat:

```http
GET http://localhost:3000/api/videos/{videoId}/chunks
GET http://localhost:3000/api/videos/{videoId}/messages
```

Xóa video cùng chunks/messages:

```http
DELETE http://localhost:3000/api/videos/{videoId}
```

### Kiểm Tra MongoDB

Mở `mongosh`:

```bash
mongosh mongodb://127.0.0.1:27017/history_ar_learning
```

Các câu lệnh kiểm tra:

```js
db.videos.find({}, { title: 1, youtubeVideoId: 1, status: 1, totalChunks: 1, relatedMarkerId: 1 }).pretty()
db.transcriptchunks.countDocuments()
db.chatmessages.find({}, { role: 1, content: 1, sources: 1, videoId: 1 }).pretty()
```

### Lỗi Thường Gặp

- Video không có phụ đề: backend trả lỗi không lấy được transcript. Hãy bật captions/subtitles cho video YouTube hoặc chọn video khác.
- Gemini API key sai: kiểm tra `GEMINI_API_KEY` trong `backend/.env` và quyền truy cập Gemini API.
- MongoDB chưa chạy: kiểm tra `MONGO_URI` và đảm bảo `mongod` hoặc container Docker đang chạy.
- CORS error: kiểm tra `FRONTEND_URL` trong backend `.env` đúng với URL Vite đang chạy.
- Frontend không gọi được backend: kiểm tra `VITE_API_BASE_URL`, backend đã chạy và endpoint `/api/health` trả `{ "status": "ok" }`.

### Liên Kết Với Marker AR

Backend `Video` đã có `relatedMarkerId` và `relatedTimelineSegmentId`. Với marker Him Lam trong `public/ar-config/ar-timeline-config.json`, có thể index video với:

```json
{
  "relatedMarkerId": "him-lam",
  "relatedTimelineSegmentId": "segment-him-lam"
}
```

Frontend hiện có thể filter:

```http
GET http://localhost:3000/api/videos?relatedMarkerId=him-lam
```

MVP chưa tự động sửa `ar-timeline-config.json`; bước tiếp theo là đọc marker đang active trong AR rồi truyền `relatedMarkerId` vào UI chatbot để chỉ hiển thị video tương ứng.
