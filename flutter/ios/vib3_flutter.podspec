Pod::Spec.new do |s|
  s.name             = 'vib3_flutter'
  s.version          = '1.7.0'
  s.summary          = 'VIB3+ 4D Visualization Engine for Flutter'
  s.description      = <<-DESC
High-performance 4D geometry visualization engine with Metal rendering,
6D rotation support, and native FFI bindings for Flutter iOS applications.
                       DESC
  s.homepage         = 'https://github.com/Domusgpt/vib34d-xr-quaternion-sdk'
  s.license          = { :type => 'Proprietary', :file => '../LICENSE' }
  s.author           = { 'Paul Phillips' => 'Paul@clearseassolutions.com' }
  s.source           = { :path => '.' }
  s.source_files     = 'Classes/**/*'
  s.dependency 'Flutter'
  s.platform         = :ios, '12.0'
  s.swift_version    = '5.0'

  # Flutter.framework does not contain a i386 slice
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'i386',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'OTHER_CPLUSPLUSFLAGS' => '-std=c++20 -O3'
  }

  # Native C++ source for FFI
  s.preserve_paths = '../../cpp/**/*'
  s.xcconfig = {
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/../../cpp/include"',
    'LIBRARY_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/../../cpp/build"'
  }

  # Metal framework for GPU rendering
  s.frameworks = 'Metal', 'MetalKit', 'QuartzCore'
end
