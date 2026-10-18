import 'package:flutter/material.dart';

import 'app.dart';
import 'core/app_config.dart';
import 'data/firebase_services.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    final config = AppConfig.fromEnvironment();
    final services = await FirebaseServices.initialize(config);
    runApp(ExamReaderApp(services: services, environment: config.environment));
  } catch (error, stack) {
    debugPrint('App initialization failed: $error\n$stack');
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off_outlined, size: 48),
                  const SizedBox(height: 16),
                  const Text('Chưa thể mở ứng dụng'),
                  const SizedBox(height: 8),
                  const Text(
                    'Vui lòng kiểm tra kết nối hoặc cấu hình ứng dụng rồi thử lại.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: main, child: const Text('Thử lại')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
