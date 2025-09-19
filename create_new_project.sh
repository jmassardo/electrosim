#!/bin/bash

# ElectroSim GitHub Project (new) Setup Script
echo "📋 Creating ElectroSim Project using new GitHub Projects..."

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Create a new project using GitHub's new Projects
echo "🚀 Creating new project..."

# Create the project
gh project create --title "ElectroSim Development" --body "Arduino Simulator - 18 Month Development Timeline"

echo ""
echo "🎉 Project created successfully!"
echo ""
echo "📋 Manual Steps Required:"
echo "  1. Go to https://github.com/jmassardo/electrosim"
echo "  2. Click on 'Projects' tab"
echo "  3. Open your 'ElectroSim Development' project"
echo "  4. Add your issues to the project"
echo "  5. Organize them by milestones and phases"
echo ""
echo "💡 Project Features Available:"
echo "  • Kanban board view"
echo "  • Timeline/roadmap view"
echo "  • Filter by milestone, assignee, labels"
echo "  • Custom fields and properties"
echo "  • Automation rules"
echo ""
