/// VIB3 Control Widgets
///
/// Pre-built UI controls for VIB3 visualization parameters.
library vib3_controls;

import 'package:flutter/material.dart';
import '../vib3_engine.dart';
import '../ffi/vib3_ffi.dart';

/// 6D rotation control panel
class Vib3RotationControls extends StatelessWidget {
  final Vib3Engine engine;
  final bool showLabels;
  final Color? activeColor;

  const Vib3RotationControls({
    super.key,
    required this.engine,
    this.showLabels = true,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = activeColor ?? theme.colorScheme.primary;

    return ListenableBuilder(
      listenable: engine,
      builder: (context, _) {
        final rotation = engine.state.rotation;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (showLabels)
              Text('3D Space Rotations', style: theme.textTheme.titleSmall),
            _RotationSlider(
              label: 'XY',
              value: rotation.xy,
              onChanged: (v) => engine.rotate(RotationPlane.xy, v),
              color: color,
            ),
            _RotationSlider(
              label: 'XZ',
              value: rotation.xz,
              onChanged: (v) => engine.rotate(RotationPlane.xz, v),
              color: color,
            ),
            _RotationSlider(
              label: 'YZ',
              value: rotation.yz,
              onChanged: (v) => engine.rotate(RotationPlane.yz, v),
              color: color,
            ),
            const Divider(),
            if (showLabels)
              Text('4D Hyperspace Rotations', style: theme.textTheme.titleSmall),
            _RotationSlider(
              label: 'XW',
              value: rotation.xw,
              onChanged: (v) => engine.rotate(RotationPlane.xw, v),
              color: color.withOpacity(0.8),
            ),
            _RotationSlider(
              label: 'YW',
              value: rotation.yw,
              onChanged: (v) => engine.rotate(RotationPlane.yw, v),
              color: color.withOpacity(0.8),
            ),
            _RotationSlider(
              label: 'ZW',
              value: rotation.zw,
              onChanged: (v) => engine.rotate(RotationPlane.zw, v),
              color: color.withOpacity(0.8),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: () => engine.resetRotation(),
              icon: const Icon(Icons.refresh),
              label: const Text('Reset'),
            ),
          ],
        );
      },
    );
  }
}

class _RotationSlider extends StatelessWidget {
  final String label;
  final double value;
  final ValueChanged<double> onChanged;
  final Color color;

  const _RotationSlider({
    required this.label,
    required this.value,
    required this.onChanged,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(width: 30, child: Text(label)),
        Expanded(
          child: Slider(
            value: value,
            min: 0,
            max: 6.28318530718, // 2π
            onChanged: onChanged,
            activeColor: color,
          ),
        ),
        SizedBox(
          width: 50,
          child: Text(value.toStringAsFixed(2)),
        ),
      ],
    );
  }
}

/// Geometry selector dropdown
class Vib3GeometrySelector extends StatelessWidget {
  final Vib3Engine engine;
  final bool showCoreLabels;

  const Vib3GeometrySelector({
    super.key,
    required this.engine,
    this.showCoreLabels = true,
  });

  static const _baseNames = [
    'Tetrahedron',
    'Hypercube',
    'Sphere',
    'Torus',
    'Klein Bottle',
    'Fractal',
    'Wave',
    'Crystal',
  ];

  static const _coreNames = [
    'Base',
    'Hypersphere Core',
    'Hypertetra Core',
  ];

  String _getGeometryLabel(int index) {
    final baseIndex = index % 8;
    final coreIndex = index ~/ 8;

    if (showCoreLabels) {
      return '${_baseNames[baseIndex]} (${_coreNames[coreIndex]})';
    }
    return _baseNames[baseIndex];
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: engine,
      builder: (context, _) {
        return DropdownButton<int>(
          value: engine.state.geometry,
          items: List.generate(24, (index) {
            return DropdownMenuItem(
              value: index,
              child: Text(_getGeometryLabel(index)),
            );
          }),
          onChanged: (value) {
            if (value != null) {
              engine.setGeometry(value);
            }
          },
        );
      },
    );
  }
}

/// System selector (Quantum, Faceted, Holographic)
class Vib3SystemSelector extends StatelessWidget {
  final Vib3Engine engine;

  const Vib3SystemSelector({
    super.key,
    required this.engine,
  });

  static const _systems = ['quantum', 'faceted', 'holographic'];
  static const _systemLabels = ['Quantum', 'Faceted', 'Holographic'];

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: engine,
      builder: (context, _) {
        return SegmentedButton<String>(
          segments: List.generate(_systems.length, (index) {
            return ButtonSegment(
              value: _systems[index],
              label: Text(_systemLabels[index]),
            );
          }),
          selected: {engine.state.system},
          onSelectionChanged: (selection) {
            engine.setSystem(selection.first);
          },
        );
      },
    );
  }
}

/// Visual parameters panel
class Vib3VisualControls extends StatelessWidget {
  final Vib3Engine engine;

  const Vib3VisualControls({
    super.key,
    required this.engine,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: engine,
      builder: (context, _) {
        final state = engine.state;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _ParamSlider(
              label: 'Morph',
              value: state.morphFactor,
              min: 0,
              max: 2,
              onChanged: (v) => engine.setVisualParams(morphFactor: v),
            ),
            _ParamSlider(
              label: 'Chaos',
              value: state.chaos,
              min: 0,
              max: 1,
              onChanged: (v) => engine.setVisualParams(chaos: v),
            ),
            _ParamSlider(
              label: 'Speed',
              value: state.speed,
              min: 0.1,
              max: 3,
              onChanged: (v) => engine.setVisualParams(speed: v),
            ),
            _ParamSlider(
              label: 'Hue',
              value: state.hue,
              min: 0,
              max: 360,
              onChanged: (v) => engine.setVisualParams(hue: v),
            ),
            _ParamSlider(
              label: 'Intensity',
              value: state.intensity,
              min: 0,
              max: 1,
              onChanged: (v) => engine.setVisualParams(intensity: v),
            ),
            _ParamSlider(
              label: 'Saturation',
              value: state.saturation,
              min: 0,
              max: 1,
              onChanged: (v) => engine.setVisualParams(saturation: v),
            ),
          ],
        );
      },
    );
  }
}

class _ParamSlider extends StatelessWidget {
  final String label;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;

  const _ParamSlider({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(width: 70, child: Text(label)),
        Expanded(
          child: Slider(
            value: value.clamp(min, max),
            min: min,
            max: max,
            onChanged: onChanged,
          ),
        ),
        SizedBox(
          width: 50,
          child: Text(value.toStringAsFixed(2)),
        ),
      ],
    );
  }
}

/// Complete control panel combining all controls
class Vib3ControlPanel extends StatelessWidget {
  final Vib3Engine engine;
  final bool showSystem;
  final bool showGeometry;
  final bool showRotation;
  final bool showVisual;

  const Vib3ControlPanel({
    super.key,
    required this.engine,
    this.showSystem = true,
    this.showGeometry = true,
    this.showRotation = true,
    this.showVisual = true,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showSystem) ...[
            const Text('System', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Vib3SystemSelector(engine: engine),
            const SizedBox(height: 16),
          ],
          if (showGeometry) ...[
            const Text('Geometry', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Vib3GeometrySelector(engine: engine),
            const SizedBox(height: 16),
          ],
          if (showRotation) ...[
            const Text('Rotation', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Vib3RotationControls(engine: engine),
            const SizedBox(height: 16),
          ],
          if (showVisual) ...[
            const Text('Visual', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Vib3VisualControls(engine: engine),
          ],
        ],
      ),
    );
  }
}
