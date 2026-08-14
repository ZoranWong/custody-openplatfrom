/**
 * escapeHtml Utility Tests
 * Verifies XSS protection via HTML entity escaping
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
    describe('XSS prevention', () => {
        it('should escape <script> tags', () => {
            const input = '<script>alert("XSS")</script>';
            const result = escapeHtml(input);

            expect(result).not.toContain('<script>');
            expect(result).not.toContain('</script>');
            expect(result).toContain('&lt;script&gt;');
            expect(result).toContain('&lt;/script&gt;');
        });

        it('should escape <img> tags with event handlers', () => {
            const input = '<img src=x onerror="alert(1)">';
            const result = escapeHtml(input);

            // The key XSS protection: < and > are escaped, so the browser
            // treats the entire tag as text, not as an HTML element
            expect(result).not.toContain('<img');
            expect(result).not.toContain('<img');
            expect(result).toContain('&lt;img');
            expect(result).toContain('&gt;');
            // The double quotes inside the attribute are also escaped
            expect(result).toContain('&quot;alert(1)&quot;');
        });

        it('should escape & ampersand', () => {
            const input = 'Tom & Jerry';
            const result = escapeHtml(input);

            expect(result).not.toContain(' & ');
            expect(result).toContain('&amp;');
        });

        it('should escape " double quotes', () => {
            const input = 'He said "hello"';
            const result = escapeHtml(input);

            expect(result).not.toContain('"hello"');
            expect(result).toContain('&quot;hello&quot;');
        });

        it("should escape ' single quotes", () => {
            const input = "It's a test";
            const result = escapeHtml(input);

            expect(result).not.toContain("'");
            expect(result).toContain('&#x27;');
        });

        it('should escape > greater-than sign', () => {
            const input = 'a > b';
            const result = escapeHtml(input);

            expect(result).not.toContain('>');
            expect(result).toContain('&gt;');
        });

        it('should escape < less-than sign', () => {
            const input = 'a < b';
            const result = escapeHtml(input);

            expect(result).not.toContain('<');
            expect(result).toContain('&lt;');
        });
    });

    describe('safe strings', () => {
        it('should not modify safe strings', () => {
            const input = 'Hello World';
            const result = escapeHtml(input);

            expect(result).toBe('Hello World');
        });

        it('should not modify alphanumeric strings', () => {
            const input = 'Test123_ABC';
            const result = escapeHtml(input);

            expect(result).toBe('Test123_ABC');
        });

        it('should not modify strings with common punctuation', () => {
            const input = 'Hello, world! How are you?';
            const result = escapeHtml(input);

            // Commas, exclamation marks, question marks, spaces are safe
            expect(result).toBe('Hello, world! How are you?');
        });

        it('should not modify numbers', () => {
            const input = '12345';
            const result = escapeHtml(input);

            expect(result).toBe('12345');
        });
    });

    describe('edge cases', () => {
        it('should handle empty strings', () => {
            const result = escapeHtml('');

            expect(result).toBe('');
        });

        it('should handle null by returning empty string', () => {
            const result = escapeHtml(null as unknown as string);

            expect(result).toBe('');
        });

        it('should handle undefined by returning empty string', () => {
            const result = escapeHtml(undefined as unknown as string);

            expect(result).toBe('');
        });

        it('should handle strings with only special characters', () => {
            const input = '<>&"\'';
            const result = escapeHtml(input);

            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).not.toContain('"');
            expect(result).not.toContain("'");
            // Verify all chars were escaped to their entity forms
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
            expect(result).toContain('&amp;');
            expect(result).toContain('&quot;');
            expect(result).toContain('&#x27;');
        });

        it('should handle very long strings', () => {
            const input = '<script>'.repeat(1000);
            const result = escapeHtml(input);

            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;script&gt;');
            expect(result.length).toBeGreaterThan(input.length);
        });

        it('should handle unicode characters', () => {
            const input = '你好世界';
            const result = escapeHtml(input);

            expect(result).toBe('你好世界');
        });

        it('should handle mixed safe and unsafe characters', () => {
            const input = 'User <bob@example.com> said "hello"';
            const result = escapeHtml(input);

            expect(result).toContain('User ');
            expect(result).not.toContain('<bob@example.com>');
            expect(result).not.toContain('"hello"');
            expect(result).toContain('&lt;bob@example.com&gt;');
            expect(result).toContain('&quot;hello&quot;');
        });
    });
});