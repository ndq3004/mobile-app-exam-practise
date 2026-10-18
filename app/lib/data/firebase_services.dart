import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../core/app_config.dart';
import '../models/exam.dart';
import 'reader_services.dart';

class FirebaseServices implements ReaderServices {
  FirebaseServices({required this.auth, required this.firestore});
  final FirebaseAuth auth;
  final FirebaseFirestore firestore;

  static Future<FirebaseServices> initialize(AppConfig config) async {
    final app = Firebase.apps.isEmpty
        ? await Firebase.initializeApp(options: config.firebaseOptions)
        : Firebase.app();
    if (app.options.projectId != config.firebaseOptions.projectId) {
      throw StateError('Firebase project does not match build environment');
    }
    return FirebaseServices(
      auth: FirebaseAuth.instanceFor(app: app),
      firestore: FirebaseFirestore.instanceFor(app: app),
    );
  }

  @override
  Stream<String?> get userIds =>
      auth.authStateChanges().map((user) => user?.uid);
  @override
  String? get currentUserId => auth.currentUser?.uid;
  @override
  Future<List<Exam>> firstExams() async {
    if (auth.currentUser == null) {
      throw StateError('Sign in before reading exams');
    }
    final result = await firestore
        .collection('exams')
        .where('status', isEqualTo: 'published')
        .orderBy('titleSort')
        .orderBy(FieldPath.documentId)
        .limit(20)
        .get();
    return result.docs.map((doc) => Exam.fromMap(doc.id, doc.data())).toList();
  }
}
