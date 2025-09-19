#!/bin/bash

# ElectroSim Project Labels Setup Script
echo "🏷️  Setting up ElectroSim project labels..."

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Create key labels
gh api repos/jmassardo/electrosim/labels --method POST --field name="high-priority" --field color="d73a4a" --field description="Critical issues that must be completed on schedule" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="medium-priority" --field color="fbca04" --field description="Important issues with moderate timeline flexibility" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="low-priority" --field color="0e8a16" --field description="Nice-to-have features with flexible timeline" || echo "Label may already exist"

gh api repos/jmassardo/electrosim/labels --method POST --field name="phase-1" --field color="1f77b4" --field description="Foundation & Core Infrastructure" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="phase-2" --field color="ff7f0e" --field description="Basic Simulation Core" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="phase-3" --field color="2ca02c" --field description="Enhanced Components & Features" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="phase-4" --field color="d62728" --field description="Communication & Advanced Simulation" || echo "Label may already exist"

gh api repos/jmassardo/electrosim/labels --method POST --field name="architecture" --field color="9467bd" --field description="System architecture and design patterns" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="components" --field color="8c564b" --field description="Electronic component implementation" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="ui" --field color="e377c2" --field description="User interface and React components" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="simulation" --field color="7f7f7f" --field description="Simulation engine and physics" || echo "Label may already exist"
gh api repos/jmassardo/electrosim/labels --method POST --field name="testing" --field color="17becf" --field description="Testing framework and test cases" || echo "Label may already exist"

echo "🎉 Key labels created! View at: https://github.com/jmassardo/electrosim/labels"
