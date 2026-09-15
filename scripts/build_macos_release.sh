#!/bin/sh
set -eu

if command -v rustup >/dev/null 2>&1; then
  rustup_bin="$(command -v rustup)"
elif [ -x /opt/homebrew/opt/rustup/bin/rustup ]; then
  rustup_bin=/opt/homebrew/opt/rustup/bin/rustup
  PATH="/opt/homebrew/opt/rustup/bin:$PATH"
  export PATH
else
  printf '%s\n' 'Universal macOS builds require rustup. Install it, then add both Apple targets:' >&2
  printf '%s\n' '  rustup target add aarch64-apple-darwin x86_64-apple-darwin' >&2
  exit 1
fi

installed_targets="$("$rustup_bin" target list --installed)"
for target in aarch64-apple-darwin x86_64-apple-darwin; do
  if ! printf '%s\n' "$installed_targets" | grep -qx "$target"; then
    printf 'Missing Rust target: %s\n' "$target" >&2
    printf '%s\n' 'Run: rustup target add aarch64-apple-darwin x86_64-apple-darwin' >&2
    exit 1
  fi
done

credential_count=0
for variable_name in APPLE_SIGNING_IDENTITY APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID; do
  eval "variable_value=\${$variable_name-}"
  if [ -n "$variable_value" ]; then credential_count=$((credential_count + 1)); fi
done

if [ "$credential_count" -ne 0 ] && [ "$credential_count" -ne 4 ]; then
  printf '%s\n' 'For a notarized release, set all of APPLE_SIGNING_IDENTITY, APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID.' >&2
  exit 1
fi

if [ "$credential_count" -eq 0 ]; then
  printf '%s\n' 'Building a universal ad-hoc-signed DMG. It will not pass Gatekeeper distribution checks.'
else
  printf '%s\n' 'Building, Developer ID signing, notarizing, and stapling a universal DMG.'
fi

npm run check
npm run build:universal

dmg_path="$(find src-tauri/target/universal-apple-darwin/release/bundle/dmg -maxdepth 1 -name '*.dmg' -print -quit)"
if [ -z "$dmg_path" ] || [ ! -f "$dmg_path" ]; then
  printf '%s\n' 'The universal build did not produce a DMG.' >&2
  exit 1
fi

mount_dir="$(mktemp -d)"
cleanup_mount() {
  hdiutil detach "$mount_dir" >/dev/null 2>&1 || true
  rmdir "$mount_dir" >/dev/null 2>&1 || true
}
trap cleanup_mount EXIT INT TERM
hdiutil attach -nobrowse -readonly -mountpoint "$mount_dir" "$dmg_path" >/dev/null
app_path="$mount_dir/Nuzzle.app"
if [ ! -d "$app_path" ]; then
  printf '%s\n' 'The DMG does not contain Nuzzle.app.' >&2
  exit 1
fi

lipo -archs "$app_path/Contents/MacOS/Nuzzle" | grep -q 'x86_64'
lipo -archs "$app_path/Contents/MacOS/Nuzzle" | grep -q 'arm64'
codesign --verify --deep --strict --verbose=2 "$app_path"

if [ "$credential_count" -eq 4 ]; then
  spctl --assess --type execute --verbose=2 "$app_path"
  xcrun stapler validate "$app_path"
  xcrun stapler validate "$dmg_path"
fi

printf 'Verified mounted application: %s\nVerified disk image: %s\n' "$app_path" "$dmg_path"
