/**
 * 钉钉签名验证测试
 */

import { describe, it, expect } from 'vitest';
import { computeSignature, verifyDingTalkSignature } from '../../src/bot/dingtalk-verify.js';

const TEST_SECRET = 'SEC_test_secret_key_123';

describe('computeSignature', () => {
  it('should produce a base64 string', () => {
    const sig = computeSignature('1711123456789', TEST_SECRET);
    expect(sig).toBeTruthy();
    // base64 encoded string
    expect(Buffer.from(sig, 'base64').toString('base64')).toBe(sig);
  });

  it('should produce different signatures for different timestamps', () => {
    const sig1 = computeSignature('1711123456789', TEST_SECRET);
    const sig2 = computeSignature('1711123456790', TEST_SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('should produce different signatures for different secrets', () => {
    const sig1 = computeSignature('1711123456789', 'secret1');
    const sig2 = computeSignature('1711123456789', 'secret2');
    expect(sig1).not.toBe(sig2);
  });
});

describe('verifyDingTalkSignature', () => {
  it('should verify a valid signature', () => {
    const timestamp = Date.now().toString();
    const sign = computeSignature(timestamp, TEST_SECRET);
    expect(verifyDingTalkSignature(timestamp, sign, TEST_SECRET)).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const timestamp = Date.now().toString();
    expect(verifyDingTalkSignature(timestamp, 'invalid_base64==', TEST_SECRET)).toBe(false);
  });

  it('should reject empty parameters', () => {
    expect(verifyDingTalkSignature('', 'sign', TEST_SECRET)).toBe(false);
    expect(verifyDingTalkSignature('123', '', TEST_SECRET)).toBe(false);
    expect(verifyDingTalkSignature('123', 'sign', '')).toBe(false);
  });

  it('should reject timestamps older than 1 hour', () => {
    const oldTimestamp = (Date.now() - 2 * 60 * 60 * 1000).toString();
    const sign = computeSignature(oldTimestamp, TEST_SECRET);
    expect(verifyDingTalkSignature(oldTimestamp, sign, TEST_SECRET)).toBe(false);
  });

  it('should accept timestamps within 1 hour', () => {
    const recentTimestamp = (Date.now() - 30 * 60 * 1000).toString();
    const sign = computeSignature(recentTimestamp, TEST_SECRET);
    expect(verifyDingTalkSignature(recentTimestamp, sign, TEST_SECRET)).toBe(true);
  });

  it('should reject non-numeric timestamps', () => {
    expect(verifyDingTalkSignature('not-a-number', 'sign', TEST_SECRET)).toBe(false);
  });
});
