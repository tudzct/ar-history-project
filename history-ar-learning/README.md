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
