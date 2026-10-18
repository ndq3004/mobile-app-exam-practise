import 'package:firebase_core/firebase_core.dart';

class AppConfig {
  const AppConfig({required this.environment, required this.firebaseOptions});
  final String environment;
  final FirebaseOptions firebaseOptions;

  static AppConfig fromEnvironment() => fromValues(
    environment: const String.fromEnvironment('APP_ENV', defaultValue: 'dev'),
    apiKey: const String.fromEnvironment('FIREBASE_API_KEY'),
    appId: const String.fromEnvironment('FIREBASE_APP_ID'),
    senderId: const String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    projectId: const String.fromEnvironment('FIREBASE_PROJECT_ID'),
    authDomain: const String.fromEnvironment('FIREBASE_AUTH_DOMAIN'),
    iosBundleId: const String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID'),
  );

  static AppConfig fromValues({
    required String environment,
    required String apiKey,
    required String appId,
    required String senderId,
    required String projectId,
    String authDomain = '',
    String iosBundleId = '',
  }) {
    if (!['dev', 'prod'].contains(environment)) {
      throw ArgumentError('APP_ENV must be dev or prod');
    }
    if ([
      apiKey,
      appId,
      senderId,
      projectId,
    ].any((value) => value.trim().isEmpty)) {
      throw ArgumentError('Missing Firebase build configuration');
    }
    if (environment == 'dev' && projectId != 'exam-render-dev') {
      throw ArgumentError('Development must use exam-render-dev');
    }
    if (environment == 'prod' && projectId == 'exam-render-dev') {
      throw ArgumentError('Production must use a separate Firebase project');
    }
    return AppConfig(
      environment: environment,
      firebaseOptions: FirebaseOptions(
        apiKey: apiKey,
        appId: appId,
        messagingSenderId: senderId,
        projectId: projectId,
        authDomain: authDomain.isEmpty ? null : authDomain,
        iosBundleId: iosBundleId.isEmpty ? null : iosBundleId,
      ),
    );
  }
}
