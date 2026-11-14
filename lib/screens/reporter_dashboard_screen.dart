import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../api/api_client.dart';
import '../config.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'reporter_submit_screen.dart';

class ReporterDashboardScreen extends StatefulWidget {
  const ReporterDashboardScreen({super.key});

  @override
  State<ReporterDashboardScreen> createState() => _ReporterDashboardScreenState();
}

class _ReporterDashboardScreenState extends State<ReporterDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, int> _counts = {'total': 0, 'pending': 0, 'published': 0, 'rejected': 0};
  Map<String, List<dynamic>> _news = {'pending': [], 'published': [], 'rejected': []};
  bool _isLoading = true;
  bool _isReporter = false;
  bool _isCheckingRole = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _checkReporterRole();
  }

  Future<void> _checkReporterRole() async {
    await apiClient.syncUser();
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _isReporter = prefs.getBool('is_reporter') ?? false;
        _isCheckingRole = false;
      });
      if (_isReporter) {
        _fetchDashboardData();
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchDashboardData() async {
    try {
      final response = await apiClient.get('/reporter/news');
      setState(() {
        _counts = Map<String, int>.from(response.data['counts']);
        _news = Map<String, List<dynamic>>.from(response.data['news']);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error fetching reporter dashboard: $e');
    }
  }

  String _formatUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('/')) {
      return '${AppConfig.baseUrl}$url';
    }
    return url.replaceAll(RegExp(r'placehold\.co/(\d+x\d+)/'), r'placehold.co/$1/png/');
  }

  Widget _buildNewsList(List<dynamic> items) {
    if (items.isEmpty) {
      return Center(
        child: Text('ఈ విభాగంలో వార్తలు లేవు.', style: GoogleFonts.notoSansTelugu(color: Colors.grey)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final isRejected = item['status'] == 'rejected';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ListTile(
                contentPadding: const EdgeInsets.all(12),
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(
                    imageUrl: _formatUrl(item['thumbnailUrl']),
                    width: 60,
                    height: 60,
                    fit: BoxFit.cover,
                    errorWidget: (c, u, e) => Container(
                      width: 60,
                      height: 60,
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.image_not_supported, color: Colors.grey),
                    ),
                  ),
                ),
                title: Text(
                  item['title'] ?? '',
                  style: GoogleFonts.notoSansTelugu(fontWeight: FontWeight.w600, fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: item['status'] == 'published'
                    ? const Tooltip(
                        message: 'ప్రచురించబడిన వార్తలను సవరించలేరు (Published - Locked)',
                        child: Padding(
                          padding: EdgeInsets.all(8.0),
                          child: Icon(Icons.lock_outline, color: Colors.grey, size: 20),
                        ),
                      )
                    : IconButton(
                        icon: const Icon(Icons.edit, color: Color(0xFFD32F2F)),
                        tooltip: 'Edit News',
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ReporterSubmitScreen(editNews: Map<String, dynamic>.from(item)),
                            ),
                          ).then((_) => _fetchDashboardData());
                        },
                      ),
              ),
              if (isRejected && item['rejectReason'] != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(12),
                      bottomRight: Radius.circular(12),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: Color(0xFFD32F2F), size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Reason: ${item['rejectReason']}',
                          style: GoogleFonts.poppins(color: const Color(0xFFD32F2F), fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isCheckingRole) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F))),
      );
    }

    if (!_isReporter) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('వార్తను పోస్ట్ చేయండి'),
          backgroundColor: const Color(0xFFD32F2F),
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.security, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'రిపోర్టర్ అనుమతి అవసరం',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'వార్తలను పోస్ట్ చేయడానికి మీరు ఆమోదించబడిన రిపోర్టర్ అయి ఉండాలి.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () {
                    context.push('/reporter/apply');
                  },
                  child: const Text('రిపోర్టర్‌గా దరఖాస్తు చేసుకోండి'),
                )
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          'Reporter Dashboard',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: const Color(0xFF1A1A1A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1A1A1A)),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_outlined, color: Color(0xFFD32F2F)),
            onPressed: () => context.push('/reporter/wallet'),
            tooltip: 'My Wallet & Earnings',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFD32F2F),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFFD32F2F),
          tabs: const [
            Tab(text: 'Pending'),
            Tab(text: 'Approved'),
            Tab(text: 'Rejected'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)))
          : Column(
              children: [
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildCountStat('Total', _counts['total'] ?? 0, Colors.blue),
                      _buildCountStat('Pending', _counts['pending'] ?? 0, Colors.orange),
                      _buildCountStat('Approved', _counts['published'] ?? 0, Colors.green),
                      _buildCountStat('Rejected', _counts['rejected'] ?? 0, Colors.red),
                    ],
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildNewsList(_news['pending'] ?? []),
                      _buildNewsList(_news['published'] ?? []),
                      _buildNewsList(_news['rejected'] ?? []),
                    ],
                  ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/reporter/submit').then((_) => _fetchDashboardData()),
        backgroundColor: const Color(0xFFD32F2F),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildCountStat(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          count.toString(),
          style: GoogleFonts.poppins(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            color: Colors.grey.shade700,
          ),
        ),
      ],
    );
  }
}
