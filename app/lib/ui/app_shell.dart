import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.location, required this.child});
  final String location;
  final Widget child;
  static const paths = ['/library', '/bookmarks', '/settings'];
  static const labels = ['Thư viện', 'Đã lưu', 'Tài khoản'];
  static const icons = [
    Icons.menu_book_outlined,
    Icons.bookmark_border,
    Icons.person_outline,
  ];
  @override
  Widget build(BuildContext context) {
    final selected = paths.indexOf(location).clamp(0, 2);
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 800;
        return Scaffold(
          appBar: AppBar(title: const Text('Exam Render')),
          body: SafeArea(
            child: Row(
              children: [
                if (wide) ...[
                  NavigationRail(
                    extended: constraints.maxWidth >= 1100,
                    selectedIndex: selected,
                    onDestinationSelected: (index) => context.go(paths[index]),
                    destinations: List.generate(
                      3,
                      (i) => NavigationRailDestination(
                        icon: Icon(icons[i]),
                        label: Text(labels[i]),
                      ),
                    ),
                  ),
                  const VerticalDivider(width: 1),
                ],
                Expanded(
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1040),
                      child: child,
                    ),
                  ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: wide
              ? null
              : NavigationBar(
                  selectedIndex: selected,
                  onDestinationSelected: (index) => context.go(paths[index]),
                  destinations: List.generate(
                    3,
                    (i) => NavigationDestination(
                      icon: Icon(icons[i]),
                      label: labels[i],
                    ),
                  ),
                ),
        );
      },
    );
  }
}
