import 'package:flutter/material.dart';

class MessagePage extends StatelessWidget {
  const MessagePage({
    super.key,
    required this.title,
    required this.icon,
    required this.message,
    required this.detail,
    this.footer,
  });
  final String title;
  final IconData icon;
  final String message;
  final String detail;
  final String? footer;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 48),
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              children: [
                Icon(
                  icon,
                  size: 56,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 20),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                Text(detail, textAlign: TextAlign.center),
                if (footer != null) ...[
                  const SizedBox(height: 32),
                  Text(footer!),
                ],
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
