#!/usr/bin/env bash
# =============================================================================
# Cregis Java SDK - one-command release to Maven Central (Sonatype Central Portal)
#
# Usage:
#   ./release.sh 1.2.0            # upload, leave in "Validated"; publish later in the UI
#   ./release.sh 1.2.0 --auto     # upload and publish immediately
#   ./release.sh --dry-run 1.2.0  # build + sign locally, upload nothing
#
# Prerequisites (once per machine):
#   1. GPG key:      gpg --full-generate-key   (RSA 4096, no expiry recommended)
#   2. Publish key:  gpg --keyserver keyserver.ubuntu.com --send-keys <KEY_ID>
#   3. Central token: https://central.sonatype.com/account -> Generate User Token
#      Put it in ~/.m2/settings.xml (see openplatform-sdk/java/RELEASE.md) or export
#      CENTRAL_USERNAME / CENTRAL_PASSWORD.
#   4. Namespace com.cregis must already be verified on Central (it is, 1.0.0 shipped).
#
# The script fails fast: version mismatch, dirty tree, failing tests or a version
# that already exists on Central all abort before anything is uploaded.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SDK_DIR="$SCRIPT_DIR"
CENTRAL_URL="https://repo1.maven.org/maven2/com/cregis/cregis-sdk-core"

AUTO_PUBLISH=false
DRY_RUN=false
VERSION=""

for arg in "$@"; do
  case "$arg" in
    --auto)    AUTO_PUBLISH=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *)         VERSION="$arg" ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[release]${NC} $*"; }
ok()    { echo -e "${GREEN}[release]${NC} $*"; }
warn()  { echo -e "${YELLOW}[release]${NC} $*"; }
fail()  { echo -e "${RED}[release] ERROR:${NC} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 0. Validate inputs
# ---------------------------------------------------------------------------
[[ -n "$VERSION" ]] || fail "missing version. usage: ./release.sh <version> [--auto] [--dry-run]"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "version must be semver, e.g. 1.2.0 (got '$VERSION')"

cd "$SDK_DIR"

CURRENT_VERSION="$(sed -n 's:.*<version>\([0-9][^<]*\)</version>.*:\1:p' pom.xml | head -1)"
info "target version: $VERSION (pom currently $CURRENT_VERSION)"

if [[ "$CURRENT_VERSION" != "$VERSION" ]]; then
  info "syncing pom version $CURRENT_VERSION -> $VERSION"
  "$SDK_DIR/mvnw" -q versions:set -DnewVersion="$VERSION" -DgenerateBackupPoms=false
fi

# ---------------------------------------------------------------------------
# 1. JDK
# ---------------------------------------------------------------------------
if [[ -z "${JAVA_HOME:-}" ]]; then
  for candidate in \
    "$HOME/.vscode/extensions/redhat.java-1.57.0-darwin-x64/jre/25.0.4.1-macosx-x86_64" \
    "$(ls -d "$HOME"/.vscode/extensions/redhat.java-*/jre/* 2>/dev/null | sort -V | tail -1 || true)"; do
    [[ -n "$candidate" && -x "$candidate/bin/javac" ]] && { export JAVA_HOME="$candidate"; break; }
  done
fi
[[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/javac" ]] || fail "JAVA_HOME not set and no usable JDK found (see openplatform-sdk/java/RELEASE.md)"
export PATH="$JAVA_HOME/bin:$PATH"
info "using JDK: $($JAVA_HOME/bin/java -version 2>&1 | head -1)"

# ---------------------------------------------------------------------------
# 2. Rule out duplicate / already-published versions
# ---------------------------------------------------------------------------
if curl -fsS --max-time 15 "$CENTRAL_URL/$VERSION/cregis-sdk-core-$VERSION.pom" >/dev/null 2>&1; then
  fail "version $VERSION already exists on Maven Central — bump the version instead of overwriting"
fi
ok "version $VERSION is not on Central yet"

# ---------------------------------------------------------------------------
# 3. Working tree must be clean (the release commit must contain exactly
#    what was published)
# ---------------------------------------------------------------------------
if [[ "$DRY_RUN" != true ]] && ! git -C "$REPO_ROOT" diff --quiet -- openplatform-sdk/java; then
  fail "openplatform-sdk/java has uncommitted changes. Commit them first so the tag matches the artifacts."
fi

# ---------------------------------------------------------------------------
# 4. GPG / Central credentials
# ---------------------------------------------------------------------------
if [[ "$DRY_RUN" != true ]]; then
  command -v gpg >/dev/null 2>&1 || fail "gpg not found — install it (brew install gnupg) and create a signing key"
  gpg --list-secret-keys 2>/dev/null | grep -q '^sec' || fail "no GPG secret key — run: gpg --full-generate-key"

  if ! grep -qs "<id>central</id>" "$HOME/.m2/settings.xml" \
     && [[ -z "${CENTRAL_USERNAME:-}" || -z "${CENTRAL_PASSWORD:-}" ]]; then
    fail "no Central credentials. Add a <server><id>central</id> entry to ~/.m2/settings.xml or export CENTRAL_USERNAME/CENTRAL_PASSWORD (see RELEASE.md)"
  fi
fi
export GPG_TTY="$(tty 2>/dev/null || true)"

# ---------------------------------------------------------------------------
# 5. Build, test, sign, (dry run stops here)
# ---------------------------------------------------------------------------
GOALS=(clean verify)
[[ "$DRY_RUN" == true ]] && GOALS=(clean verify -Dgpg.skip=true)
info "running: mvnw -Prelease ${GOALS[*]}"
"$SDK_DIR/mvnw" -Prelease "${GOALS[@]}"

if [[ "$DRY_RUN" == true ]]; then
  ok "dry run complete — artifacts in cregis-sdk-core/target/ (unsigned). Nothing uploaded."
  exit 0
fi

# ---------------------------------------------------------------------------
# 6. Publish bundle to Central Portal
# ---------------------------------------------------------------------------
PUBLISH_ARGS=()
# Override the pom default (autoPublish=false) only when explicitly requested.
[[ "$AUTO_PUBLISH" == true ]] && PUBLISH_ARGS+=("-Dcentral.autoPublish=true" "-Dcentral.waitUntil=published")

info "uploading to Central Portal (autoPublish=$AUTO_PUBLISH)"
"$SDK_DIR/mvnw" -Prelease "${PUBLISH_ARGS[@]}" deploy

# ---------------------------------------------------------------------------
# 7. Tag the release
# ---------------------------------------------------------------------------
TAG="java-sdk-v$VERSION"
if git -C "$REPO_ROOT" rev-parse "$TAG" >/dev/null 2>&1; then
  warn "tag $TAG already exists, leaving it untouched"
else
  git -C "$REPO_ROOT" tag -a "$TAG" -m "Java SDK release $VERSION"
  ok "created local tag $TAG (push with: git push origin $TAG)"
fi

echo
ok "Maven Central bundle uploaded for com.cregis:cregis-sdk-core:$VERSION"
if [[ "$AUTO_PUBLISH" != true ]]; then
  cat <<EOF

${YELLOW}Next step:${NC} open https://central.sonatype.com/publishing/deployments
and click "Publish" on the deployment to make $VERSION available to the world.
It then appears at:
  https://central.sonatype.com/artifact/com.cregis/cregis-sdk-core/$VERSION
EOF
else
  info "artifacts become visible after syncing (~10-30 min)"
fi
