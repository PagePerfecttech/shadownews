import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../api/api_client.dart';
import '../config.dart';

class SearchScreen extends StatefulWidget {
  final String query;

  const SearchScreen({super.key, this.query = ''});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;

  List<dynamic> _results = [];
  bool _isLoading = false;
  int _total = 0;

  List<dynamic> _categories = [];
  List<dynamic> _districts = [];

  String? _selectedCategory;
  String? _selectedDistrict;

  @override
  void initState() {
    super.initState();
    _searchController.text = widget.query;
    _fetchFilters();
    if (widget.query.isNotEmpty) {
      _search();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _fetchFilters() async {
    try {
      final catResponse = await apiClient.get('/categories');
      final locResponse = await apiClient.get('/locations');

      setState(() {
        _categories = catResponse.data is List
            ? catResponse.data
            : (catResponse.data['categories'] ?? []);
        final states = locResponse.data['states'] as List? ?? [];
        if (states.isNotEmpty) {
          _districts = states[0]['districts'] ?? []; // default to TS districts
        }
      });
    } catch (e) {
      debugPrint('Error fetching filters: $e');
    }
  }

  Future<void> _search() async {
    if (_searchController.text.trim().length < 2 &&
        _selectedCategory == null &&
        _selectedDistrict == null) {
      setState(() {
        _results = [];
        _total = 0;
        _isLoading = false;
      });
      return;
    }

    setState(() => _isLoading = true);

    try {
      String url =
          '/search?q=${Uri.encodeComponent(_searchController.text.trim())}';
      if (_selectedCategory != null) url += '&category_id=$_selectedCategory';
      if (_selectedDistrict != null) url += '&district_id=$_selectedDistrict';

      final response = await apiClient.get(url);
      setState(() {
        _results = response.data['results'];
        _total = response.data['total'];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Search error: $e');
    }
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _search();
    });
  }

  String _timeAgo(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      final diff = DateTime.now().difference(date);
      if (diff.inDays > 0) return '${diff.inDays}d ago';
      if (diff.inHours > 0) return '${diff.inHours}h ago';
      if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
      return 'Just now';
    } catch (_) {
      return '';
    }
  }

  String _formatUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('/')) {
      return '${AppConfig.baseUrl}$url';
    }
    return url.replaceAll(
      RegExp(r'placehold\.co/(\d+x\d+)/'),
      r'placehold.co/$1/png/',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          'Search',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1A1A1A),
            fontSize: 18,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1A1A1A)),
      ),
      body: Column(
        children: [
          // Search Bar & Filters
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Search news...',
                    hintStyle: GoogleFonts.poppins(color: Colors.grey),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: Colors.grey.shade100,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              _search();
                            },
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.grey.shade100,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          isDense: true,
                        ),
                        hint: Text(
                          'Category',
                          style: GoogleFonts.poppins(fontSize: 13),
                        ),
                        initialValue: _selectedCategory,

                        items: _categories.map<DropdownMenuItem<String>>((c) {
                          return DropdownMenuItem<String>(
                            value: c['id'],
                            child: Text(
                              c['name'],
                              style: GoogleFonts.poppins(fontSize: 13),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() => _selectedCategory = val);
                          _search();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.grey.shade100,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          isDense: true,
                        ),
                        hint: Text(
                          'District',
                          style: GoogleFonts.poppins(fontSize: 13),
                        ),
                        initialValue: _selectedDistrict,
                        items: _districts.map<DropdownMenuItem<String>>((d) {
                          return DropdownMenuItem<String>(
                            value: d['id'],
                            child: Text(
                              d['name'],
                              style: GoogleFonts.poppins(fontSize: 13),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() => _selectedDistrict = val);
                          _search();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Results Header
          if (_results.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                '$_total results found',
                style: GoogleFonts.poppins(
                  color: Colors.grey.shade600,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),

          // Results List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
                  )
                : _results.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 64,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No results found',
                          style: GoogleFonts.poppins(
                            color: Colors.grey,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: _results.length,
                    itemBuilder: (context, index) {
                      final item = _results[index];
                      return Container(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(12),
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: _formatUrl(item['thumbnailUrl']),
                              width: 72,
                              height: 72,
                              memCacheWidth: 200,
                              fit: BoxFit.cover,
                              errorWidget: (c, u, e) => Container(
                                width: 72,
                                height: 72,
                                color: Colors.grey.shade200,
                                child: const Icon(
                                  Icons.image_not_supported,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                          ),
                          title: Text(
                            item['title'] ?? '',
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                if (item['category'] != null)
                                  Text(
                                    item['category']['name'] ?? '',
                                    style: GoogleFonts.poppins(
                                      fontSize: 11,
                                      color: const Color(0xFFD32F2F),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                if (item['category'] != null)
                                  const SizedBox(width: 8),
                                Text(
                                  _timeAgo(item['publishedAt']),
                                  style: GoogleFonts.poppins(
                                    fontSize: 11,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
