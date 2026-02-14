#!/bin/bash

# ElectroSim Comprehensive Test Runner
# Executes all test suites and generates coverage reports

set -e

echo "🔬 ElectroSim Test Suite Runner"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if arguments provided
COVERAGE_MODE=${1:-"basic"}
WATCH_MODE=${2:-"false"}

print_status "Starting test execution with coverage mode: $COVERAGE_MODE"

# Create coverage directory if it doesn't exist
mkdir -p coverage

# Function to run unit tests
run_unit_tests() {
    print_status "Running Unit Tests..."
    
    if [[ $COVERAGE_MODE == "full" ]]; then
        npm run test:coverage
    else
        npm run test -- --testPathIgnorePatterns="e2e/"
    fi
    
    if [[ $? -eq 0 ]]; then
        print_success "Unit tests completed"
    else
        print_warning "Some unit tests failed - continuing with E2E tests"
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running End-to-End Tests..."
    
    # Check if dev server is running
    if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_status "Starting development server for E2E tests..."
        npm run dev:renderer &
        DEV_SERVER_PID=$!
        
        # Wait for server to start
        for i in {1..30}; do
            if curl -s http://localhost:3001 > /dev/null 2>&1; then
                print_success "Development server ready"
                break
            fi
            sleep 2
        done
    fi
    
    # Run Playwright tests
    npx playwright test --reporter=html
    
    if [[ $? -eq 0 ]]; then
        print_success "E2E tests completed"
    else
        print_warning "Some E2E tests failed"
    fi
    
    # Clean up dev server if we started it
    if [[ ! -z ${DEV_SERVER_PID} ]]; then
        kill $DEV_SERVER_PID 2>/dev/null || true
    fi
}

# Function to run linting
run_linting() {
    print_status "Running Code Linting..."
    
    npm run lint
    
    if [[ $? -eq 0 ]]; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found"
    fi
}

# Function to run type checking
run_type_checking() {
    print_status "Running TypeScript Type Checking..."
    
    npm run type-check
    
    if [[ $? -eq 0 ]]; then
        print_success "Type checking passed"
    else
        print_warning "Type checking issues found"
    fi
}

# Function to generate test reports
generate_reports() {
    print_status "Generating Test Reports..."
    
    # Create reports directory
    mkdir -p reports
    
    # Copy coverage reports
    if [[ -d "coverage" ]]; then
        cp -r coverage reports/
        print_success "Coverage report available at: reports/coverage/index.html"
    fi
    
    # Copy Playwright reports
    if [[ -d "playwright-report" ]]; then
        cp -r playwright-report reports/
        print_success "E2E test report available at: reports/playwright-report/index.html"
    fi
    
    # Generate test summary
    echo "# ElectroSim Test Execution Summary" > reports/test-summary.md
    echo "Generated on: $(date)" >> reports/test-summary.md
    echo "" >> reports/test-summary.md
    
    if [[ -f "coverage/coverage-summary.json" ]]; then
        echo "## Coverage Summary" >> reports/test-summary.md
        echo '```json' >> reports/test-summary.md
        cat coverage/coverage-summary.json >> reports/test-summary.md
        echo '```' >> reports/test-summary.md
    fi
}

# Function to run all tests
run_all_tests() {
    local start_time=$(date +%s)
    
    print_status "Running complete test suite..."
    
    # Run type checking first
    run_type_checking
    
    # Run linting
    run_linting
    
    # Run unit tests
    run_unit_tests
    
    # Run E2E tests
    run_e2e_tests
    
    # Generate reports
    generate_reports
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_success "All tests completed in ${duration} seconds"
    
    # Open coverage report if in full coverage mode
    if [[ $COVERAGE_MODE == "full" && -f "coverage/index.html" ]]; then
        print_status "Opening coverage report..."
        if command -v open &> /dev/null; then
            open coverage/index.html
        elif command -v xdg-open &> /dev/null; then
            xdg-open coverage/index.html
        fi
    fi
}

# Function to run tests in watch mode
run_watch_mode() {
    print_status "Starting test watch mode..."
    print_status "Press Ctrl+C to exit"
    
    if [[ $COVERAGE_MODE == "unit" ]]; then
        npm run test:watch
    else
        npm run test:watch &
        UNIT_WATCH_PID=$!
        
        # Watch E2E tests (requires manual restart)
        print_status "Unit tests watching... E2E tests require manual execution"
        wait $UNIT_WATCH_PID
    fi
}

# Main execution logic
case $COVERAGE_MODE in
    "unit")
        print_status "Running unit tests only"
        run_unit_tests
        ;;
    "e2e")
        print_status "Running E2E tests only"
        run_e2e_tests
        ;;
    "lint")
        print_status "Running linting and type checking only"
        run_type_checking
        run_linting
        ;;
    "full")
        print_status "Running complete test suite with full coverage"
        run_all_tests
        ;;
    *)
        print_status "Running basic test suite"
        run_type_checking
        run_unit_tests
        generate_reports
        ;;
esac

# Handle watch mode
if [[ $WATCH_MODE == "true" ]]; then
    run_watch_mode
fi

print_success "Test execution completed!"
echo ""
echo "📊 View test results:"
echo "  • Coverage Report: coverage/index.html"
echo "  • E2E Test Report: playwright-report/index.html"
echo "  • Test Summary: reports/test-summary.md"
echo ""
echo "🔄 Re-run options:"
echo "  • Full coverage: ./run-tests.sh full"
echo "  • Unit tests only: ./run-tests.sh unit" 
echo "  • E2E tests only: ./run-tests.sh e2e"
echo "  • Watch mode: ./run-tests.sh basic true"