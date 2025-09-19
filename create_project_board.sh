#!/bin/bash

# ElectroSim GitHub Project Board Setup Script
echo "📋 Creating ElectroSim Project Board..."

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Create a new project board (using GitHub's new Projects beta)
echo "🚀 Creating project board..."

# Note: GitHub's new Projects (beta) uses a different API
# This creates a classic project board
PROJECT_ID=$(gh api repos/jmassardo/electrosim/projects \
  --method POST \
  --field name="ElectroSim Development" \
  --field body="Arduino Simulator - 18 Month Development Timeline" \
  --jq '.id')

echo "✅ Created project board #$PROJECT_ID"

# Create columns for the project board
echo "📝 Creating project columns..."

# Backlog column
BACKLOG_ID=$(gh api repos/jmassardo/electrosim/projects/$PROJECT_ID/columns \
  --method POST \
  --field name="📋 Backlog" \
  --jq '.id')
echo "  ✅ Created 'Backlog' column"

# To Do column  
TODO_ID=$(gh api repos/jmassardo/electrosim/projects/$PROJECT_ID/columns \
  --method POST \
  --field name="📝 To Do" \
  --jq '.id')
echo "  ✅ Created 'To Do' column"

# In Progress column
PROGRESS_ID=$(gh api repos/jmassardo/electrosim/projects/$PROJECT_ID/columns \
  --method POST \
  --field name="🚧 In Progress" \
  --jq '.id')
echo "  ✅ Created 'In Progress' column"

# In Review column
REVIEW_ID=$(gh api repos/jmassardo/electrosim/projects/$PROJECT_ID/columns \
  --method POST \
  --field name="👀 In Review" \
  --jq '.id')
echo "  ✅ Created 'In Review' column"

# Done column
DONE_ID=$(gh api repos/jmassardo/electrosim/projects/$PROJECT_ID/columns \
  --method POST \
  --field name="✅ Done" \
  --jq '.id')
echo "  ✅ Created 'Done' column"

echo ""
echo "🎯 Adding issues to project board..."

# Add all issues to the Backlog column
for issue_num in {1..36}; do
  echo "  Adding issue #$issue_num to Backlog..."
  gh api repos/jmassardo/electrosim/projects/$PROJECT_ID/columns/$BACKLOG_ID/cards \
    --method POST \
    --field content_id=$(gh api repos/jmassardo/electrosim/issues/$issue_num --jq '.id') \
    --field content_type="Issue" > /dev/null
done

echo ""
echo "�� Project board setup complete!"
echo ""
echo "📊 Summary:"
echo "  • Created 'ElectroSim Development' project board"
echo "  • Added 5 workflow columns (Backlog → To Do → In Progress → In Review → Done)"
echo "  • Added all 36 issues to the Backlog column"
echo ""
echo "🔗 View your project board:"
echo "  https://github.com/jmassardo/electrosim/projects"
echo ""
echo "📋 Next steps:"
echo "  1. Move Phase 1 issues from Backlog to 'To Do'"
echo "  2. Start development by moving first issue to 'In Progress'"
echo "  3. Use the board to track progress through your 18-month timeline"
echo ""
