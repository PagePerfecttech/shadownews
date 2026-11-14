import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';

class ArticleWebViewScreen extends StatefulWidget {
  final String url;
  final String title;

  const ArticleWebViewScreen({super.key, required this.url, required this.title});

  @override
  State<ArticleWebViewScreen> createState() => _ArticleWebViewScreenState();
}

class _ArticleWebViewScreenState extends State<ArticleWebViewScreen> {
  late final WebViewController _controller;
  double _progress = 0;
  bool _canGoBack = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (int progress) {
          setState(() => _progress = progress / 100);
        },
        onPageFinished: (_) async {
          final canGoBack = await _controller.canGoBack();
          setState(() => _canGoBack = canGoBack);
        },
      ))
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_canGoBack,
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop && _canGoBack) {
          await _controller.goBack();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            widget.title,
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.w600,
              color: const Color(0xFF1A1A1A),
              fontSize: 16,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: const IconThemeData(color: Color(0xFF1A1A1A)),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(2),
            child: _progress < 1.0
                ? LinearProgressIndicator(
                    value: _progress,
                    color: const Color(0xFFD32F2F),
                    backgroundColor: Colors.grey.shade200,
                    minHeight: 2,
                  )
                : const SizedBox.shrink(),
          ),
        ),
        body: WebViewWidget(controller: _controller),
      ),
    );
  }
}
