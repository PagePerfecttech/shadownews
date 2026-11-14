import 'package:flutter/material.dart';
import 'dart:async';
import 'custom_ad_widget.dart';

class AdSliderWidget extends StatefulWidget {
  final List<dynamic> ads;

  const AdSliderWidget({super.key, required this.ads});

  @override
  State<AdSliderWidget> createState() => _AdSliderWidgetState();
}

class _AdSliderWidgetState extends State<AdSliderWidget> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.ads.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 4), (Timer timer) {
        if (_pageController.hasClients && mounted) {
          int nextPage = _currentPage + 1;
          if (nextPage >= widget.ads.length) {
            nextPage = 0;
            _pageController.jumpToPage(0);
            setState(() {
              _currentPage = 0;
            });
          } else {
            _pageController.animateToPage(
              nextPage,
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeInOut,
            );
          }
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.ads.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final double height = constraints.maxHeight.isInfinite || constraints.maxHeight <= 0
            ? 350.0
            : constraints.maxHeight;
        return Container(
          height: height,
          width: double.infinity,
          color: Colors.black,
          child: Stack(
            children: [
              PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  if (mounted) {
                    setState(() {
                      _currentPage = index;
                    });
                  }
                },
                itemCount: widget.ads.length,
                itemBuilder: (context, index) {
                  final adData = widget.ads[index];
                  return CustomAdWidget(ad: adData);
                },
              ),
              if (widget.ads.length > 1)
                Positioned(
                  bottom: 16,
                  left: 0,
                  right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(widget.ads.length, (index) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4.0),
                        height: 8.0,
                        width: _currentPage == index ? 24.0 : 8.0,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? const Color(0xFFD32F2F)
                              : Colors.white.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(4.0),
                          boxShadow: const [
                            BoxShadow(color: Colors.black26, blurRadius: 2)
                          ],
                        ),
                      );
                    }),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
