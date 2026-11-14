import 'package:flutter/material.dart';
import '../../services/firestore_service.dart';
import '../../services/phone_auth_service.dart';
import '../../widgets/news_card.dart';
import '../../main.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  final PhoneAuthService _authService = PhoneAuthService();
  List<Map<String, dynamic>> _newsList = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeOneSignal();
    _loadNews();
  }

  /// Initialize OneSignal with the current user
  Future<void> _initializeOneSignal() async {
    final currentUser = _authService.currentUser;
    if (currentUser != null) {
      try {
        // Login the user with OneSignal using their Firebase UID
        await oneSignalService.login(currentUser.uid);

        // Optionally set user phone number if available
        if (currentUser.phoneNumber != null) {
          await oneSignalService.setUserPhone(currentUser.phoneNumber!);
        }

        // Subscribe to all news for notifications
        await oneSignalService.subscribeToCategory('all', 'All News');

        debugPrint('OneSignal initialized for user: ${currentUser.uid}');
      } catch (e) {
        debugPrint('Error initializing OneSignal: $e');
      }
    }
  }

  Future<void> _loadNews() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final newsList = await _firestoreService.getAllNews();
      setState(() {
        _newsList = newsList;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading news: $e');
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading news: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _signOut() async {
    try {
      // Logout from OneSignal first
      await oneSignalService.logout();
      
      // Then logout from Firebase
      await _authService.signOut();
      
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil(
          '/auth/phone',
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error signing out: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shadow News'),
        elevation: 0,
        backgroundColor: Colors.blueAccent,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              Navigator.of(context).pushNamed('/profile');
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _signOut,
          ),
        ],
      ),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _loadNews,
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : _newsList.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.newspaper,
                              size: 64,
                              color: Colors.grey,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No news articles available',
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: Colors.grey,
                                  ),
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton(
                              onPressed: _loadNews,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _newsList.length,
                        itemBuilder: (context, index) {
                          final news = _newsList[index];
                          return NewsCard(
                            news: news,
                            onTap: () {
                              Navigator.of(context).pushNamed(
                                '/news/detail',
                                arguments: news['id'],
                              );
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
