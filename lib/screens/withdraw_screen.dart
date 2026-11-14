import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dio/dio.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';

class WithdrawScreen extends StatefulWidget {
  final double balance; // cash in ₹
  final double minWithdrawal;
  final String? savedUpiId;
  final String? savedBankAccountNumber;
  final String? savedBankIfsc;
  final String? savedBankAccountName;
  final String? lastWithdrawalAt;
  final double conversionRate;

  const WithdrawScreen({
    super.key,
    required this.balance,
    this.minWithdrawal = 500.0,
    this.savedUpiId,
    this.savedBankAccountNumber,
    this.savedBankIfsc,
    this.savedBankAccountName,
    this.lastWithdrawalAt,
    this.conversionRate = 0.01,
  });

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();

  // UPI fields
  final _upiController = TextEditingController();

  // Bank fields
  final _accountNumberController = TextEditingController();
  final _confirmAccountController = TextEditingController();
  final _ifscController = TextEditingController();
  final _accountNameController = TextEditingController();

  String _payoutMethod = 'upi'; // 'upi' or 'bank_transfer'
  bool _isLoading = false;
  String? _cooldownWarning;

  @override
  void initState() {
    super.initState();
    // Prefill saved payment details if available
    if (widget.savedUpiId != null && widget.savedUpiId!.isNotEmpty) {
      _upiController.text = widget.savedUpiId!;
    }
    if (widget.savedBankAccountNumber != null && widget.savedBankAccountNumber!.isNotEmpty) {
      _accountNumberController.text = widget.savedBankAccountNumber!;
      _confirmAccountController.text = widget.savedBankAccountNumber!;
      _payoutMethod = 'bank_transfer';
    }
    if (widget.savedBankIfsc != null) {
      _ifscController.text = widget.savedBankIfsc!;
    }
    if (widget.savedBankAccountName != null) {
      _accountNameController.text = widget.savedBankAccountName!;
    }

    // Check 24hr cooldown
    if (widget.lastWithdrawalAt != null && widget.lastWithdrawalAt!.isNotEmpty) {
      try {
        final last = DateTime.parse(widget.lastWithdrawalAt!);
        final diffHours = DateTime.now().difference(last).inHours;
        if (diffHours < 24) {
          final remaining = 24 - diffHours;
          _cooldownWarning = 'Withdrawal cooldown: You can request your next payout in $remaining hour${remaining > 1 ? 's' : ''}.';
        }
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _upiController.dispose();
    _accountNumberController.dispose();
    _confirmAccountController.dispose();
    _ifscController.dispose();
    _accountNameController.dispose();
    super.dispose();
  }

  void _setAmount(double value) {
    final finalVal = value.clamp(0.0, widget.balance);
    _amountController.text = finalVal.toStringAsFixed(0);
    setState(() {});
  }

  Future<void> _submitWithdrawal() async {
    if (!_formKey.currentState!.validate()) return;

    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount < widget.minWithdrawal) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Minimum withdrawal is ₹${widget.minWithdrawal.toStringAsFixed(0)}'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (amount > widget.balance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Requested amount exceeds available balance (₹${widget.balance.toStringAsFixed(2)})'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final payload = <String, dynamic>{
        'amount': amount,
        'payoutMethod': _payoutMethod,
      };

      if (_payoutMethod == 'upi') {
        payload['upiId'] = _upiController.text.trim();
      } else {
        payload['bankAccountNumber'] = _accountNumberController.text.trim();
        payload['bankIfsc'] = _ifscController.text.trim().toUpperCase();
        payload['bankAccountName'] = _accountNameController.text.trim();
      }

      final response = await apiClient.post(
        '/reporter/wallet/withdraw',
        data: payload,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Withdrawal request of ₹${amount.toStringAsFixed(0)} submitted successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          context.pop(true);
        }
      } else {
        throw Exception('Failed to submit withdrawal request.');
      }
    } catch (e) {
      if (mounted) {
        String msg = 'Failed to submit withdrawal.';
        if (e is DioException) {
          msg = e.response?.data?['error'] ?? msg;
        } else {
          msg = e.toString();
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = globalThemeProvider.themeMode == ThemeMode.dark;
    final bgColor = isDark ? const Color(0xFF121212) : const Color(0xFFF7F6F2);
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;
    final subtitleColor = isDark ? Colors.white60 : Colors.black54;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: cardColor,
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: textColor),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Request Payout',
          style: GoogleFonts.poppins(
            color: textColor,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Available Balance Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFD32F2F), Color(0xFF8B0000)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFD32F2F).withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AVAILABLE CASH BALANCE',
                      style: GoogleFonts.poppins(
                        color: Colors.white70,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.1,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '₹${widget.balance.toStringAsFixed(2)}',
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Min withdrawal: ₹${widget.minWithdrawal.toStringAsFixed(0)} • Settlement in 24-48 hrs',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              if (_cooldownWarning != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber.withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.timer_outlined, color: Colors.amber, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _cooldownWarning!,
                          style: GoogleFonts.poppins(
                            color: isDark ? Colors.amber[200] : Colors.amber[900],
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Amount Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cardColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Enter Withdrawal Amount (₹)',
                      style: GoogleFonts.poppins(
                        color: textColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      style: GoogleFonts.poppins(
                        color: textColor,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                      decoration: InputDecoration(
                        prefixIcon: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 14),
                          child: Text(
                            '₹',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFFD32F2F)),
                          ),
                        ),
                        prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                        hintText: '500',
                        hintStyle: TextStyle(color: subtitleColor.withValues(alpha: 0.5)),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF9F9F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter amount';
                        }
                        final amount = double.tryParse(value);
                        if (amount == null || amount <= 0) {
                          return 'Please enter a valid amount';
                        }
                        if (amount < widget.minWithdrawal) {
                          return 'Minimum amount is ₹${widget.minWithdrawal.toStringAsFixed(0)}';
                        }
                        if (amount > widget.balance) {
                          return 'Exceeds available balance';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    // Quick Chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildChip('₹500', () => _setAmount(500)),
                          const SizedBox(width: 8),
                          _buildChip('₹1,000', () => _setAmount(1000)),
                          const SizedBox(width: 8),
                          _buildChip('₹2,000', () => _setAmount(2000)),
                          const SizedBox(width: 8),
                          _buildChip('Full Balance', () => _setAmount(widget.balance), isPrimary: true),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Payout Method Selector
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cardColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Select Payout Method',
                      style: GoogleFonts.poppins(
                        color: textColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildMethodTab(
                            title: 'UPI Transfer',
                            icon: Icons.qr_code,
                            isSelected: _payoutMethod == 'upi',
                            onTap: () => setState(() => _payoutMethod = 'upi'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildMethodTab(
                            title: 'Bank Transfer',
                            icon: Icons.account_balance,
                            isSelected: _payoutMethod == 'bank_transfer',
                            onTap: () => setState(() => _payoutMethod = 'bank_transfer'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // UPI Input Form
                    if (_payoutMethod == 'upi') ...[
                      Text(
                        'Virtual Payment Address (VPA / UPI ID)',
                        style: GoogleFonts.poppins(color: subtitleColor, fontSize: 12),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _upiController,
                        style: GoogleFonts.poppins(color: textColor, fontSize: 14),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.alternate_email, color: Color(0xFFD32F2F), size: 20),
                          hintText: 'e.g. mobile@upi or name@okaxis',
                          hintStyle: TextStyle(color: subtitleColor.withValues(alpha: 0.5)),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF9F9F9),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        validator: (value) {
                          if (_payoutMethod != 'upi') return null;
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter UPI ID';
                          }
                          if (!RegExp(r'^[\w.-]+@[\w.-]+$').hasMatch(value.trim())) {
                            return 'Enter a valid UPI address (e.g. 9876543210@paytm)';
                          }
                          return null;
                        },
                      ),
                    ] else ...[
                      // Bank Account Input Form
                      Text(
                        'Account Holder Name (as per passbook)',
                        style: GoogleFonts.poppins(color: subtitleColor, fontSize: 12),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _accountNameController,
                        style: GoogleFonts.poppins(color: textColor, fontSize: 14),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.person_outline, color: Color(0xFFD32F2F), size: 20),
                          hintText: 'Full Name',
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF9F9F9),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                        validator: (v) => (_payoutMethod == 'bank_transfer' && (v == null || v.trim().length < 3))
                            ? 'Please enter account holder name'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Bank Account Number',
                        style: GoogleFonts.poppins(color: subtitleColor, fontSize: 12),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _accountNumberController,
                        keyboardType: TextInputType.number,
                        style: GoogleFonts.poppins(color: textColor, fontSize: 14),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.credit_card, color: Color(0xFFD32F2F), size: 20),
                          hintText: 'e.g. 123456789012',
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF9F9F9),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                        validator: (v) => (_payoutMethod == 'bank_transfer' && (v == null || v.trim().length < 8))
                            ? 'Enter valid account number (min 8 digits)'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Confirm Bank Account Number',
                        style: GoogleFonts.poppins(color: subtitleColor, fontSize: 12),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _confirmAccountController,
                        keyboardType: TextInputType.number,
                        style: GoogleFonts.poppins(color: textColor, fontSize: 14),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFFD32F2F), size: 20),
                          hintText: 'Re-enter account number',
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF9F9F9),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                        validator: (v) {
                          if (_payoutMethod != 'bank_transfer') return null;
                          if (v != _accountNumberController.text) {
                            return 'Account numbers do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Bank IFSC Code',
                        style: GoogleFonts.poppins(color: subtitleColor, fontSize: 12),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _ifscController,
                        textCapitalization: TextCapitalization.characters,
                        style: GoogleFonts.poppins(color: textColor, fontSize: 14),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.account_balance, color: Color(0xFFD32F2F), size: 20),
                          hintText: 'e.g. SBIN0001234',
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF9F9F9),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                        validator: (v) => (_payoutMethod == 'bank_transfer' && (v == null || v.trim().length != 11))
                            ? 'Enter valid 11-digit IFSC code'
                            : null,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Submit Button
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitWithdrawal,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 3,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          'Submit Withdrawal Request',
                          style: GoogleFonts.poppins(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChip(String label, VoidCallback onTap, {bool isPrimary = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isPrimary ? const Color(0xFFD32F2F) : Colors.black.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            color: isPrimary ? Colors.white : Colors.black87,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildMethodTab({
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFD32F2F).withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFFD32F2F) : Colors.black12,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? const Color(0xFFD32F2F) : Colors.grey,
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: GoogleFonts.poppins(
                color: isSelected ? const Color(0xFFD32F2F) : Colors.grey[700],
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
