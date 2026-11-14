import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../utils/events.dart';

class MainScaffold extends StatefulWidget {
  final StatefulNavigationShell navigationShell;

  const MainScaffold({super.key, required this.navigationShell});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  @override
  void initState() {
    super.initState();
    AppEvents.currentTab = widget.navigationShell.currentIndex;
    AppEvents.isBottomNavVisible.addListener(_onNavVisibilityChanged);
  }

  void _onNavVisibilityChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    AppEvents.isBottomNavVisible.removeListener(_onNavVisibilityChanged);
    super.dispose();
  }

  @override
  void didUpdateWidget(MainScaffold oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.navigationShell.currentIndex != widget.navigationShell.currentIndex) {
      final newIndex = widget.navigationShell.currentIndex;
      if (AppEvents.currentTab != newIndex) {
        AppEvents.currentTab = newIndex;
        AppEvents.tabChanged.add(newIndex);
      }
    }
  }

  void _goBranch(int index) {
    if (index == 3) {
      // Index 3 is WhatsApp Share tab -> Share App Link
      final String text = 'Download Shadow News App:\nhttps://play.google.com/store/apps/details?id=com.shadownews.app';
      final Uri whatsappUri = Uri.parse("whatsapp://send?text=${Uri.encodeComponent(text)}");
      canLaunchUrl(whatsappUri).then((canLaunch) {
        if (canLaunch) {
          launchUrl(whatsappUri, mode: LaunchMode.externalApplication);
        } else if (mounted) {
          // Fallback if WhatsApp not installed
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('WhatsApp is not installed')),
          );
        }
      });
      return;
    }

    if (index == 2 && index == widget.navigationShell.currentIndex) {
      AppEvents.homeTabTapped.add(null);
    }
    
    if (AppEvents.currentTab != index) {
      AppEvents.currentTab = index;
      AppEvents.tabChanged.add(index);
    }

    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = widget.navigationShell.currentIndex;
    // On Home screen (index 2), bottom nav is hidden so news card is full screen.
    // On click/tap anywhere on the news card/screen, it toggles into view.
    final bool showBottomNav = (currentIndex != 2) || AppEvents.isBottomNavVisible.value;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1E1E1E) : const Color(0xFFF5F5F5),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. True Full Screen Content
          Positioned.fill(
            child: widget.navigationShell,
          ),

          // 2. Overlapping Floating Bottom Navigation Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: IgnorePointer(
              ignoring: !showBottomNav,
              child: AnimatedSlide(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                offset: showBottomNav ? Offset.zero : const Offset(0, 1.2),
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 200),
                  opacity: showBottomNav ? 1.0 : 0.0,
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E1E1E).withValues(alpha: 0.96) : Colors.white.withValues(alpha: 0.96),
                      border: Border(
                        top: BorderSide(
                          color: isDark ? Colors.white12 : const Color(0xFFE0E0E0),
                          width: 0.8,
                        ),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 10,
                          offset: const Offset(0, -3),
                        ),
                      ],
                    ),
                    child: SafeArea(
                      top: false,
                      child: Container(
                        height: 60,
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildNavItem(
                              index: 0,
                              icon: Icons.add_box_outlined,
                              activeIcon: Icons.add_box,
                              label: 'పోస్ట్',
                              isSelected: currentIndex == 0,
                            ),
                            _buildNavItem(
                              index: 1,
                              icon: Icons.play_circle_outline,
                              activeIcon: Icons.play_circle_fill,
                              label: 'వీడియో',
                              isSelected: currentIndex == 1,
                            ),
                            _buildNavItem(
                              index: 2,
                              icon: Icons.home_outlined,
                              activeIcon: Icons.home,
                              label: 'హోమ్',
                              isSelected: currentIndex == 2,
                            ),
                            _buildNavItem(
                              index: 3,
                              icon: Icons.share_outlined, // WhatsApp Share
                              activeIcon: Icons.share,
                              label: 'షేర్ యాప్', // Share App
                              isSelected: currentIndex == 3,
                            ),
                            _buildNavItem(
                              index: 4,
                              icon: Icons.person_outline,
                              activeIcon: Icons.person,
                              label: 'ప్రొఫైల్',
                              isSelected: currentIndex == 4,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required bool isSelected,
  }) {
    const activeRed = Color(0xFFD32F2F);
    const inactiveColor = Color(0xFF757575);

    return Expanded(
      child: InkWell(
        onTap: () => _goBranch(index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: isSelected ? const EdgeInsets.all(8) : const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: isSelected ? activeRed : Colors.transparent,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isSelected ? activeIcon : icon,
                color: isSelected ? Colors.white : inactiveColor,
                size: isSelected ? 20 : 22,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? activeRed : inactiveColor,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
