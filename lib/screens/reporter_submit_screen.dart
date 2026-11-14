import 'dart:convert';
import 'package:dio/dio.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:path_provider/path_provider.dart';
import 'package:fc_native_video_thumbnail/fc_native_video_thumbnail.dart';
import 'shared_media_gallery_screen.dart';

class ReporterSubmitScreen extends StatefulWidget {
  final Map<String, dynamic>? editNews;

  const ReporterSubmitScreen({super.key, this.editNews});

  @override
  State<ReporterSubmitScreen> createState() => _ReporterSubmitScreenState();
}

class _ReporterSubmitScreenState extends State<ReporterSubmitScreen> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _youtubeController = TextEditingController();
  final _customLinkController = TextEditingController();

  bool _isSubmitting = false;
  String _submittingStatus = 'సమర్పిస్తోంది...';

  final List<File> _selectedImages = [];
  File? _selectedVideo;
  File? _generatedVideoThumbnail;
  bool _isGeneratingThumbnail = false;
  String? _selectedGalleryUrl;
  String? _existingThumbnailUrl;
  List<String> _existingImagesUrls = [];

  String _selectedCategoryId = '';
  List<Map<String, dynamic>> _categories = [];
  bool _isLoadingCategories = true;

  // Location Hierarchy & Scope
  List<dynamic> _states = [];
  List<dynamic> _districts = [];
  List<dynamic> _mandals = [];

  String? _selectedStateId;
  String? _selectedDistrictId;
  String? _selectedMandalId;

  String _postingScope = 'mandal'; // 'mandal' | 'district' | 'state'
  String? _homeStateId;
  String? _homeDistrictId;
  String? _homeMandalId;
  String? _reporterLevel;
  List<String> _allowedDistrictIds = [];
  List<String> _allowedMandalIds = [];

  @override
  void initState() {
    super.initState();
    _fetchCategoriesAndLocations();

    if (widget.editNews != null) {
      final news = widget.editNews!;
      _titleController.text = news['title']?.toString() ?? '';
      _descController.text = news['shortDesc']?.toString() ?? news['short_desc']?.toString() ?? '';
      _selectedCategoryId = news['categoryId']?.toString() ?? news['category_id']?.toString() ?? '';
      _selectedStateId = news['stateId']?.toString() ?? news['state_id']?.toString();
      _selectedDistrictId = news['districtId']?.toString() ?? news['district_id']?.toString();
      _selectedMandalId = news['mandalId']?.toString() ?? news['mandal_id']?.toString();
      _existingThumbnailUrl = news['thumbnailUrl']?.toString() ?? news['thumbnail_url']?.toString();
      _customLinkController.text = news['sourceUrl']?.toString() ?? news['source_url']?.toString() ?? '';
      final rawImgs = news['imagesUrls'] ?? news['images_urls'];
      if (rawImgs is List) {
        _existingImagesUrls = rawImgs.map((e) => e.toString()).toList();
      } else if (rawImgs is String && rawImgs.isNotEmpty) {
        try {
          final decoded = jsonDecode(rawImgs);
          if (decoded is List) {
            _existingImagesUrls = decoded.map((e) => e.toString()).toList();
          }
        } catch (_) {}
      }
    }
  }

  Future<void> _fetchCategoriesAndLocations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _postingScope = prefs.getString('reporter_posting_scope') ?? 'mandal';
      _homeStateId = prefs.getString('reporter_home_state_id');
      _homeDistrictId = prefs.getString('reporter_home_district_id');
      _homeMandalId = prefs.getString('reporter_home_mandal_id');
      _reporterLevel = prefs.getString('reporter_level') ?? 'junior';

      final rawDistIds = prefs.getString('reporter_allowed_district_ids');
      if (rawDistIds != null) {
        try { _allowedDistrictIds = (jsonDecode(rawDistIds) as List).map((e) => e.toString()).toList(); } catch (_) {}
      }
      final rawMandIds = prefs.getString('reporter_allowed_mandal_ids');
      if (rawMandIds != null) {
        try { _allowedMandalIds = (jsonDecode(rawMandIds) as List).map((e) => e.toString()).toList(); } catch (_) {}
      }

      final lastStateId = prefs.getString('last_posted_state_id');
      final lastDistrictId = prefs.getString('last_posted_district_id');
      final lastMandalId = prefs.getString('last_posted_mandal_id');

      final catRes = await apiClient.get('/categories');
      final List<dynamic> catData = catRes.data is List ? catRes.data : (catRes.data['categories'] ?? []);
      final categories = catData.cast<Map<String, dynamic>>();

      final locRes = await apiClient.get('/locations');
      final statesData = (locRes.data['states'] as List? ?? []);

      // If not editing, prefill from last used selection or home location
      if (widget.editNews == null) {
        _selectedStateId = lastStateId ?? _homeStateId ?? (statesData.isNotEmpty ? statesData.first['id'].toString() : null);

        if (_postingScope == 'mandal') {
          _selectedDistrictId = _homeDistrictId;
          _selectedMandalId = _homeMandalId;
        } else if (_postingScope == 'district') {
          _selectedDistrictId = _homeDistrictId;
          _selectedMandalId = lastMandalId ?? _homeMandalId ?? 'all_mandals';
        } else {
          // state scope
          _selectedDistrictId = lastDistrictId ?? _homeDistrictId ?? 'all_districts';
          _selectedMandalId = lastMandalId ?? _homeMandalId ?? 'all_mandals';
        }
      }

      // Build districts for currently selected state
      List<dynamic> distList = [];
      if (_selectedStateId != null) {
        final stateObj = statesData.firstWhere(
          (s) => s['id'].toString() == _selectedStateId,
          orElse: () => null,
        );
        if (stateObj != null && stateObj['districts'] is List) {
          distList = List.from(stateObj['districts']);
          if (_allowedDistrictIds.isNotEmpty && _postingScope != 'state') {
            distList = distList.where((d) => _allowedDistrictIds.contains(d['id'].toString()) || d['id'].toString() == _homeDistrictId).toList();
          }
        }
      }

      // Build mandals for currently selected district
      List<dynamic> mandalList = [];
      if (_selectedDistrictId != null && _selectedDistrictId != 'all_districts') {
        final distObj = distList.firstWhere(
          (d) => d['id'].toString() == _selectedDistrictId,
          orElse: () => null,
        );
        if (distObj != null && distObj['mandals'] is List) {
          mandalList = List.from(distObj['mandals']);
          if (_allowedMandalIds.isNotEmpty && _postingScope == 'custom') {
            mandalList = mandalList.where((m) => _allowedMandalIds.contains(m['id'].toString()) || m['id'].toString() == _homeMandalId).toList();
          }
        }
      }

      setState(() {
        _categories = categories;
        _isLoadingCategories = false;
        if (_selectedCategoryId.isEmpty && categories.isNotEmpty) {
          _selectedCategoryId = categories.first['id'] ?? '';
        }
        _states = statesData;
        _districts = distList;
        _mandals = mandalList;
      });
    } catch (e) {
      debugPrint('Error fetching categories/locations: $e');
      setState(() => _isLoadingCategories = false);
    }
  }

  void _onStateChanged(String? stateId) {
    if (stateId == null || stateId == _selectedStateId) return;

    List<dynamic> distList = [];
    final stateObj = _states.firstWhere((s) => s['id'].toString() == stateId, orElse: () => null);
    if (stateObj != null && stateObj['districts'] is List) {
      distList = List.from(stateObj['districts']);
      if (_allowedDistrictIds.isNotEmpty && _postingScope != 'state') {
        distList = distList.where((d) => _allowedDistrictIds.contains(d['id'].toString()) || d['id'].toString() == _homeDistrictId).toList();
      }
    }

    setState(() {
      _selectedStateId = stateId;
      _districts = distList;
      _selectedDistrictId = distList.isNotEmpty ? distList.first['id'].toString() : null;
      _selectedMandalId = null;
      _mandals = [];

      if (_selectedDistrictId != null) {
        final distObj = distList.first;
        if (distObj['mandals'] is List) {
          _mandals = List.from(distObj['mandals']);
        }
      }
    });
  }

  void _onDistrictChanged(String? districtId) {
    setState(() {
      _selectedDistrictId = districtId;
      _selectedMandalId = null;
      _mandals = [];

      if (districtId != null && districtId != 'all_districts') {
        final distObj = _districts.firstWhere((d) => d['id'].toString() == districtId, orElse: () => null);
        if (distObj != null && distObj['mandals'] is List) {
          var mList = List<dynamic>.from(distObj['mandals']);
          if (_allowedMandalIds.isNotEmpty && _postingScope == 'custom') {
            mList = mList.where((m) => _allowedMandalIds.contains(m['id'].toString()) || m['id'].toString() == _homeMandalId).toList();
          }
          _mandals = mList;
        }
      }
    });
  }





  void _pickMedia() {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext bc) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.photo_library, color: Color(0xFFD32F2F)),
                title: const Text('చిత్రాలు ఎంచుకోండి (Pick 1-5 Images)'),
                subtitle: const Text('వార్త కోసం 1 నుండి 5 చిత్రాలను ఎంచుకోవచ్చు'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickMultipleImages();
                },
              ),
              ListTile(
                leading: const Icon(Icons.crop, color: Colors.blue),
                title: const Text('క్రాప్ చేసి చిత్రం ఎంచుకోండి (Crop & Add Image)'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickSingleImageWithCrop();
                },
              ),
              ListTile(
                leading: const Icon(Icons.collections, color: Colors.amber),
                title: const Text('గ్యాలరీ నుండి ఎంచుకోండి (Shared Gallery)'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickFromGallery();
                },
              ),
              ListTile(
                leading: const Icon(Icons.video_library, color: Colors.purple),
                title: const Text('వీడియో ఎంచుకోండి (Pick Video)'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickVideo();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickMultipleImages() async {
    final picker = ImagePicker();
    final pickedFiles = await picker.pickMultiImage(
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 85,
    );
    if (pickedFiles.isNotEmpty) {
      final availableSlots = 5 - _selectedImages.length;
      final toAdd = pickedFiles.take(availableSlots).map((x) => File(x.path)).toList();
      setState(() {
        _selectedImages.addAll(toAdd);
        _selectedVideo = null;
        _selectedGalleryUrl = null;
      });
      if (pickedFiles.length > availableSlots && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('గరిష్టంగా 5 చిత్రాలు మాత్రమే అనుమతించబడతాయి (Maximum 5 images allowed)'),
            backgroundColor: Color(0xFFD32F2F),
          ),
        );
      }
    }
  }

  Future<void> _pickSingleImageWithCrop() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 80,
    );
    if (pickedFile != null) {
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: pickedFile.path,
        aspectRatio: const CropAspectRatio(ratioX: 4, ratioY: 3),
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Image',
            toolbarColor: const Color(0xFFD32F2F),
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.ratio4x3,
            lockAspectRatio: true,
          ),
          IOSUiSettings(
            title: 'Crop Image',
            aspectRatioLockEnabled: true,
            resetAspectRatioEnabled: false,
          ),
        ],
      );

      if (croppedFile != null) {
        setState(() {
          if (_selectedImages.length >= 5) {
            _selectedImages[0] = File(croppedFile.path);
          } else {
            _selectedImages.insert(0, File(croppedFile.path));
          }
          _selectedVideo = null;
          _selectedGalleryUrl = null;
        });
      }
    }
  }

  Future<void> _pickFromGallery() async {
    final selectedUrl = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SharedMediaGalleryScreen()),
    );
    if (selectedUrl != null && selectedUrl is String) {
      setState(() {
        _selectedGalleryUrl = selectedUrl;
        _selectedImages.clear();
        _selectedVideo = null;
      });
    }
  }

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickVideo(source: ImageSource.gallery);
    if (pickedFile != null) {
      final videoFile = File(pickedFile.path);
      setState(() {
        _selectedVideo = videoFile;
        _selectedImages.clear();
        _selectedGalleryUrl = null;
        _generatedVideoThumbnail = null;
        _isGeneratingThumbnail = true;
      });

      try {
        final tempDir = await getTemporaryDirectory();
        final thumbPath = '${tempDir.path}/video_thumb_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final plugin = FcNativeVideoThumbnail();
        final ok = await plugin.saveThumbnailToFile(
          srcFile: videoFile.path,
          destFile: thumbPath,
          width: 720,
          height: 720,
          format: 'jpeg',
          quality: 85,
        );
        if (ok && mounted) {
          final thumbFile = File(thumbPath);
          if (await thumbFile.exists()) {
            setState(() {
              _generatedVideoThumbnail = thumbFile;
            });
          }
        }
      } catch (e) {
        debugPrint('Error generating video thumbnail: $e');
      } finally {
        if (mounted) {
          setState(() {
            _isGeneratingThumbnail = false;
          });
        }
      }
    }
  }

  Future<String?> _uploadFileDirectly(File file, String type) async {
    final fileName = file.path.split(RegExp(r'[/\\]')).last;
    final ext = fileName.split('.').last.toLowerCase();
    String contentType;
    if (type == 'video') {
      contentType = ext == 'mov' ? 'video/quicktime' : (ext == 'webm' ? 'video/webm' : 'video/mp4');
    } else {
      contentType = ext == 'png' ? 'image/png' : (ext == 'webp' ? 'image/webp' : 'image/jpeg');
    }

    try {
      final presignRes = await apiClient.post('/reporter/upload-url', data: {
        'filename': fileName,
        'contentType': contentType,
        'type': type,
      });

      if (presignRes.data != null && presignRes.data['uploadUrl'] != null) {
        final uploadUrl = presignRes.data['uploadUrl'] as String;
        final publicUrl = presignRes.data['publicUrl'] as String;

        final fileLength = await file.length();
        final uploadDio = Dio(BaseOptions(
          connectTimeout: const Duration(minutes: 5),
          sendTimeout: const Duration(minutes: 20),
          receiveTimeout: const Duration(minutes: 5),
        ));

        await uploadDio.put(
          uploadUrl,
          data: file.openRead(),
          options: Options(
            headers: {
              'Content-Type': contentType,
              'Content-Length': fileLength,
            },
          ),
          onSendProgress: (count, total) {
            if (total > 0 && mounted) {
              final progress = ((count / total) * 100).clamp(0, 100).toInt();
              setState(() {
                _submittingStatus = type == 'video'
                    ? 'వీడియో అప్‌లోడ్ అవుతోంది ($progress%)...'
                    : 'చిత్రం అప్‌లోడ్ అవుతోంది ($progress%)...';
              });
            }
          },
        );
        return publicUrl;
      }
      throw Exception('Upload URL generation failed');
    } catch (e) {
      debugPrint('Direct upload error ($type): $e');
      rethrow;
    }
  }

  Future<void> _submitNews() async {
    final now = DateTime.now();
    if (now.hour < 8 || now.hour >= 20) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('వార్తలను ఉదయం 8:00 నుండి రాత్రి 8:00 వరకు మాత్రమే సమర్పించవచ్చు.\n(News can only be submitted between 8 AM and 8 PM)'),
          backgroundColor: Color(0xFFD32F2F),
        ),
      );
      return;
    }

    if (_titleController.text.isEmpty || _descController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('దయచేసి అన్ని వివరాలను భర్తీ చేయండి')),
      );
      return;
    }

    if (_selectedImages.isEmpty &&
        _existingImagesUrls.isEmpty &&
        _selectedVideo == null &&
        _selectedGalleryUrl == null &&
        _existingThumbnailUrl == null &&
        _youtubeController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('దయచేసి కనీసం ఒక చిత్రం లేదా వీడియోను ఎంచుకోండి (Please select at least 1 image or video)')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _submittingStatus = 'సమర్పిస్తోంది...';
    });

    try {
      final isEdit = widget.editNews != null;
      final newsId = isEdit ? widget.editNews!['id'] : null;

      // 1. Direct upload video to Cloudflare R2 (bypasses Vercel 4.5MB payload limit entirely)
      String? uploadedVideoUrl;
      if (_selectedVideo != null) {
        setState(() => _submittingStatus = 'వీడియో అప్‌లోడ్ అవుతోంది...');
        uploadedVideoUrl = await _uploadFileDirectly(_selectedVideo!, 'video');
      }

      // 1b. Direct upload video thumbnail frame to Cloudflare R2
      String? uploadedVideoThumbnailUrl;
      if (_generatedVideoThumbnail != null) {
        setState(() => _submittingStatus = 'వీడియో కవర్ అప్‌లోడ్ అవుతోంది...');
        uploadedVideoThumbnailUrl = await _uploadFileDirectly(_generatedVideoThumbnail!, 'image');
      }

      // 2. Direct upload images to Cloudflare R2 (bypasses Vercel 4.5MB payload limit entirely)
      final List<String> uploadedImageUrls = [];
      if (_selectedImages.isNotEmpty) {
        setState(() => _submittingStatus = 'చిత్రాలు అప్‌లోడ్ అవుతున్నాయి (${_selectedImages.length})...');
        for (int i = 0; i < _selectedImages.length; i++) {
          final img = _selectedImages[i];
          final publicUrl = await _uploadFileDirectly(img, 'image');
          if (publicUrl != null) {
            uploadedImageUrls.add(publicUrl);
          }
        }
      }

      setState(() => _submittingStatus = 'వార్తను నమోదు చేస్తోంది...');

      final effectiveDistrictId = (_selectedDistrictId == 'all_districts' || _selectedDistrictId == 'all') ? '' : (_selectedDistrictId ?? '');
      final effectiveMandalId = (_selectedMandalId == 'all_mandals' || _selectedMandalId == 'all') ? '' : (_selectedMandalId ?? '');

      final formData = FormData.fromMap({
        'title': _titleController.text,
        'shortDesc': _descController.text,
        'categoryId': _selectedCategoryId,
        if (_selectedStateId != null) 'stateId': _selectedStateId,
        'districtId': effectiveDistrictId,
        'mandalId': effectiveMandalId,
        if (_customLinkController.text.isNotEmpty) 'customLink': _customLinkController.text,
        'hasVideo': uploadedVideoUrl != null || _selectedVideo != null || _youtubeController.text.isNotEmpty,
      });

      if (uploadedVideoUrl != null) {
        formData.fields.add(MapEntry('videoUrl', uploadedVideoUrl));
      } else if (_youtubeController.text.isNotEmpty) {
        formData.fields.add(MapEntry('videoUrl', _youtubeController.text));
      }

      if (uploadedImageUrls.isNotEmpty) {
        formData.fields.add(MapEntry('thumbnailUrl', uploadedImageUrls.first));
        formData.fields.add(MapEntry('imagesUrlsJson', jsonEncode(uploadedImageUrls)));
        for (final u in uploadedImageUrls) {
          formData.fields.add(MapEntry('imagesUrls', u));
        }
      } else if (uploadedVideoThumbnailUrl != null) {
        formData.fields.add(MapEntry('thumbnailUrl', uploadedVideoThumbnailUrl));
        formData.fields.add(MapEntry('imagesUrlsJson', jsonEncode([uploadedVideoThumbnailUrl])));
        formData.fields.add(MapEntry('imagesUrls', uploadedVideoThumbnailUrl));
      } else if (_selectedGalleryUrl != null) {
        formData.fields.add(MapEntry('thumbnailUrl', _selectedGalleryUrl!));
      } else if (_existingThumbnailUrl != null) {
        formData.fields.add(MapEntry('thumbnailUrl', _existingThumbnailUrl!));
      }

      if (isEdit) {
        await apiClient.put('/reporter/news/$newsId', data: formData);
      } else {
        await apiClient.post('/reporter/news', data: formData);

        // Remember the last used location selection for fast posting
        final prefs = await SharedPreferences.getInstance();
        if (_selectedStateId != null) await prefs.setString('last_posted_state_id', _selectedStateId!);
        if (_selectedDistrictId != null) await prefs.setString('last_posted_district_id', _selectedDistrictId!);
        if (_selectedMandalId != null) await prefs.setString('last_posted_mandal_id', _selectedMandalId!);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isEdit ? 'వార్త విజయవంతంగా నవీకరించబడింది!' : 'వార్త విజయవంతంగా సమర్పించబడింది!')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        final errorMsg = ApiClient.extractErrorMessage(e);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMsg),
            backgroundColor: const Color(0xFFD32F2F),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.editNews != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'వార్తను సవరించండి (Edit News)' : 'వార్తను సమర్పించండి (Post News)'),
        backgroundColor: const Color(0xFFD32F2F),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Media Upload Section (1 to 5 Images or Video)
            if (_selectedVideo != null) ...[
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.purple.shade200),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_generatedVideoThumbnail != null)
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          AspectRatio(
                            aspectRatio: 16 / 9,
                            child: Image.file(
                              _generatedVideoThumbnail!,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.6),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.play_arrow, color: Colors.white, size: 36),
                          ),
                          Positioned(
                            top: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.purple,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'వీడియో కవర్ (Thumbnail)',
                                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      )
                    else if (_isGeneratingThumbnail)
                      Container(
                        height: 120,
                        alignment: Alignment.center,
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.purple)),
                            SizedBox(width: 12),
                            Text('థంబ్‌నైల్ రూపొందిస్తోంది...', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          const Icon(Icons.video_file, color: Colors.purple, size: 28),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _selectedVideo!.path.split('/').last.split(r'\\').last,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          TextButton(
                            onPressed: _pickVideo,
                            child: const Text('మార్చండి', style: TextStyle(color: Colors.purple, fontSize: 12)),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            onPressed: () => setState(() {
                              _selectedVideo = null;
                              _generatedVideoThumbnail = null;
                            }),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (_selectedImages.isNotEmpty) ...[
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'ఎంచుకున్న చిత్రాలు (${_selectedImages.length}/5):',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      if (_selectedImages.length < 5)
                        TextButton.icon(
                          onPressed: _pickMedia,
                          icon: const Icon(Icons.add_photo_alternate, size: 18, color: Color(0xFFD32F2F)),
                          label: const Text('మరిన్ని జోడించు', style: TextStyle(color: Color(0xFFD32F2F), fontSize: 12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    height: 120,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _selectedImages.length,
                      separatorBuilder: (context, sepIndex) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final imgFile = _selectedImages[index];
                        final isCover = index == 0;
                        return Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 110,
                              height: 110,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isCover ? const Color(0xFFD32F2F) : Colors.grey.shade300,
                                  width: isCover ? 2.5 : 1,
                                ),
                                image: DecorationImage(
                                  image: FileImage(imgFile),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            if (isCover)
                              Positioned(
                                top: 4,
                                left: 4,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFD32F2F),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text('Cover', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            Positioned(
                              top: -6,
                              right: -6,
                              child: GestureDetector(
                                onTap: () => setState(() => _selectedImages.removeAt(index)),
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.close, size: 14, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
            ] else if (_selectedGalleryUrl != null) ...[
              Stack(
                children: [
                  Container(
                    height: 160,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      image: DecorationImage(
                        image: CachedNetworkImageProvider(_selectedGalleryUrl!),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedGalleryUrl = null),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, size: 16, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ] else if (_existingThumbnailUrl != null) ...[
              Stack(
                children: [
                  Container(
                    height: 160,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      image: DecorationImage(
                        image: CachedNetworkImageProvider(_existingThumbnailUrl!),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: ElevatedButton.icon(
                      onPressed: _pickMedia,
                      icon: const Icon(Icons.edit, size: 14),
                      label: const Text('మార్చండి (Change)'),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.black87, foregroundColor: Colors.white),
                    ),
                  ),
                ],
              ),
            ] else ...[
              GestureDetector(
                onTap: _pickMedia,
                child: Container(
                  height: 150,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_photo_alternate, size: 44, color: Color(0xFFD32F2F)),
                      SizedBox(height: 8),
                      Text(
                        'వార్త కోసం 1-5 చిత్రాలు లేదా వీడియో ఎంచుకోండి',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                      ),
                      SizedBox(height: 2),
                      Text(
                        '(Tap to upload 1 to 5 images or video)',
                        style: TextStyle(color: Colors.grey, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Location Scope Info & Cascading Location Selector (State > District > Mandal)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: _postingScope == 'state'
                    ? const Color(0xFFF3E5F5)
                    : _postingScope == 'district'
                        ? const Color(0xFFE3F2FD)
                        : const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _postingScope == 'state'
                      ? const Color(0xFFBA68C8)
                      : _postingScope == 'district'
                          ? const Color(0xFF64B5F6)
                          : const Color(0xFFFFB74D),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.location_on,
                    size: 18,
                    color: _postingScope == 'state'
                        ? Colors.purple[800]
                        : _postingScope == 'district'
                            ? Colors.blue[800]
                            : Colors.orange[900],
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _postingScope == 'state'
                          ? 'పోస్టింగ్ పరిధి: రాష్ట్ర స్థాయి (${_reporterLevel?.toUpperCase() ?? "SENIOR"})'
                          : _postingScope == 'district'
                              ? 'పోస్టింగ్ పరిధి: జిల్లా స్థాయి (${_reporterLevel?.toUpperCase() ?? "REPORTER"})'
                              : 'పోస్టింగ్ పరిధి: మండల స్థాయి (${_reporterLevel?.toUpperCase() ?? "REPORTER"})',
                      style: GoogleFonts.poppins(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: _postingScope == 'state'
                            ? Colors.purple[900]
                            : _postingScope == 'district'
                                ? Colors.blue[900]
                                : Colors.orange[900],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 1. State Selector (if state-level scope or multi-state)
            if (_states.length > 1) ...[
              DropdownButtonFormField<String>(
                initialValue: _states.any((s) => s['id'].toString() == _selectedStateId) ? _selectedStateId : null,
                decoration: const InputDecoration(
                  labelText: 'రాష్ట్రం (State) *',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                items: _states.map((s) {
                  return DropdownMenuItem<String>(
                    value: s['id'].toString(),
                    child: Text(s['name'].toString()),
                  );
                }).toList(),
                onChanged: (_postingScope == 'state') ? _onStateChanged : null,
              ),
              const SizedBox(height: 12),
            ],

            // 2. District & Mandal Pickers (Cascading)
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: (_selectedDistrictId == 'all_districts' || _districts.any((d) => d['id'].toString() == _selectedDistrictId))
                        ? _selectedDistrictId
                        : null,
                    decoration: const InputDecoration(
                      labelText: 'జిల్లా (District) *',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: [
                      if (_postingScope == 'state')
                        const DropdownMenuItem<String>(
                          value: 'all_districts',
                          child: Text('రాష్ట్ర వ్యాప్తంగా (All Districts)', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFD32F2F))),
                        ),
                      ..._districts.map((d) {
                        return DropdownMenuItem<String>(
                          value: d['id'].toString(),
                          child: Text(d['name'].toString()),
                        );
                      }),
                    ],
                    onChanged: (_postingScope == 'mandal') ? null : _onDistrictChanged,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: (_selectedDistrictId == 'all_districts')
                        ? null
                        : (_selectedMandalId == 'all_mandals' || _mandals.any((m) => m['id'].toString() == _selectedMandalId))
                            ? _selectedMandalId
                            : null,
                    decoration: InputDecoration(
                      labelText: 'మండలం (Mandal)',
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      enabled: _selectedDistrictId != 'all_districts' && _postingScope != 'mandal',
                    ),
                    items: (_selectedDistrictId == 'all_districts')
                        ? []
                        : [
                            if (_postingScope != 'mandal')
                              const DropdownMenuItem<String>(
                                value: 'all_mandals',
                                child: Text('జిల్లా వ్యాప్తంగా (All Mandals)', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFD32F2F))),
                              ),
                            ..._mandals.map((m) {
                              return DropdownMenuItem<String>(
                                value: m['id'].toString(),
                                child: Text(m['name'].toString()),
                              );
                            }),
                          ],
                    onChanged: (_selectedDistrictId == 'all_districts' || _postingScope == 'mandal')
                        ? null
                        : (val) => setState(() => _selectedMandalId = val),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Title field
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'వార్త శీర్షిక (Title)',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 14),

            // Category Selector (Default: All News)
            _isLoadingCategories
                ? const Center(child: CircularProgressIndicator())
                : DropdownButtonFormField<String>(
                    initialValue: _selectedCategoryId.isNotEmpty ? _selectedCategoryId : null,
                    decoration: const InputDecoration(
                      labelText: 'కేటగిరీ (Category)',
                      border: OutlineInputBorder(),
                    ),
                    items: _categories.map((c) {
                      return DropdownMenuItem<String>(
                        value: c['id'].toString(),
                        child: Text(c['name'].toString()),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedCategoryId = val);
                    },
                  ),

            const SizedBox(height: 14),

            // News details/description field
            TextField(
              controller: _descController,
              maxLines: 6,
              decoration: const InputDecoration(
                labelText: 'వార్త పూర్తి వివరాలు (News Details)',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),

            const SizedBox(height: 14),

            // Custom link field
            TextField(
              controller: _customLinkController,
              decoration: const InputDecoration(
                labelText: 'కస్టమ్ లింక్ (Custom Link - Optional)',
                hintText: 'https://example.com',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
            ),

            const SizedBox(height: 24),

            // Submit Button
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitNews,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD32F2F),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _isSubmitting
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          _submittingStatus,
                          style: GoogleFonts.notoSansTelugu(fontSize: 14, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ],
                    )
                  : Text(
                      isEdit ? 'వార్తను నవీకరించండి (Update)' : 'వార్తను పంపండి (Submit)',
                      style: GoogleFonts.notoSansTelugu(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _youtubeController.dispose();
    _customLinkController.dispose();
    super.dispose();
  }
}
