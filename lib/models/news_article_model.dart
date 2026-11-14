class NewsArticle {
  final String id;
  final String title;
  final String content;
  final String? imageUrl;
  final String? videoUrl;
  final String? category;
  final String? district;
  final String? mandal;
  final String? state;
  final String? publishedAt;
  final String? sourceUrl;
  final String? reporterName;
  final String? reporterImage;
  final String? locationName;
  final int views;
  final int likes;
  final int shares;
  final bool isBookmarked;
  final bool isLiked;

  NewsArticle({
    required this.id,
    required this.title,
    required this.content,
    this.imageUrl,
    this.videoUrl,
    this.category,
    this.district,
    this.mandal,
    this.state,
    this.publishedAt,
    this.sourceUrl,
    this.reporterName,
    this.reporterImage,
    this.locationName,
    this.views = 0,
    this.likes = 0,
    this.shares = 0,
    this.isBookmarked = false,
    this.isLiked = false,
  });

  factory NewsArticle.fromJson(Map<String, dynamic> json) {
    return NewsArticle(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? json['description']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? json['image']?.toString() ?? json['thumbnail_url']?.toString(),
      videoUrl: json['videoUrl']?.toString() ?? json['video_url']?.toString() ?? json['video']?.toString(),
      category: json['category']?.toString(),
      district: json['district']?.toString(),
      mandal: json['mandal']?.toString(),
      state: json['state']?.toString(),
      publishedAt: json['publishedAt']?.toString() ?? json['createdAt']?.toString() ?? json['created_at']?.toString(),
      sourceUrl: json['sourceUrl']?.toString() ?? json['link']?.toString() ?? json['source_url']?.toString(),
      reporterName: json['reporterName']?.toString() ?? json['reporter_name']?.toString() ?? json['reporter']?['name']?.toString(),
      reporterImage: json['reporterImage']?.toString() ?? json['reporter_image']?.toString() ?? json['reporter']?['avatar']?.toString(),
      locationName: json['locationName']?.toString() ?? json['location_name']?.toString() ?? json['location']?.toString(),
      views: int.tryParse(json['views']?.toString() ?? '0') ?? 0,
      likes: int.tryParse(json['likes']?.toString() ?? '0') ?? 0,
      shares: int.tryParse(json['shares']?.toString() ?? '0') ?? 0,
      isBookmarked: json['isBookmarked'] == true || json['bookmarked'] == true,
      isLiked: json['isLiked'] == true || json['liked'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'imageUrl': imageUrl,
      'videoUrl': videoUrl,
      'category': category,
      'district': district,
      'mandal': mandal,
      'state': state,
      'publishedAt': publishedAt,
      'sourceUrl': sourceUrl,
      'reporterName': reporterName,
      'reporterImage': reporterImage,
      'locationName': locationName,
      'views': views,
      'likes': likes,
      'shares': shares,
      'isBookmarked': isBookmarked,
      'isLiked': isLiked,
    };
  }

  NewsArticle copyWith({
    String? id,
    String? title,
    String? content,
    String? imageUrl,
    String? videoUrl,
    String? category,
    String? district,
    String? mandal,
    String? state,
    String? publishedAt,
    String? sourceUrl,
    String? reporterName,
    String? reporterImage,
    String? locationName,
    int? views,
    int? likes,
    int? shares,
    bool? isBookmarked,
    bool? isLiked,
  }) {
    return NewsArticle(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      imageUrl: imageUrl ?? this.imageUrl,
      videoUrl: videoUrl ?? this.videoUrl,
      category: category ?? this.category,
      district: district ?? this.district,
      mandal: mandal ?? this.mandal,
      state: state ?? this.state,
      publishedAt: publishedAt ?? this.publishedAt,
      sourceUrl: sourceUrl ?? this.sourceUrl,
      reporterName: reporterName ?? this.reporterName,
      reporterImage: reporterImage ?? this.reporterImage,
      locationName: locationName ?? this.locationName,
      views: views ?? this.views,
      likes: likes ?? this.likes,
      shares: shares ?? this.shares,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      isLiked: isLiked ?? this.isLiked,
    );
  }
}
