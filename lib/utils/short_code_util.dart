/// Utility to resolve and guarantee strictly 5-character alphanumeric short codes
/// matching the Shadow News backend and database.
library;

const String _base62Alphabet =
    '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

/// Derives a deterministic 5-character short code from any ID string.
/// Produces the exact same 5-char code as the Next.js backend.
String getDeterministicShortCode(String? id) {
  if (id == null || id.trim().isEmpty) return 'aB3x9';
  final trimmed = id.trim();
  if (trimmed.length == 5) return trimmed;

  int hash1 = 5381;
  int hash2 = 52711;
  for (int i = 0; i < trimmed.length; i++) {
    final code = trimmed.codeUnitAt(i);
    hash1 = (((hash1 << 5) + hash1) ^ code) & 0x7FFFFFFF;
    hash2 = (((hash2 << 5) + hash2) + (code * 33)) & 0x7FFFFFFF;
  }

  final buffer = StringBuffer();
  int current = (hash1 ^ hash2) & 0x7FFFFFFF;
  for (int i = 0; i < 5; i++) {
    buffer.write(_base62Alphabet[current % _base62Alphabet.length]);
    current =
        ((current ~/ _base62Alphabet.length) ^
                (trimmed.codeUnitAt(i % trimmed.length) * 1013))
            .abs() &
        0x7FFFFFFF;
  }
  return buffer.toString();
}

/// Resolves a guaranteed 5-character short code from a news map.
String resolveNewsShortCode(Map<dynamic, dynamic>? news) {
  if (news == null) return 'aB3x9';

  final existingShort =
      (news['short_code'] ?? news['shortCode'])?.toString().trim() ?? '';
  if (existingShort.length == 5) {
    return existingShort;
  }

  final rawId = news['id']?.toString().trim() ?? '';
  if (rawId.length == 5) {
    return rawId;
  }

  // Use deterministic 5-char code matching database
  return getDeterministicShortCode(rawId.isNotEmpty ? rawId : existingShort);
}
