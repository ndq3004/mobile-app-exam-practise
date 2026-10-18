import '../models/exam.dart';

abstract interface class ReaderServices {
  Stream<String?> get userIds;
  String? get currentUserId;
  Future<List<Exam>> firstExams();
}
