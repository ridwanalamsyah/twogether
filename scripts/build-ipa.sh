#!/usr/bin/env bash
set -euo pipefail

# Build script for Twogether iOS (.ipa) - Unsigned for SideStore / AltStore / TrollStore
# Run this on a Mac: npm run build:ipa

echo "🚀 [1/4] Building Next.js static export..."
npm run build

echo "📲 [2/4] Syncing Capacitor iOS..."
npx cap sync ios

echo "🔨 [3/4] Building iOS Release App (unsigned)..."
rm -rf ios/App/build
xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ios/App/build \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO

echo "📦 [4/4] Packaging Twogether.ipa..."
mkdir -p ios/App/build/Payload
cp -R ios/App/build/Build/Products/Release-iphoneos/App.app ios/App/build/Payload/
(cd ios/App/build && zip -r -q ../../../Twogether.ipa Payload)

echo "✅ Selesai! File installer siap:"
echo "👉 $(pwd)/Twogether.ipa"
echo ""
echo "Cara install ke SideStore:"
echo "1. Kirim Twogether.ipa ke iPhone (AirDrop / iCloud Drive / Safari)."
echo "2. Buka SideStore di iPhone -> tab 'My Apps' -> klik icon '+' di kiri atas."
echo "3. Pilih Twogether.ipa. SideStore akan sign & install otomatis!"
