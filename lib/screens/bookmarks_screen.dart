import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_client.dart';

class BookmarksScreen extends StatefulWidget {
  const BookmarksScreen({super.key});

  @override
  State<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends State<BookmarksScreen> {
  List<dynamic> _bookmarks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchBookmarks();
  }

  Future<void> _fetchBookmarks() async {
    try {
      final response = await apiClient.get('/bookmarks');
      setState(() {
        _bookmarks = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error fetching bookmarks: $e');
    }
  }

  Future<void> _removeBookmark(String newsId) async {
    try {
      await apiClient.post('/bookmarks', data: {
        'newsId': newsId,
        'action': 'remove',
      });
      setState(() {
        _bookmarks.removeWhere((item) => item['newsId'] == newsId);
      });
    } catch (e) {
      debugPrint('Error removing bookmark: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          'Saved Stories',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1A1A1A),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1A1A1A)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)))
          : _bookmarks.isEmpty
              ? Center(
                  child: Text(
                    'No saved stories found.',
                    style: GoogleFonts.poppins(color: Colors.grey),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _bookmarks.length,
                  itemBuilder: (context, index) {
                    final item = _bookmarks[index];
                    final news = item['news'];
                    if (news == null) return const SizedBox.shrink();

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(12),
                        title: Text(
                          news['title'] ?? '',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 8.0),
                          child: Text(
                            news['shortDesc'] ?? '',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(fontSize: 12),
                          ),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.bookmark_remove, color: Color(0xFFD32F2F)),
                          onPressed: () => _removeBookmark(item['newsId']),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
