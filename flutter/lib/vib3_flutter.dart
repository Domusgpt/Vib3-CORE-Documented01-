/// VIB3+ Flutter Plugin
///
/// 4D visualization engine for Flutter with native performance.
///
/// ## Features
/// - 24 geometry variants (8 base × 3 cores)
/// - 6D rotation (XY, XZ, YZ, XW, YW, ZW planes)
/// - Real-time rendering via platform textures
/// - Audio-reactive visualizations
/// - FFI for high-performance math operations
///
/// ## Usage
/// ```dart
/// import 'package:vib3_flutter/vib3_flutter.dart';
///
/// final engine = Vib3Engine();
/// await engine.initialize(Vib3Config(
///   system: 'quantum',
///   geometry: 8,  // Hypersphere-wrapped tetrahedron
/// ));
///
/// // Use in widget
/// Vib3View(engine: engine)
/// ```
library vib3_flutter;

export 'src/vib3_engine.dart';
export 'src/ffi/vib3_ffi.dart' show Vec4, Rotor4D, Mat4x4, RotationPlane, Projection;
export 'src/widgets/vib3_view.dart';
export 'src/widgets/vib3_controls.dart';
