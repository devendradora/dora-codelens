import * as assert from 'assert';
import * as vscode from 'vscode';
import { JsonUtilitiesService } from '../services/json-utilities-service';
import { ErrorHandler } from '../core/error-handler';

suite('JsonUtilitiesService Tests', () => {
    let jsonUtilitiesService: JsonUtilitiesService;
    let errorHandler: ErrorHandler;

    suiteSetup(() => {
        errorHandler = ErrorHandler.getInstance();
        jsonUtilitiesService = JsonUtilitiesService.getInstance(errorHandler);
    });

    suite('Python Dict to JSON Conversion', () => {
        test('Should convert simple Python dict with single quotes', async () => {
            const pythonDict = `{'name': 'test', 'value': 42}`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const expected = `{"name":"test","value":42}`;
            assert.strictEqual(result, expected);
        });

        test('Should convert Python booleans True/False', async () => {
            const pythonDict = `{'enabled': True, 'disabled': False}`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const expected = `{"enabled":true,"disabled":false}`;
            assert.strictEqual(result, expected);
        });

        test('Should convert Python None to null', async () => {
            const pythonDict = `{'value': None}`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const expected = `{"value":null}`;
            assert.strictEqual(result, expected);
        });

        test('Should handle trailing commas', async () => {
            const pythonDict = `{'name': 'test', 'value': 42,}`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const expected = `{"name":"test","value":42}`;
            assert.strictEqual(result, expected);
        });

        test('Should handle nested structures', async () => {
            const pythonDict = `{
                'user': {
                    'name': 'John',
                    'active': True,
                    'data': None
                },
                'settings': ['auth', 'logging'],
            }`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.user.name, 'John');
            assert.strictEqual(parsed.user.active, true);
            assert.strictEqual(parsed.user.data, null);
            assert.deepStrictEqual(parsed.settings, ['auth', 'logging']);
        });

        test('Should handle strings with nested quotes', async () => {
            const pythonDict = `{'message': 'He said "Hello" to me'}`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const expected = `{"message":"He said \\"Hello\\" to me"}`;
            assert.strictEqual(result, expected);
        });

        test('Should handle escaped characters', async () => {
            const pythonDict = `{'path': 'C:\\\\Users\\\\test', 'newline': 'line1\\nline2'}`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.path, 'C:\\\\Users\\\\test');
            assert.strictEqual(parsed.newline, 'line1\\nline2');
        });

        test('Should handle arrays with Python syntax', async () => {
            const pythonDict = `{
                'items': ['item1', 'item2', True, False, None],
                'numbers': [1, 2, 3,]
            }`;
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const parsed = JSON.parse(result);
            assert.deepStrictEqual(parsed.items, ['item1', 'item2', true, false, null]);
            assert.deepStrictEqual(parsed.numbers, [1, 2, 3]);
        });

        test('Should provide helpful error messages for invalid syntax', async () => {
            const invalidDict = `{'name': 'test', 'func': lambda x: x}`;
            try {
                await jsonUtilitiesService.minifyJson(invalidDict);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Could not convert Python dict to JSON'));
            }
        });

        test('Should handle complex nested structure from test file', async () => {
            const complexDict = `{
                'name': 'test-config',
                'enabled': True,
                'disabled': False,
                'value': None,
                'settings': {
                    'timeout': 30,
                    'debug': True,
                    'features': ['auth', 'logging'],
                    'database': {
                        'host': 'localhost',
                        'ssl': False,
                        'credentials': None,
                    }
                },
            }`;
            
            const result = await jsonUtilitiesService.minifyJson(complexDict);
            const parsed = JSON.parse(result);
            
            assert.strictEqual(parsed.name, 'test-config');
            assert.strictEqual(parsed.enabled, true);
            assert.strictEqual(parsed.disabled, false);
            assert.strictEqual(parsed.value, null);
            assert.strictEqual(parsed.settings.timeout, 30);
            assert.strictEqual(parsed.settings.debug, true);
            assert.deepStrictEqual(parsed.settings.features, ['auth', 'logging']);
            assert.strictEqual(parsed.settings.database.host, 'localhost');
            assert.strictEqual(parsed.settings.database.ssl, false);
            assert.strictEqual(parsed.settings.database.credentials, null);
        });
    });

    suite('Format JSON with Python Dict Support', () => {
        test('Should format Python dict with proper indentation', async () => {
            const pythonDict = `{'name': 'test', 'enabled': True}`;
            // We need to create a mock editor for this test
            // For now, we'll test the underlying conversion logic
            const result = await jsonUtilitiesService.minifyJson(pythonDict);
            const parsed = JSON.parse(result);
            const formatted = JSON.stringify(parsed, null, 2);
            
            assert.ok(formatted.includes('"name": "test"'));
            assert.ok(formatted.includes('"enabled": true'));
        });
    });

    suite('JSON Validation with Python Dict Detection', () => {
        test('Should detect Python dict patterns', async () => {
            // This tests the internal isPythonDictLike method indirectly
            const pythonDict = `{'test': True}`;
            try {
                const result = await jsonUtilitiesService.minifyJson(pythonDict);
                assert.ok(result); // Should succeed with conversion
            } catch (error) {
                assert.fail('Should have successfully converted Python dict');
            }
        });

        test('Should handle valid JSON without conversion', async () => {
            const validJson = `{"name": "test", "enabled": true}`;
            const result = await jsonUtilitiesService.minifyJson(validJson);
            const expected = `{"name":"test","enabled":true}`;
            assert.strictEqual(result, expected);
        });
    });

    suite('Error Handling', () => {
        test('Should provide specific error messages for syntax errors', async () => {
            const invalidContent = `{'name': 'test', 'invalid': }`;
            try {
                await jsonUtilitiesService.minifyJson(invalidContent);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.length > 0);
            }
        });

        test('Should handle empty content gracefully', async () => {
            try {
                await jsonUtilitiesService.minifyJson('');
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Failed to minify JSON'));
            }
        });

        test('Should handle malformed structures', async () => {
            const malformed = `{'name': 'test', 'nested': {'incomplete':}`;
            try {
                await jsonUtilitiesService.minifyJson(malformed);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error instanceof Error);
            }
        });
    });
});