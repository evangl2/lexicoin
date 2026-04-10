/**
 * Security test for APIClient logging
 */
import { apiClient } from '../core/infra/APIClient.ts';
import { logger } from '../utils/logger.ts';

async function runTest() {
    console.log('Starting API security test...');

    // Mock fetch
    const mockData = {
        message: 'Unauthorized access',
        secretToken: 'SENSITIVE_PII_DATA_12345',
        user: {
            email: 'user@example.com',
            password: 'hashed_password'
        }
    };

    (global as any).fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => mockData
    });

    // Mock logger
    let capturedData: any = null;
    const originalError = logger.error;
    logger.error = (message: string, data?: any) => {
        capturedData = data;
    };

    try {
        await apiClient.synthesize({
            userId: 'test-user',
            inputSenseIds: []
        } as any);

        console.log('Captured error data:', capturedData);

        const hasSensitiveData = JSON.stringify(capturedData).includes('SENSITIVE_PII_DATA_12345') ||
                                JSON.stringify(capturedData).includes('user@example.com');

        if (hasSensitiveData) {
            console.error('❌ FAIL: Sensitive data was logged!');
            process.exit(1);
        } else {
            console.log('✅ PASS: No sensitive data was logged.');
        }
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    } finally {
        logger.error = originalError;
    }
}

// In a real environment, we would run this.
// Since we might not have a full test runner available, this is provided for manual verification or CI.
console.log('Test script created. Run with: npx sucrase-node src/tests/api_security.test.ts');

runTest();
