/**
 * JUnit XML Test Report Formatter
 * Generates JUnit-compatible XML reports for CI/CD integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteResult, TestResult } from './TestResults';

export class JUnitXMLFormatter {
  /**
   * Format test suite results as JUnit XML
   */
  static format(result: TestSuiteResult): string {
    const timestamp = result.timestamp.toISOString();
    const hostname = require('os').hostname();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="${this.escapeXml(result.name)}" `;
    xml += `tests="${result.total}" `;
    xml += `failures="${result.failed}" `;
    xml += `skipped="${result.skipped}" `;
    xml += `time="${(result.duration / 1000).toFixed(3)}" `;
    xml += `timestamp="${timestamp}">\n`;

    xml += `  <testsuite name="${this.escapeXml(result.name)}" `;
    xml += `tests="${result.total}" `;
    xml += `failures="${result.failed}" `;
    xml += `skipped="${result.skipped}" `;
    xml += `time="${(result.duration / 1000).toFixed(3)}" `;
    xml += `timestamp="${timestamp}" `;
    xml += `hostname="${hostname}">\n`;

    // Add properties
    xml += '    <properties>\n';
    xml += `      <property name="platform" value="${process.platform}"/>\n`;
    xml += `      <property name="node_version" value="${process.version}"/>\n`;
    xml += '    </properties>\n';

    // Add test cases
    for (const test of result.tests) {
      xml += this.formatTestCase(test);
    }

    xml += '  </testsuite>\n';
    xml += '</testsuites>\n';

    return xml;
  }

  /**
   * Format individual test case
   */
  private static formatTestCase(test: TestResult): string {
    let xml = `    <testcase name="${this.escapeXml(test.name)}" `;
    xml += `classname="ArduinoTest" `;
    xml += `time="${(test.duration / 1000).toFixed(3)}"`;

    if (test.passed && !test.skipped) {
      xml += '/>\n';
    } else {
      xml += '>\n';

      if (test.skipped) {
        xml += '      <skipped/>\n';
      } else if (!test.passed) {
        xml += `      <failure message="${this.escapeXml(test.error || 'Test failed')}"`;
        xml += ` type="AssertionFailure">\n`;
        xml += `        ${this.escapeXml(test.error || 'Unknown failure')}\n`;
        if (test.stack) {
          xml += `        ${this.escapeXml(test.stack)}\n`;
        }
        xml += '      </failure>\n';
      }

      xml += '    </testcase>\n';
    }

    return xml;
  }

  /**
   * Save XML report to file
   */
  static async save(result: TestSuiteResult, filePath: string): Promise<void> {
    const xml = this.format(result);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, xml, 'utf8');
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}