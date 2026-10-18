class Exam {
  const Exam({
    required this.id,
    required this.title,
    required this.provider,
    required this.questionCount,
  });
  final String id;
  final String title;
  final String provider;
  final int questionCount;

  factory Exam.fromMap(String id, Map<String, dynamic> data) => Exam(
    id: id,
    title: data['title'] as String,
    provider: data['provider'] as String,
    questionCount: (data['questionCount'] as num).toInt(),
  );
}
