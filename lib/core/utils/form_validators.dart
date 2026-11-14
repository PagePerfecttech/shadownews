class FormValidators {
  static String? validateRequired(String? value, {String fieldName = 'This field'}) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }

  static String? validatePhone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter a mobile number';
    }
    var cleanPhone = value.trim().replaceAll(RegExp(r'\D'), '');
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.substring(cleanPhone.length - 10);
    }
    if (cleanPhone.length != 10) {
      return 'Please enter a valid 10-digit mobile number';
    }
    return null;
  }

  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null; // Optional unless required
    }
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  static String? validateUpiId(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter a valid UPI ID';
    }
    if (!value.contains('@')) {
      return 'UPI ID must contain @ (e.g. mobile@upi)';
    }
    return null;
  }

  static String? validatePositiveAmount(String? value, {double minAmount = 1.0}) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter an amount';
    }
    final amount = double.tryParse(value.trim());
    if (amount == null || amount < minAmount) {
      return 'Minimum withdrawal amount is ₹${minAmount.toStringAsFixed(0)}';
    }
    return null;
  }
}
