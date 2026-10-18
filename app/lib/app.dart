import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'data/reader_services.dart';
import 'ui/app_shell.dart';
import 'ui/library_page.dart';
import 'ui/message_page.dart';

class ExamReaderApp extends StatefulWidget {
  const ExamReaderApp({
    super.key,
    required this.services,
    required this.environment,
  });
  final ReaderServices services;
  final String environment;
  @override
  State<ExamReaderApp> createState() => _ExamReaderAppState();
}

class _ExamReaderAppState extends State<ExamReaderApp> {
  late final GoRouter router = GoRouter(
    initialLocation: '/library',
    routes: [
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(
            path: '/library',
            builder: (_, _) => LibraryPage(services: widget.services),
          ),
          GoRoute(
            path: '/bookmarks',
            builder: (_, _) => const MessagePage(
              title: 'Đã lưu',
              icon: Icons.bookmark_border,
              message: 'Những câu hỏi bạn lưu sẽ xuất hiện ở đây.',
              detail: 'Tính năng lưu câu hỏi sẽ được bổ sung ở bước tiếp theo.',
            ),
          ),
          GoRoute(
            path: '/settings',
            builder: (_, _) => MessagePage(
              title: 'Tài khoản',
              icon: Icons.person_outline,
              message: 'Học theo nhịp của bạn',
              detail: 'Đăng nhập và đồng bộ việc học sẽ được bổ sung ở bước tiếp theo.',
              footer: widget.environment == 'dev'
                  ? 'Phiên bản phát triển'
                  : null,
            ),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Không tìm thấy trang'),
            TextButton(
              onPressed: () => context.go('/library'),
              child: const Text('Về thư viện'),
            ),
          ],
        ),
      ),
    ),
  );
  @override
  void dispose() {
    router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
    title: 'Exam Render',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF365E58)),
      scaffoldBackgroundColor: const Color(0xFFF8F9F6),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFF8F9F6),
        centerTitle: false,
      ),
    ),
    routerConfig: router,
  );
}
