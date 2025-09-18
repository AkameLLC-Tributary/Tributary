import { PublicKey } from '@solana/web3.js';
import { Wallet } from '../index';

describe('Wallet', () => {
  const testAddress = new PublicKey('So11111111111111111111111111111111111111112');
  const testBalance = 1000;

  describe('constructor', () => {
    it('should create wallet with address and balance', () => {
      const wallet = new Wallet(testAddress, testBalance);

      expect(wallet.address).toEqual(testAddress);
      expect(wallet.balance).toBe(testBalance);
    });
  });

  describe('getPercentage', () => {
    it('should calculate correct percentage', () => {
      const wallet = new Wallet(testAddress, testBalance);
      const totalSupply = 10000;

      const percentage = wallet.getPercentage(totalSupply);

      expect(percentage).toBe(10);
    });

    it('should handle zero total supply', () => {
      const wallet = new Wallet(testAddress, testBalance);
      const totalSupply = 0;

      const percentage = wallet.getPercentage(totalSupply);

      expect(percentage).toBe(Infinity);
    });

    it('should calculate percentage for fractional values', () => {
      const wallet = new Wallet(testAddress, 123.45);
      const totalSupply = 1000;

      const percentage = wallet.getPercentage(totalSupply);

      expect(percentage).toBeCloseTo(12.345);
    });
  });

  describe('toTokenHolder', () => {
    it('should convert to TokenHolder with correct percentage', () => {
      const wallet = new Wallet(testAddress, testBalance);
      const totalSupply = 10000;

      const tokenHolder = wallet.toTokenHolder(totalSupply);

      expect(tokenHolder.address).toEqual(testAddress);
      expect(tokenHolder.balance).toBe(testBalance);
      expect(tokenHolder.percentage).toBe(10);
    });

    it('should handle very small balances', () => {
      const wallet = new Wallet(testAddress, 0.001);
      const totalSupply = 1000000;

      const tokenHolder = wallet.toTokenHolder(totalSupply);

      expect(tokenHolder.balance).toBe(0.001);
      expect(tokenHolder.percentage).toBeCloseTo(0.0001);
    });
  });
});