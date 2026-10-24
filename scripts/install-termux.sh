#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# DroidOS - Termux One-Click Installer
# CasaOS-inspired Android Home Server Platform
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${PURPLE}┌──────────────────────────────────────────────┐${NC}"
echo -e "${PURPLE}│${NC}   ${BOLD}${CYAN}🤖 DroidOS - Termux Installer${NC}              ${PURPLE}│${NC}"
echo -e "${PURPLE}│${NC}   Turn your Android device into a Home Server ${PURPLE}│${NC}"
echo -e "${PURPLE}└──────────────────────────────────────────────┘${NC}"
echo ""

# 1. Environment validation
if [ -z "$PREFIX" ] || [ ! -d "/data/data/com.termux" ]; then
    echo -e "${YELLOW}[!] Warning: It appears you are not running this directly inside Termux.${NC}"
    echo -e "    Continuing installation anyway..."
else
    echo -e "${GREEN}[✓] Termux environment detected.${NC}"
fi

# 2. Prevent sleep (Wake Lock)
if command -v termux-wake-lock &> /dev/null; then
    echo -e "${CYAN}[*] Acquiring Termux Wake-Lock to keep server running in background...${NC}"
    termux-wake-lock
    echo -e "${GREEN}[✓] Wake-Lock acquired.${NC}"
fi

# 3. Setup shared storage (/sdcard access)
if [ ! -d "$HOME/storage" ] && command -v termux-setup-storage &> /dev/null; then
    echo -e "${YELLOW}[?] Granting shared storage access... (accept prompt on your screen)${NC}"
    termux-setup-storage
    sleep 2
fi

# 4. Update packages and install prerequisites
echo -e "${CYAN}[*] Updating package repositories...${NC}"
pkg update -y || apt update -y

echo -e "${CYAN}[*] Installing Node.js LTS, Git, and build tools...${NC}"
pkg install -y nodejs-lts git python make clang binutils || apt install -y nodejs git python3 build-essential

# Configure node-gyp for Termux native compilation (fixes better-sqlite3 android_ndk_path error)
mkdir -p "$HOME/.gyp"
echo "{'variables':{'android_ndk_path':''}}" > "$HOME/.gyp/include.gypi"
export GYP_DEFINES="android_ndk_path=''"

# Verify node
NODE_VERSION=$(node -v 2>/dev/null || echo "not found")
echo -e "${GREEN}[✓] Node.js installed: ${NODE_VERSION}${NC}"

# 5. Determine script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# 6. Ensure latest updates from GitHub if inside a repo
if [ -d ".git" ]; then
    echo -e "${CYAN}[*] Syncing latest updates from GitHub...${NC}"
    git fetch origin main 2>/dev/null || true
    git reset --hard origin/main 2>/dev/null || true
fi

# 7. Install npm dependencies
echo -e "${CYAN}[*] Installing DroidOS project dependencies...${NC}"
npm install --no-audit

# 8. Build shared library and dashboard
echo -e "${CYAN}[*] Building DroidOS shared packages and React Dashboard...${NC}"
npm run build

# 8. Create global executable link
chmod +x bin/droidos.mjs
if [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
    ln -sf "$PROJECT_DIR/bin/droidos.mjs" "$PREFIX/bin/droidos"
    echo -e "${GREEN}[✓] Linked 'droidos' command to $PREFIX/bin/droidos${NC}"
elif [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
    ln -sf "$PROJECT_DIR/bin/droidos.mjs" "/usr/local/bin/droidos"
    echo -e "${GREEN}[✓] Linked 'droidos' command to /usr/local/bin/droidos${NC}"
fi

# 9. Get local network IP
IP_ADDR=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1 || echo "localhost")

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN}✨ DroidOS installation completed successfully!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${BOLD}To start DroidOS right now:${NC}"
echo -e "  ${CYAN}droidos start -d${NC}       (run as background service)"
echo -e "  ${CYAN}droidos start${NC}          (run in foreground with live logs)"
echo ""
echo -e "${BOLD}To manage DroidOS:${NC}"
echo -e "  ${CYAN}droidos status${NC}         (check server health and uptime)"
echo -e "  ${CYAN}droidos logs${NC}           (view real-time activity)"
echo -e "  ${CYAN}droidos stop${NC}           (stop the server)"
echo ""
echo -e "${BOLD}Access the Web Dashboard:${NC}"
echo -e "  ${YELLOW}http://localhost:8080${NC} (on this Android device)"
echo -e "  ${YELLOW}http://${IP_ADDR}:8080${NC} (from PC or phone on same Wi-Fi)"
echo ""
