import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  bool _isLoading = true;
  String? _error;
  double _balance = 0;
  double _earningsBalance = 0;
  double _totalEarnings = 0;
  double _conversionRate = 0.01;
  List<dynamic> _transactions = [];
  List<dynamic> _withdrawals = [];

  Map<String, dynamic>? _levelConfig;
  Map<String, dynamic>? _levelProgress;
  Map<String, dynamic>? _submissionLimits;
  Map<String, dynamic>? _metrics;
  Map<String, dynamic>? _savedPaymentDetails;
  String _historyFilter = 'all'; // 'all', 'rewards', 'withdrawals'

  @override
  void initState() {
    super.initState();
    _fetchWalletData();
  }

  Future<void> _fetchWalletData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await apiClient.get('/reporter/wallet');
      if (response.statusCode == 200) {
        setState(() {
          _balance = (response.data['balance'] ?? 0).toDouble();
          _earningsBalance = (response.data['earningsBalance'] ?? 0).toDouble();
          _totalEarnings = (response.data['totalEarnings'] ?? 0).toDouble();
          _conversionRate = (response.data['conversionRate'] ?? 0.01).toDouble();
          _transactions = response.data['transactions'] ?? [];
          _withdrawals = response.data['withdrawals'] ?? [];

          _levelConfig = response.data['levelConfig'];
          _levelProgress = response.data['levelProgress'];
          _submissionLimits = response.data['submissionLimits'];
          _metrics = response.data['metrics'];
          _savedPaymentDetails = response.data['savedPaymentDetails'];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load wallet data.';
          _isLoading = false;
        });
      }
    } catch (e) {
      String errorMessage = 'An error occurred while loading wallet data.';
      if (e is DioException) {
        if (e.response?.statusCode == 404) {
          errorMessage = 'You are not an approved reporter.\nWallet is only available to registered reporters.';
        } else if (e.response?.data != null && e.response?.data['error'] != null) {
          errorMessage = e.response?.data['error'];
        }
      }
      setState(() {
        _error = errorMessage;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = globalThemeProvider.themeMode == ThemeMode.dark;
    final bgColor = isDark ? const Color(0xFF121212) : const Color(0xFFF2F1ED);
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: cardColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: textColor),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Wallet & Earnings',
          style: GoogleFonts.poppins(
            color: textColor,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: textColor),
            onPressed: _fetchWalletData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.red, fontSize: 14),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _fetchWalletData,
                        child: const Text('Retry'),
                      )
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchWalletData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildBalanceCard(),
                      const SizedBox(height: 16),
                      _buildRankAndLimitsCard(),
                      if (_levelProgress != null && _levelProgress!['nextLevel'] != null) ...[
                        const SizedBox(height: 16),
                        _buildProgressCard(),
                      ],
                      const SizedBox(height: 24),
                      Text(
                        'Ledger Transactions & Withdrawals',
                        style: GoogleFonts.poppins(
                          color: textColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildHistoryFilterChip('All Activity', 'all'),
                            const SizedBox(width: 8),
                            _buildHistoryFilterChip('Earnings Only', 'rewards'),
                            const SizedBox(width: 8),
                            _buildHistoryFilterChip('Withdrawals Only', 'withdrawals'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      ..._buildCombinedHistory(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildBalanceCard() {
    final displayInr = _earningsBalance > 0 ? _earningsBalance : (_balance * _conversionRate);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFB71C1C), Color(0xFFD32F2F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFB71C1C).withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Available Cash Balance',
                style: GoogleFonts.poppins(
                  color: Colors.white70,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_balance.toInt()} coins',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                displayInr.toStringAsFixed(1),
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              if (_totalEarnings > 0)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Lifetime Earned',
                      style: GoogleFonts.poppins(color: Colors.white60, fontSize: 10),
                    ),
                    Text(
                      '₹${_totalEarnings.toStringAsFixed(1)}',
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                final result = await context.push('/reporter/wallet/withdraw', extra: {
                  'balance': _earningsBalance > 0 ? _earningsBalance : (_balance * _conversionRate),
                  'earningsBalance': _earningsBalance,
                  'minWithdrawalInr': _levelConfig?['minWithdrawalInr'] ?? 500.0,
                  'savedUpiId': _savedPaymentDetails?['upiId'],
                  'savedBankAccountNumber': _savedPaymentDetails?['bankAccountNumber'],
                  'savedBankIfsc': _savedPaymentDetails?['bankIfsc'],
                  'savedBankAccountName': _savedPaymentDetails?['bankAccountName'],
                  'lastWithdrawalAt': _savedPaymentDetails?['lastWithdrawalAt'],
                });
                if (result == true) {
                  _fetchWalletData();
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFFB71C1C),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: Text(
                'Request Withdrawal',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankAndLimitsCard() {
    final isDark = globalThemeProvider.themeMode == ThemeMode.dark;
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;
    final subtitleColor = isDark ? Colors.grey[400] : Colors.grey[600];

    final displayName = _levelConfig?['displayName'] ?? 'Reporter';
    final ratePerNews = _levelConfig?['payPerApprovedArticle'] ?? 3.0;
    final remaining = _submissionLimits?['remainingToday'] ?? 5;
    final dailyLimit = _submissionLimits?['dailyLimit'] ?? 5;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFD32F2F).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.workspace_premium, color: Color(0xFFD32F2F), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: GoogleFonts.poppins(
                        color: textColor,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Rate: ₹$ratePerNews per approved article',
                      style: GoogleFonts.poppins(color: Colors.green, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: remaining > 0 ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$remaining/$dailyLimit Left Today',
                  style: GoogleFonts.poppins(
                    color: remaining > 0 ? Colors.green[700] : Colors.red,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (_metrics != null) ...[
            const SizedBox(height: 12),
            Divider(height: 1, color: Colors.grey.withValues(alpha: 0.2)),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Score: ${_metrics!['performanceScore'] ?? 0}', style: GoogleFonts.poppins(color: subtitleColor, fontSize: 11)),
                Text('Streak: ${_metrics!['currentStreak'] ?? 0} days 🔥', style: GoogleFonts.poppins(color: subtitleColor, fontSize: 11)),
                Text('Approved: ${_metrics!['approvedCount'] ?? 0}', style: GoogleFonts.poppins(color: subtitleColor, fontSize: 11)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildProgressCard() {
    final isDark = globalThemeProvider.themeMode == ThemeMode.dark;
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;
    final subtitleColor = isDark ? Colors.grey[400] : Colors.grey[600];

    final nextLevel = _levelProgress!['nextLevel'];
    final nextName = nextLevel?['displayName'] ?? 'Senior';
    final overall = (_levelProgress!['overallProgress'] ?? 0).toInt();

    final approvedProg = (_levelProgress!['approvedProgress'] ?? 0).toInt();
    final rateProg = (_levelProgress!['rateProgress'] ?? 0).toInt();
    final viewsProg = (_levelProgress!['viewsProgress'] ?? 0).toInt();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.trending_up, color: Colors.amber, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Promotion Path: $nextName',
                    style: GoogleFonts.poppins(
                      color: textColor,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Text(
                '$overall%',
                style: GoogleFonts.poppins(
                  color: Colors.amber[800],
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: overall / 100.0,
              backgroundColor: Colors.grey.withValues(alpha: 0.2),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.amber),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Articles: $approvedProg%', style: GoogleFonts.poppins(color: subtitleColor, fontSize: 11)),
              Text('Approval Rate: $rateProg%', style: GoogleFonts.poppins(color: subtitleColor, fontSize: 11)),
              Text('Views: $viewsProg%', style: GoogleFonts.poppins(color: subtitleColor, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryFilterChip(String label, String key) {
    final isSelected = _historyFilter == key;
    return GestureDetector(
      onTap: () {
        setState(() {
          _historyFilter = key;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFD32F2F) : Colors.black.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFFD32F2F) : Colors.black12,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            color: isSelected ? Colors.white : Colors.black87,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCombinedHistory() {
    final isDark = globalThemeProvider.themeMode == ThemeMode.dark;
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;
    final subtitleColor = isDark ? Colors.grey[400] : Colors.grey[600];

    List<dynamic> combined = [];

    if (_historyFilter != 'withdrawals') {
      for (var t in _transactions) {
        if (_historyFilter == 'rewards' && t['type'] != 'CREDIT') continue;
        combined.add({...t, 'isTransaction': true});
      }
    }

    if (_historyFilter != 'rewards') {
      for (var w in _withdrawals) {
        combined.add({...w, 'isTransaction': false});
      }
    }

    combined.sort((a, b) {
      final aDate = DateTime.parse(a['createdAt']);
      final bDate = DateTime.parse(b['createdAt']);
      return bDate.compareTo(aDate);
    });

    if (combined.isEmpty) {
      return [
        Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Text(
              _historyFilter == 'all'
                  ? 'No activity yet'
                  : 'No $_historyFilter recorded yet',
              style: GoogleFonts.poppins(color: subtitleColor),
            ),
          ),
        )
      ];
    }

    return combined.map((item) {
      final isTx = item['isTransaction'] == true;
      final date = DateTime.parse(item['createdAt']).toLocal();
      final dateStr = DateFormat('MMM d, yyyy • h:mm a').format(date);

      if (isTx) {
        final isCredit = item['type'] == 'CREDIT';
        final cashVal = (item['moneyAmount'] != null && item['moneyAmount'] > 0)
            ? (item['moneyAmount'] as num).toDouble()
            : ((item['amount'] as num).toDouble() * _conversionRate);
        final txCat = item['txCategory'] ?? 'reward';
        final balanceAfter = item['balanceAfter'];

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isCredit ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCredit ? Icons.add_circle_outline : Icons.remove_circle_outline,
                  color: isCredit ? Colors.green : Colors.red,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['description'] ?? (isCredit ? 'Cash Earned' : 'Cash Deducted'),
                      style: GoogleFonts.poppins(
                        color: textColor,
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: isCredit ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            txCat.toString().toUpperCase(),
                            style: GoogleFonts.poppins(
                              color: isCredit ? Colors.green : Colors.red,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          dateStr,
                          style: GoogleFonts.poppins(
                            color: subtitleColor,
                            fontSize: 11,
                          ),
                        ),
                        if (balanceAfter != null && balanceAfter > 0) ...[
                          const SizedBox(width: 8),
                          Text(
                            '• Balance: ₹$balanceAfter',
                            style: GoogleFonts.poppins(
                              color: subtitleColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Text(
                '${isCredit ? '+' : '-'}₹${cashVal.toStringAsFixed(1)}',
                style: GoogleFonts.poppins(
                  color: isCredit ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        );
      } else {
        // Withdrawal request
        final status = item['status'] ?? 'pending';
        Color statusColor;
        String statusLabel;
        switch (status) {
          case 'completed':
            statusColor = Colors.green;
            statusLabel = 'PAID';
            break;
          case 'rejected':
            statusColor = Colors.red;
            statusLabel = 'REJECTED';
            break;
          case 'processing':
            statusColor = Colors.orange;
            statusLabel = 'PROCESSING';
            break;
          case 'approved':
            statusColor = Colors.blue;
            statusLabel = 'APPROVED';
            break;
          default:
            statusColor = Colors.amber;
            statusLabel = 'PENDING';
        }

        final payoutMethod = item['payoutMethod'] ?? 'upi';
        final isBank = payoutMethod == 'bank_transfer';
        final utr = item['transactionReference']?.toString();
        final rejectionReason = item['rejectionReason']?.toString();
        final rawAccount = item['bankAccountNumber']?.toString() ?? '';
        final methodDetails = isBank
            ? 'Bank A/C ••${rawAccount.length > 4 ? rawAccount.substring(rawAccount.length - 4) : rawAccount}'
            : 'UPI: ${item['upiId'] ?? '-'}';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: statusColor.withValues(alpha: 0.35)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isBank ? Icons.account_balance : Icons.qr_code,
                      color: statusColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Payout Request',
                              style: GoogleFonts.poppins(
                                color: textColor,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                statusLabel,
                                style: GoogleFonts.poppins(
                                  color: statusColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$methodDetails • $dateStr',
                          style: GoogleFonts.poppins(
                            color: subtitleColor,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '₹${item['moneyAmount']}',
                    style: GoogleFonts.poppins(
                      color: textColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),

              // UTR reference row when completed
              if (utr != null && utr.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_outline, color: Colors.green, size: 14),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'UTR: $utr',
                          style: GoogleFonts.poppins(
                            color: Colors.green[800],
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Rejection reason row when declined
              if (rejectionReason != null && rejectionReason.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 14),
                          const SizedBox(width: 6),
                          Text(
                            'Declined: $rejectionReason',
                            style: GoogleFonts.poppins(
                              color: Colors.red[800],
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '₹${item['moneyAmount']} was automatically refunded back to your wallet.',
                        style: GoogleFonts.poppins(
                          color: Colors.red[700],
                          fontSize: 10,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      }
    }).toList();
  }
}
