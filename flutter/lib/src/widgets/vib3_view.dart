/// VIB3 View Widget
///
/// Renders 4D visualizations using platform texture.
library vib3_view;

import 'package:flutter/material.dart';
import '../vib3_engine.dart';

/// Widget that displays VIB3 visualization
class Vib3View extends StatefulWidget {
  /// The VIB3 engine instance
  final Vib3Engine engine;

  /// Whether to show loading indicator
  final bool showLoading;

  /// Placeholder widget while loading
  final Widget? placeholder;

  /// Error widget builder
  final Widget Function(BuildContext, Object)? errorBuilder;

  /// Gesture callbacks
  final GestureTapCallback? onTap;
  final GestureLongPressCallback? onLongPress;

  const Vib3View({
    super.key,
    required this.engine,
    this.showLoading = true,
    this.placeholder,
    this.errorBuilder,
    this.onTap,
    this.onLongPress,
  });

  @override
  State<Vib3View> createState() => _Vib3ViewState();
}

class _Vib3ViewState extends State<Vib3View> {
  @override
  void initState() {
    super.initState();
    widget.engine.addListener(_onEngineUpdate);
  }

  @override
  void dispose() {
    widget.engine.removeListener(_onEngineUpdate);
    super.dispose();
  }

  void _onEngineUpdate() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.engine.isInitialized) {
      if (widget.showLoading) {
        return widget.placeholder ?? const Center(
          child: CircularProgressIndicator(),
        );
      }
      return const SizedBox.shrink();
    }

    final textureId = widget.engine.textureId;
    if (textureId == null) {
      return widget.errorBuilder?.call(context, 'No texture available') ??
          const Center(child: Text('No texture available'));
    }

    Widget view = Texture(textureId: textureId);

    // Wrap with gesture detector if callbacks provided
    if (widget.onTap != null || widget.onLongPress != null) {
      view = GestureDetector(
        onTap: widget.onTap,
        onLongPress: widget.onLongPress,
        child: view,
      );
    }

    return view;
  }
}

/// Interactive VIB3 view with rotation gestures
class Vib3InteractiveView extends StatefulWidget {
  final Vib3Engine engine;
  final double rotationSensitivity;
  final bool enablePanRotation;
  final bool enablePinchZoom;

  const Vib3InteractiveView({
    super.key,
    required this.engine,
    this.rotationSensitivity = 0.01,
    this.enablePanRotation = true,
    this.enablePinchZoom = true,
  });

  @override
  State<Vib3InteractiveView> createState() => _Vib3InteractiveViewState();
}

class _Vib3InteractiveViewState extends State<Vib3InteractiveView> {
  Offset? _lastPanPosition;
  double? _lastScale;

  void _onPanStart(DragStartDetails details) {
    _lastPanPosition = details.localPosition;
  }

  void _onPanUpdate(DragUpdateDetails details) {
    if (!widget.enablePanRotation) return;
    if (_lastPanPosition == null) return;

    final delta = details.localPosition - _lastPanPosition!;
    _lastPanPosition = details.localPosition;

    // Map pan to 4D rotation
    // Horizontal pan = XW rotation (4D depth)
    // Vertical pan = YW rotation
    final xwDelta = delta.dx * widget.rotationSensitivity;
    final ywDelta = delta.dy * widget.rotationSensitivity;

    widget.engine.beginBatch();
    widget.engine.batchRotate(RotationPlane.xw,
        widget.engine.state.rotation.xw + xwDelta);
    widget.engine.batchRotate(RotationPlane.yw,
        widget.engine.state.rotation.yw + ywDelta);
    widget.engine.executeBatch();
  }

  void _onPanEnd(DragEndDetails details) {
    _lastPanPosition = null;
  }

  void _onScaleStart(ScaleStartDetails details) {
    _lastScale = 1.0;
  }

  void _onScaleUpdate(ScaleUpdateDetails details) {
    if (!widget.enablePinchZoom) return;
    if (_lastScale == null) return;

    final scaleDelta = details.scale - _lastScale!;
    _lastScale = details.scale;

    // Map scale to ZW rotation (brings geometry closer/further in 4D)
    final zwDelta = scaleDelta * widget.rotationSensitivity * 10;
    widget.engine.rotate(
      RotationPlane.zw,
      widget.engine.state.rotation.zw + zwDelta,
    );
  }

  void _onScaleEnd(ScaleEndDetails details) {
    _lastScale = null;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: _onPanStart,
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      onScaleStart: _onScaleStart,
      onScaleUpdate: _onScaleUpdate,
      onScaleEnd: _onScaleEnd,
      child: Vib3View(engine: widget.engine),
    );
  }
}

/// Animated VIB3 view with auto-rotation
class Vib3AnimatedView extends StatefulWidget {
  final Vib3Engine engine;
  final Duration rotationPeriod;
  final List<RotationPlane> activePlanes;

  const Vib3AnimatedView({
    super.key,
    required this.engine,
    this.rotationPeriod = const Duration(seconds: 10),
    this.activePlanes = const [RotationPlane.xw, RotationPlane.yw],
  });

  @override
  State<Vib3AnimatedView> createState() => _Vib3AnimatedViewState();
}

class _Vib3AnimatedViewState extends State<Vib3AnimatedView>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.rotationPeriod,
      vsync: this,
    )..repeat();
    _controller.addListener(_updateRotation);
  }

  @override
  void dispose() {
    _controller.removeListener(_updateRotation);
    _controller.dispose();
    super.dispose();
  }

  void _updateRotation() {
    final angle = _controller.value * 2 * 3.14159265359;

    widget.engine.beginBatch();
    for (final plane in widget.activePlanes) {
      widget.engine.batchRotate(plane, angle);
    }
    widget.engine.executeBatch();
  }

  @override
  Widget build(BuildContext context) {
    return Vib3View(engine: widget.engine);
  }
}
