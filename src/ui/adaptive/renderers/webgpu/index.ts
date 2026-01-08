export const WEBGPU_FEATURE_FLAGS = {
  enabled: false,
  reason: 'WebGPU backend is experimental; enable explicitly in host apps.',
};

export function isWebGPUEnabled(): boolean {
  return WEBGPU_FEATURE_FLAGS.enabled;
}
