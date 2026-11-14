class VideoShort {
  final String id;
  final String title;
  final String videoUrl;
  final String? thumbnailUrl;
  final String? reporterName;
  final String? reporterAvatar;
  final String? category;
  final int likes;
  final int shares;
  final int commentsCount;
  final bool isLiked;

  VideoShort({
    required this.id,
    required this.title,
    required this.videoUrl,
    this.thumbnailUrl,
    this.reporterName,
    this.reporterAvatar,
    this.category,
    this.likes = 0,
    this.shares = 0,
    this.commentsCount = 0,
    this.isLiked = false,
  });

  factory VideoShort.fromJson(Map<String, dynamic> json) {
    return VideoShort(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      videoUrl: json['videoUrl']?.toString() ?? json['url']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString() ?? json['thumbnail']?.toString(),
      reporterName: json['reporterName']?.toString() ?? json['author']?.toString(),
      reporterAvatar: json['reporterAvatar']?.toString() ?? json['avatar']?.toString(),
      category: json['category']?.toString(),
      likes: int.tryParse(json['likes']?.toString() ?? '0') ?? 0,
      shares: int.tryParse(json['shares']?.toString() ?? '0') ?? 0,
      commentsCount: int.tryParse(json['commentsCount']?.toString() ?? '0') ?? 0,
      isLiked: json['isLiked'] == true || json['liked'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'videoUrl': videoUrl,
      'thumbnailUrl': thumbnailUrl,
      'reporterName': reporterName,
      'reporterAvatar': reporterAvatar,
      'category': category,
      'likes': likes,
      'shares': shares,
      'commentsCount': commentsCount,
      'isLiked': isLiked,
    };
  }
}
