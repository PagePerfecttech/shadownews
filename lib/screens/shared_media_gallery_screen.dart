import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../api/api_client.dart';

class SharedMediaGalleryScreen extends StatefulWidget {
  const SharedMediaGalleryScreen({super.key});

  @override
  State<SharedMediaGalleryScreen> createState() => _SharedMediaGalleryScreenState();
}

class _SharedMediaGalleryScreenState extends State<SharedMediaGalleryScreen> {
  final List<dynamic> _media = [];
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _fetchMedia();
  }

  Future<void> _fetchMedia() async {
    try {
      final response = await apiClient.get('/media');
      setState(() {
        _media.addAll(response.data['media'] ?? []);
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching shared media: $e');
      setState(() {
        _hasError = true;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shared Gallery'),
        backgroundColor: const Color(0xFFD32F2F),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)))
          : _hasError
              ? const Center(child: Text('Failed to load gallery'))
              : _media.isEmpty
                  ? const Center(child: Text('No media available'))
                  : GridView.builder(
                      padding: const EdgeInsets.all(8),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                        childAspectRatio: 1,
                      ),
                      itemCount: _media.length,
                      itemBuilder: (context, index) {
                        final item = _media[index];
                        final url = item['thumbnailUrl'] ?? item['originalUrl'];
                        if (url == null) return const SizedBox();

                        return GestureDetector(
                          onTap: () {
                            Navigator.pop(context, item['originalUrl']);
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              color: Colors.grey[200],
                            ),
                            clipBehavior: Clip.hardEdge,
                            child: CachedNetworkImage(
                              imageUrl: url,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => const Center(
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFFD32F2F),
                                ),
                              ),
                              errorWidget: (context, url, error) => const Icon(Icons.error),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
