/// VIB3+ Flutter Engine
///
/// High-level API for 4D visualization in Flutter applications.
library vib3_engine;

import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'ffi/vib3_ffi.dart';

// ============================================================================
// Engine Configuration
// ============================================================================

/// Configuration for VIB3 engine
class Vib3Config {
  /// Visualization system: 'quantum', 'faceted', 'holographic'
  final String system;

  /// Geometry index (0-23)
  final int geometry;

  /// Grid density for geometry generation
  final int gridDensity;

  /// Enable audio reactivity
  final bool audioReactive;

  /// Projection distance for 4D→3D
  final double projectionDistance;

  /// Initial rotation angles (6 planes)
  final Vib3Rotation initialRotation;

  const Vib3Config({
    this.system = 'quantum',
    this.geometry = 0,
    this.gridDensity = 32,
    this.audioReactive = false,
    this.projectionDistance = 2.0,
    this.initialRotation = const Vib3Rotation(),
  });

  Map<String, dynamic> toJson() => {
    'system': system,
    'geometry': geometry,
    'gridDensity': gridDensity,
    'audioReactive': audioReactive,
    'projectionDistance': projectionDistance,
    'rotation': initialRotation.toJson(),
  };
}

/// 6D rotation parameters
class Vib3Rotation {
  final double xy;
  final double xz;
  final double yz;
  final double xw;
  final double yw;
  final double zw;

  const Vib3Rotation({
    this.xy = 0,
    this.xz = 0,
    this.yz = 0,
    this.xw = 0,
    this.yw = 0,
    this.zw = 0,
  });

  Vib3Rotation copyWith({
    double? xy,
    double? xz,
    double? yz,
    double? xw,
    double? yw,
    double? zw,
  }) {
    return Vib3Rotation(
      xy: xy ?? this.xy,
      xz: xz ?? this.xz,
      yz: yz ?? this.yz,
      xw: xw ?? this.xw,
      yw: yw ?? this.yw,
      zw: zw ?? this.zw,
    );
  }

  Map<String, double> toJson() => {
    'xy': xy,
    'xz': xz,
    'yz': yz,
    'xw': xw,
    'yw': yw,
    'zw': zw,
  };

  Rotor4D toRotor() => Rotor4D.fromEuler6(
    xy: xy,
    xz: xz,
    yz: yz,
    xw: xw,
    yw: yw,
    zw: zw,
  );

  Mat4x4 toMatrix() => Mat4x4.rotationFromAngles(
    xy: xy,
    xz: xz,
    yz: yz,
    xw: xw,
    yw: yw,
    zw: zw,
  );
}

// ============================================================================
// Engine State
// ============================================================================

/// Current state of the VIB3 engine
class Vib3State {
  final String system;
  final int geometry;
  final Vib3Rotation rotation;
  final double morphFactor;
  final double chaos;
  final double speed;
  final double hue;
  final double intensity;
  final double saturation;
  final bool isRendering;

  const Vib3State({
    this.system = 'quantum',
    this.geometry = 0,
    this.rotation = const Vib3Rotation(),
    this.morphFactor = 0.5,
    this.chaos = 0.0,
    this.speed = 1.0,
    this.hue = 200,
    this.intensity = 0.8,
    this.saturation = 0.7,
    this.isRendering = false,
  });

  Vib3State copyWith({
    String? system,
    int? geometry,
    Vib3Rotation? rotation,
    double? morphFactor,
    double? chaos,
    double? speed,
    double? hue,
    double? intensity,
    double? saturation,
    bool? isRendering,
  }) {
    return Vib3State(
      system: system ?? this.system,
      geometry: geometry ?? this.geometry,
      rotation: rotation ?? this.rotation,
      morphFactor: morphFactor ?? this.morphFactor,
      chaos: chaos ?? this.chaos,
      speed: speed ?? this.speed,
      hue: hue ?? this.hue,
      intensity: intensity ?? this.intensity,
      saturation: saturation ?? this.saturation,
      isRendering: isRendering ?? this.isRendering,
    );
  }
}

// ============================================================================
// Main Engine
// ============================================================================

/// VIB3+ 4D Visualization Engine
class Vib3Engine extends ChangeNotifier {
  static const String _channelName = 'com.vib3.engine';
  static const MethodChannel _channel = MethodChannel(_channelName);

  Vib3State _state = const Vib3State();
  bool _initialized = false;
  int? _textureId;
  CommandBatch? _pendingBatch;

  /// Current engine state
  Vib3State get state => _state;

  /// Whether engine is initialized
  bool get isInitialized => _initialized;

  /// Texture ID for Flutter rendering
  int? get textureId => _textureId;

  /// Initialize the engine with configuration
  Future<void> initialize(Vib3Config config) async {
    if (_initialized) return;

    try {
      final result = await _channel.invokeMethod<Map>('initialize', config.toJson());
      _textureId = result?['textureId'] as int?;
      _state = _state.copyWith(
        system: config.system,
        geometry: config.geometry,
      );
      _initialized = true;
      notifyListeners();
    } on PlatformException catch (e) {
      throw Vib3Exception('Failed to initialize engine: ${e.message}');
    }
  }

  /// Dispose engine resources
  Future<void> dispose() async {
    if (!_initialized) return;

    try {
      await _channel.invokeMethod('dispose');
      _initialized = false;
      _textureId = null;
      notifyListeners();
    } on PlatformException catch (e) {
      throw Vib3Exception('Failed to dispose engine: ${e.message}');
    }
    super.dispose();
  }

  /// Set visualization system
  Future<void> setSystem(String system) async {
    _ensureInitialized();
    await _channel.invokeMethod('setSystem', {'system': system});
    _state = _state.copyWith(system: system);
    notifyListeners();
  }

  /// Set geometry index (0-23)
  Future<void> setGeometry(int index) async {
    _ensureInitialized();
    if (index < 0 || index > 23) {
      throw ArgumentError('Geometry index must be 0-23, got $index');
    }
    await _channel.invokeMethod('setGeometry', {'index': index});
    _state = _state.copyWith(geometry: index);
    notifyListeners();
  }

  /// Set rotation for a specific plane
  Future<void> rotate(RotationPlane plane, double angle) async {
    _ensureInitialized();
    await _channel.invokeMethod('rotate', {
      'plane': plane.name,
      'angle': angle,
    });

    final newRotation = switch (plane) {
      RotationPlane.xy => _state.rotation.copyWith(xy: angle),
      RotationPlane.xz => _state.rotation.copyWith(xz: angle),
      RotationPlane.yz => _state.rotation.copyWith(yz: angle),
      RotationPlane.xw => _state.rotation.copyWith(xw: angle),
      RotationPlane.yw => _state.rotation.copyWith(yw: angle),
      RotationPlane.zw => _state.rotation.copyWith(zw: angle),
    };
    _state = _state.copyWith(rotation: newRotation);
    notifyListeners();
  }

  /// Set all 6 rotation angles at once
  Future<void> setRotation(Vib3Rotation rotation) async {
    _ensureInitialized();
    await _channel.invokeMethod('setRotation', rotation.toJson());
    _state = _state.copyWith(rotation: rotation);
    notifyListeners();
  }

  /// Reset all rotations to zero
  Future<void> resetRotation() async {
    _ensureInitialized();
    await _channel.invokeMethod('resetRotation');
    _state = _state.copyWith(rotation: const Vib3Rotation());
    notifyListeners();
  }

  /// Set visual parameters
  Future<void> setVisualParams({
    double? morphFactor,
    double? chaos,
    double? speed,
    double? hue,
    double? intensity,
    double? saturation,
  }) async {
    _ensureInitialized();
    final params = <String, double>{};
    if (morphFactor != null) params['morphFactor'] = morphFactor;
    if (chaos != null) params['chaos'] = chaos;
    if (speed != null) params['speed'] = speed;
    if (hue != null) params['hue'] = hue;
    if (intensity != null) params['intensity'] = intensity;
    if (saturation != null) params['saturation'] = saturation;

    await _channel.invokeMethod('setVisualParams', params);

    _state = _state.copyWith(
      morphFactor: morphFactor ?? _state.morphFactor,
      chaos: chaos ?? _state.chaos,
      speed: speed ?? _state.speed,
      hue: hue ?? _state.hue,
      intensity: intensity ?? _state.intensity,
      saturation: saturation ?? _state.saturation,
    );
    notifyListeners();
  }

  /// Start rendering
  Future<void> startRendering() async {
    _ensureInitialized();
    await _channel.invokeMethod('startRendering');
    _state = _state.copyWith(isRendering: true);
    notifyListeners();
  }

  /// Stop rendering
  Future<void> stopRendering() async {
    _ensureInitialized();
    await _channel.invokeMethod('stopRendering');
    _state = _state.copyWith(isRendering: false);
    notifyListeners();
  }

  /// Capture current frame as image
  Future<ui.Image?> captureFrame() async {
    _ensureInitialized();
    final bytes = await _channel.invokeMethod<Uint8List>('captureFrame');
    if (bytes == null) return null;

    final completer = Completer<ui.Image>();
    ui.decodeImageFromList(bytes, completer.complete);
    return completer.future;
  }

  // ============================================================================
  // Batched Operations (for performance)
  // ============================================================================

  /// Start a command batch
  void beginBatch() {
    _pendingBatch = CommandBatch();
  }

  /// Add rotation to batch
  void batchRotate(RotationPlane plane, double angle) {
    _pendingBatch?.rotate(plane, angle);
  }

  /// Add geometry change to batch
  void batchSetGeometry(int index) {
    _pendingBatch?.setGeometry(index);
  }

  /// Execute the batched commands
  Future<void> executeBatch() async {
    if (_pendingBatch == null || _pendingBatch!.commandCount == 0) return;

    _ensureInitialized();
    final results = _pendingBatch!.execute();
    _pendingBatch = null;

    // Process results if needed
    if (results.isNotEmpty) {
      // Parse batch results
    }
    notifyListeners();
  }

  /// Cancel pending batch
  void cancelBatch() {
    _pendingBatch?.clear();
    _pendingBatch = null;
  }

  // ============================================================================
  // Geometry Utilities
  // ============================================================================

  /// Get geometry name from index
  static String getGeometryName(int index) {
    final baseNames = [
      'tetrahedron', 'hypercube', 'sphere', 'torus',
      'klein_bottle', 'fractal', 'wave', 'crystal'
    ];
    final coreNames = ['base', 'hypersphere', 'hypertetra'];

    final baseIndex = index % 8;
    final coreIndex = index ~/ 8;

    return '${baseNames[baseIndex]}_${coreNames[coreIndex]}';
  }

  /// Get all geometry names
  static List<String> get allGeometryNames {
    return List.generate(24, getGeometryName);
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  void _ensureInitialized() {
    if (!_initialized) {
      throw Vib3Exception('Engine not initialized. Call initialize() first.');
    }
  }
}

// ============================================================================
// Exceptions
// ============================================================================

/// VIB3 engine exception
class Vib3Exception implements Exception {
  final String message;

  Vib3Exception(this.message);

  @override
  String toString() => 'Vib3Exception: $message';
}
