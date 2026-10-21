# fmt 11.0.2 is pinned by React Native 0.81. On Apple clang 21, its
# FMT_STRING wrapper fails even for valid strings. Backport fmt 12's use of
# the literal when consteval already checks it; retain compile-time checking.
# Upstream: https://github.com/fmtlib/fmt/issues/4740
#           https://github.com/fmtlib/fmt/pull/4612
def patch_fmt_consteval!(pods_root)
  base = File.join(pods_root, 'fmt/include/fmt/base.h')
  header = File.join(pods_root, 'fmt/include/fmt/format.h')
  return unless File.exist?(base) && File.exist?(header)
  return unless File.read(base).include?('#define FMT_VERSION 110002')

  original = '#define FMT_STRING(s) FMT_STRING_IMPL(s, fmt::detail::compile_string, )'
  patched = <<~CPP.strip
    // Glucosapp: fmt consteval compatibility for Apple clang 21+.
    #if FMT_USE_CONSTEVAL && defined(__apple_build_version__) && FMT_CLANG_VERSION >= 2100
    #  define FMT_STRING(s) s
    #else
    #{original}
    #endif
  CPP
  content = File.read(header)
  return if content.include?('// Glucosapp: fmt consteval compatibility')
  raise 'Unexpected fmt 11.0.2 FMT_STRING definition' unless content.include?(original)

  File.chmod(0644, header)
  File.write(header, content.sub(original, patched))
end
