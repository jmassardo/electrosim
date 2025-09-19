#!/bin/bash

# ElectroSim Project Milestone Setup Script
# This script creates all project milestones and assigns issues to them
# Compatible with bash 3.0+ (macOS default)

set -e  # Exit on any error

echo "�� Setting up ElectroSim project milestones..."

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh  # macOS"
    echo "   or visit: https://cli.github.com/"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI is not authenticated. Please run:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Define milestones with title, description, and due date
declare -a milestones=(
  "Phase 1: Foundation Complete|Complete development environment, application shell, canvas system, component architecture, AVR integration, and testing framework|2025-12-18T23:59:59Z"
  "Phase 2: Basic Simulation Complete|Arduino Uno simulation, basic components (LED, resistors, switches), wire system, and core simulation engine|2026-03-18T23:59:59Z"
  "Phase 3: Enhanced Features Complete|Extended Arduino boards, sensors, displays, code editor, compilation system, and project management|2026-06-18T23:59:59Z"
  "Phase 4: Advanced Features Complete|Serial communication, protocols (I2C, SPI), debugging features, performance optimization, and comprehensive testing|2026-09-18T23:59:59Z"
  "Headless Mode Ready|CLI interface, test runner, assertion engine, and educational grading system complete|2026-10-18T23:59:59Z"
  "Virtual Serial Port Ready|Cross-platform virtual COM ports and Arduino UART bridging functional|2026-11-18T23:59:59Z"
  "Beta Release|Feature-complete beta version with documentation, packaging, and distribution ready|2026-12-18T23:59:59Z"
  "Production Release|Production-ready ElectroSim with all features, security, optimization, and comprehensive testing complete|2027-03-18T23:59:59Z"
)

# Create milestones and store their numbers in a temporary file
milestone_map_file=$(mktemp)

echo ""
echo "📋 Creating milestones..."

for milestone in "${milestones[@]}"; do
  IFS='|' read -r title description due_date <<< "$milestone"
  echo "  Creating: $title"
  
  # Create milestone and capture the number
  milestone_number=$(gh api repos/jmassardo/electrosim/milestones \
    --method POST \
    --field title="$title" \
    --field description="$description" \
    --field due_on="$due_date" \
    --field state="open" \
    --jq '.number')
  
  # Store mapping in temp file
  echo "$title|$milestone_number" >> "$milestone_map_file"
  echo "    ✅ Created milestone #$milestone_number"
done

# Function to get milestone number by title
get_milestone_number() {
  local title="$1"
  grep "^$title|" "$milestone_map_file" | cut -d'|' -f2
}

echo ""
echo "📌 Assigning issues to milestones..."

# Define issue assignments (issue_number:milestone_title)
declare -a issue_assignments=(
  # Phase 1 issues (1-6)
  "1:Phase 1: Foundation Complete"
  "2:Phase 1: Foundation Complete"
  "3:Phase 1: Foundation Complete"
  "4:Phase 1: Foundation Complete"
  "5:Phase 1: Foundation Complete"
  "6:Phase 1: Foundation Complete"
  
  # Phase 2 issues (7-12)
  "7:Phase 2: Basic Simulation Complete"
  "8:Phase 2: Basic Simulation Complete"
  "9:Phase 2: Basic Simulation Complete"
  "10:Phase 2: Basic Simulation Complete"
  "11:Phase 2: Basic Simulation Complete"
  "12:Phase 2: Basic Simulation Complete"
  
  # Phase 3 issues (13-18)
  "13:Phase 3: Enhanced Features Complete"
  "14:Phase 3: Enhanced Features Complete"
  "15:Phase 3: Enhanced Features Complete"
  "16:Phase 3: Enhanced Features Complete"
  "17:Phase 3: Enhanced Features Complete"
  "18:Phase 3: Enhanced Features Complete"
  
  # Phase 4 issues (19-25)
  "19:Phase 4: Advanced Features Complete"
  "20:Phase 4: Advanced Features Complete"
  "21:Phase 4: Advanced Features Complete"
  "22:Phase 4: Advanced Features Complete"
  "23:Phase 4: Advanced Features Complete"
  "24:Phase 4: Advanced Features Complete"
  "25:Phase 4: Advanced Features Complete"
  
  # Headless Mode issues (26-28)
  "26:Headless Mode Ready"
  "27:Headless Mode Ready"
  "28:Headless Mode Ready"
  
  # Virtual Serial Port issues (29-30)
  "29:Virtual Serial Port Ready"
  "30:Virtual Serial Port Ready"
  
  # Additional features for Beta Release (31-35)
  "31:Beta Release"
  "32:Beta Release"
  "33:Beta Release"
  "34:Beta Release"
  "35:Beta Release"
  
  # Security for Production Release
  "36:Production Release"
)

# Assign issues to milestones
for assignment in "${issue_assignments[@]}"; do
  IFS=':' read -r issue_number milestone_title <<< "$assignment"
  milestone_number=$(get_milestone_number "$milestone_title")
  
  echo "  Assigning issue #$issue_number to milestone #$milestone_number ($milestone_title)"
  
  # Use gh CLI to assign issue to milestone
  gh api repos/jmassardo/electrosim/issues/$issue_number \
    --method PATCH \
    --field milestone="$milestone_number" > /dev/null
  
  echo "    ✅ Issue #$issue_number assigned"
done

# Clean up temp file
rm "$milestone_map_file"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📊 Summary:"
echo "  • Created 8 milestones with dates spanning 18 months"
echo "  • Assigned 36 issues to appropriate milestones"
echo "  • Timeline: Sept 2025 → March 2027"
echo ""
echo "🔗 View your project milestones:"
echo "  https://github.com/jmassardo/electrosim/milestones"
echo ""
echo "�� Next steps:"
echo "  1. Create a GitHub Project board"
echo "  2. Add labels to issues for better organization"
echo "  3. Start development with Phase 1 issues!"
echo ""

# Display milestone summary
echo "📅 Milestone Timeline:"
echo "  Phase 1: Foundation Complete      - Dec 18, 2025 (3 months)"
echo "  Phase 2: Basic Simulation         - Mar 18, 2026 (6 months)" 
echo "  Phase 3: Enhanced Features        - Jun 18, 2026 (9 months)"
echo "  Phase 4: Advanced Features        - Sep 18, 2026 (12 months)"
echo "  Headless Mode Ready               - Oct 18, 2026 (13 months)"
echo "  Virtual Serial Port Ready         - Nov 18, 2026 (14 months)"
echo "  Beta Release                      - Dec 18, 2026 (15 months)"
echo "  Production Release                - Mar 18, 2027 (18 months)"
