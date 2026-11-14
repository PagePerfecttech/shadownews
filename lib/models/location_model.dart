class LocationItem {
  final String id;
  final String name;
  final String? code;

  LocationItem({
    required this.id,
    required this.name,
    this.code,
  });

  factory LocationItem.fromJson(Map<String, dynamic> json) {
    return LocationItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (code != null) 'code': code,
    };
  }
}

class DistrictLocation extends LocationItem {
  final List<LocationItem> mandals;
  final List<LocationItem> assemblies;

  DistrictLocation({
    required super.id,
    required super.name,
    super.code,
    this.mandals = const [],
    this.assemblies = const [],
  });

  factory DistrictLocation.fromJson(Map<String, dynamic> json) {
    return DistrictLocation(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString(),
      mandals: (json['mandals'] as List?)
              ?.map((m) => LocationItem.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      assemblies: (json['assemblies'] as List?)
              ?.map((a) => LocationItem.fromJson(a as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'mandals': mandals.map((m) => m.toJson()).toList(),
      'assemblies': assemblies.map((a) => a.toJson()).toList(),
    };
  }
}

class StateLocationModel extends LocationItem {
  final List<DistrictLocation> districts;

  StateLocationModel({
    required super.id,
    required super.name,
    super.code,
    this.districts = const [],
  });

  factory StateLocationModel.fromJson(Map<String, dynamic> json) {
    return StateLocationModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString(),
      districts: (json['districts'] as List?)
              ?.map((d) => DistrictLocation.fromJson(d as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'districts': districts.map((d) => d.toJson()).toList(),
    };
  }
}
