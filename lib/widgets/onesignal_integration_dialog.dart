import 'package:flutter/material.dart';
import '../services/onesignal_service.dart';

/// OneSignal Integration Dialog placeholder (Disabled in production).
/// Direct native OS notification permissions are requested without popups.
class OneSignalIntegrationDialog extends StatelessWidget {
  final OneSignalService? oneSignalService;

  const OneSignalIntegrationDialog({
    super.key,
    this.oneSignalService,
  });

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}
