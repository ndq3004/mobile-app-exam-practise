import 'package:flutter/material.dart';

import '../data/reader_services.dart';
import 'message_page.dart';

class LibraryPage extends StatelessWidget {
  const LibraryPage({super.key, required this.services});
  final ReaderServices services;
  @override
  Widget build(BuildContext context) => StreamBuilder<String?>(
    stream: services.userIds,
    initialData: services.currentUserId,
    builder: (context, snapshot) => MessagePage(
      title: 'Thư viện',
      icon: Icons.auto_stories_outlined,
      message: 'Một câu hỏi, thêm một điều hiểu rõ',
      detail: 'Thư viện đề thi và nội dung học sẽ xuất hiện sau khi dữ liệu được nhập.',
      footer: snapshot.hasError
          ? 'Chưa thể tải trạng thái tài khoản'
          : snapshot.data == null
          ? 'Chưa đăng nhập'
          : 'Đã đăng nhập',
    ),
  );
}
