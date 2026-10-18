import 'package:examreader/app.dart';
import 'package:examreader/core/app_config.dart';
import 'package:examreader/data/reader_services.dart';
import 'package:examreader/models/exam.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class LocalServices implements ReaderServices {
  @override
  String? get currentUserId => null;
  @override
  Stream<String?> get userIds => Stream.value(null);
  @override
  Future<List<Exam>> firstExams() => throw StateError('No data before login');
}

void main() {
  test('Production cannot accidentally use development Firebase', () {
    expect(
      () => AppConfig.fromValues(
        environment: 'prod',
        apiKey: 'key',
        appId: 'app',
        senderId: 'sender',
        projectId: 'exam-render-dev',
      ),
      throwsArgumentError,
    );
    expect(
      () => AppConfig.fromValues(
        environment: 'dev',
        apiKey: '',
        appId: 'app',
        senderId: 'sender',
        projectId: 'exam-render-dev',
      ),
      throwsArgumentError,
    );
  });
  for (final width in [390.0, 1280.0]) {
    testWidgets('Navigation and layout at width $width', (tester) async {
      tester.view.physicalSize = Size(width, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        ExamReaderApp(services: LocalServices(), environment: 'dev'),
      );
      await tester.pumpAndSettle();
      expect(find.text('Một câu hỏi, thêm một điều hiểu rõ'), findsOneWidget);
      expect(
        find.byType(width < 800 ? NavigationBar : NavigationRail),
        findsOneWidget,
      );
      await tester.tap(find.text('Đã lưu').last);
      await tester.pumpAndSettle();
      expect(
        find.text('Những câu hỏi bạn lưu sẽ xuất hiện ở đây.'),
        findsOneWidget,
      );
      await tester.tap(find.text('Tài khoản').last);
      await tester.pumpAndSettle();
      expect(find.text('Phiên bản phát triển'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
