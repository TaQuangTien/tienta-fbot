Miễn trừ trách nhiệm:
```text
Dự án có sử dụng - WS3-FCA
Là một thư viện cung cấp các API (unofficial) hỗ trợ bạn xây dựng 1 bot chat Facebook Messenger bằng chính tài khoản cá nhân của bạn.

Lưu ý:
1- Việc sử dụng thư viện này đồng nghĩa với việc bạn đang làm trái với chính sách của Facebook và nó có thể khiến cho tài khoản của bạn bị vô hiệu hóa. Chúng tôi sẽ không chịu trách nhiệm nếu điều đó xảy ra, vậy nên hãy cân nhắc trước khi sử dụng.
2- Đăng nhập nhiều lần có thể dẫn đến tài khoản bị khóa tạm thời.
3- Không hỗ trợ các cuộc trò chuyện cá nhân có mã hóa đầu cuối.
````

-----

## A- CÀI ĐẶT

1.  Tải toàn bộ mã nguồn về để trong thư mục (tienta-fbot)

2.  Mở Terminal tại thư mục (tienta-fbot) và chạy lệnh:

<!-- end list -->

```cli
docker build -t tienta-fbot .
```

3.  Sau khi build xong, bạn có thể tạo container bằng lệnh:

<!-- end list -->

```cli
docker run --restart=on-failure -d --name tienta-fbot -p 3000:3000 -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=admin -e X_API_KEY=your-secret-api-key -e SESSION_SECRET=your-secret -e SELF_LISTEN=false tienta-fbot:latest
```

4.  Truy cập container\_ip:3000 để sử dụng

5.  Các biến môi trường cần lưu ý:
      - ADMIN\_USERNAME=admin // Tên đăng nhập trang chủ.
      - ADMIN\_PASSWORD=admin // Mật khẩu đăng nhập trang chủ.
      - X\_API\_KEY=your-secret-api-key // Header x-api-key để xác thực các Request tới API.
      - SELF\_LISTEN=true // Lắng nghe tin nhắn của chính mình, Webhook sẽ nhận sự kiện có isSelf=true kèm với isAPI=true/false.

-----

## B- SỬ DỤNG

0.  Truy cập Facebook.Com và Sử dụng Extension trình duyệt để trích xuất Cookie Header String (Ví dụ: Cookie-Editor)
1.  Cập nhật Webhook (POST) - copy từ n8n
2.  Bấm "Đăng nhập qua Cookie"
3.  Dán Cookie Header String và bấm đăng nhập
4.  Sau khi đăng nhập thành công, mọi sự kiện Messenger sẽ được đẩy về Webhook
5.  Đọc tài liệu API để biết cách gửi Message, Photo,...

-----

## C- ỦNG HỘ DỰ ÁN

Nếu bạn thấy dự án này hữu ích và muốn ủng hộ công sức phát triển, bạn có thể mời mình một ly cà phê nhé\!

![Alt text](qr.png)

Sự ủng hộ của bạn là động lực rất lớn để mình tiếp tục phát triển và cải thiện dự án\!

-----

Credit: TienTa | https://www.facebook.com/tis.gorila

```
