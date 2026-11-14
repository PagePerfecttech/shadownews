class UserProfile {
  final String uid;
  final String? phoneNumber;
  final String? displayName;
  final String? email;
  final String? photoUrl;
  final String role; // 'user', 'reporter', 'admin'
  final String? stateId;
  final String? districtId;
  final String? mandalId;
  final String? assemblyId;
  final List<String> selectedTopics;
  final bool isReporterApproved;

  UserProfile({
    required this.uid,
    this.phoneNumber,
    this.displayName,
    this.email,
    this.photoUrl,
    this.role = 'user',
    this.stateId,
    this.districtId,
    this.mandalId,
    this.assemblyId,
    this.selectedTopics = const [],
    this.isReporterApproved = false,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      uid: json['uid']?.toString() ?? json['id']?.toString() ?? '',
      phoneNumber: json['phoneNumber']?.toString() ?? json['phone']?.toString(),
      displayName: json['displayName']?.toString() ?? json['name']?.toString(),
      email: json['email']?.toString(),
      photoUrl: json['photoUrl']?.toString() ?? json['avatar']?.toString(),
      role: json['role']?.toString() ?? 'user',
      stateId: json['stateId']?.toString(),
      districtId: json['districtId']?.toString(),
      mandalId: json['mandalId']?.toString(),
      assemblyId: json['assemblyId']?.toString(),
      selectedTopics: (json['selectedTopics'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      isReporterApproved: json['isReporterApproved'] == true || json['role'] == 'reporter',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uid': uid,
      'phoneNumber': phoneNumber,
      'displayName': displayName,
      'email': email,
      'photoUrl': photoUrl,
      'role': role,
      'stateId': stateId,
      'districtId': districtId,
      'mandalId': mandalId,
      'assemblyId': assemblyId,
      'selectedTopics': selectedTopics,
      'isReporterApproved': isReporterApproved,
    };
  }
}
