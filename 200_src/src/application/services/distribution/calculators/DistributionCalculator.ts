import { DistributionRecipient } from '../types/DistributionTypes';

export interface DistributionCalculation {
  totalAmount: number;
  totalRecipients: number;
  estimatedGasCost: number;
  estimatedDuration: number;
  batchBreakdown: BatchInfo[];
  riskAssessment: RiskAssessment;
}

export interface BatchInfo {
  batchNumber: number;
  recipientCount: number;
  totalAmount: number;
  estimatedGas: number;
}

export interface RiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
  recommendations: string[];
}

export class DistributionCalculator {
  private gasCostPerTransaction: number;
  private estimatedTimePerBatch: number;
  private batchSize: number;

  constructor(
    gasCostPerTransaction = 0.000005,
    estimatedTimePerBatch = 2,
    batchSize = 10
  ) {
    this.gasCostPerTransaction = gasCostPerTransaction;
    this.estimatedTimePerBatch = estimatedTimePerBatch;
    this.batchSize = batchSize;
  }

  calculateDistribution(recipients: DistributionRecipient[]): DistributionCalculation {
    const totalAmount = recipients.reduce((sum, recipient) => sum + recipient.amount, 0);
    const totalRecipients = recipients.length;
    const batchBreakdown = this.calculateBatches(recipients);
    const estimatedGasCost = totalRecipients * this.gasCostPerTransaction;
    const estimatedDuration = Math.ceil(totalRecipients / this.batchSize) * this.estimatedTimePerBatch;
    const riskAssessment = this.assessRisk(recipients, totalAmount);

    return {
      totalAmount,
      totalRecipients,
      estimatedGasCost,
      estimatedDuration,
      batchBreakdown,
      riskAssessment
    };
  }

  private calculateBatches(recipients: DistributionRecipient[]): BatchInfo[] {
    const batches: BatchInfo[] = [];
    const totalBatches = Math.ceil(recipients.length / this.batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * this.batchSize;
      const endIndex = Math.min(startIndex + this.batchSize, recipients.length);
      const batchRecipients = recipients.slice(startIndex, endIndex);

      const batchAmount = batchRecipients.reduce((sum, recipient) => sum + recipient.amount, 0);
      const estimatedGas = batchRecipients.length * this.gasCostPerTransaction;

      batches.push({
        batchNumber: i + 1,
        recipientCount: batchRecipients.length,
        totalAmount: batchAmount,
        estimatedGas
      });
    }

    return batches;
  }

  private assessRisk(recipients: DistributionRecipient[], totalAmount: number): RiskAssessment {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    // 大量配布の警告
    if (totalAmount > 100000) {
      warnings.push(`Large total amount: ${totalAmount.toLocaleString()}`);
      riskLevel = 'HIGH';
      recommendations.push('Consider splitting into multiple smaller distributions');
    } else if (totalAmount > 10000) {
      warnings.push(`Medium amount distribution: ${totalAmount.toLocaleString()}`);
      riskLevel = 'MEDIUM';
    }

    // 受信者数の警告
    if (recipients.length > 1000) {
      warnings.push(`Large number of recipients: ${recipients.length}`);
      riskLevel = 'HIGH';
      recommendations.push('Consider using batch processing');
    } else if (recipients.length > 100) {
      warnings.push(`Medium number of recipients: ${recipients.length}`);
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }

    // 小額配布の警告
    const smallAmounts = recipients.filter(r => r.amount < 0.001).length;
    if (smallAmounts > 0) {
      warnings.push(`${smallAmounts} recipients have very small amounts (< 0.001)`);
      recommendations.push('Verify that small amounts are intentional');
    }

    // 不均等分布の警告
    const amounts = recipients.map(r => r.amount);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    if (maxAmount / minAmount > 1000) {
      warnings.push('Large variance in distribution amounts');
      recommendations.push('Review distribution amounts for consistency');
    }

    return {
      riskLevel,
      warnings,
      recommendations
    };
  }

  setBatchSize(batchSize: number): void {
    this.batchSize = Math.max(1, Math.min(batchSize, 50)); // 1-50の範囲
  }

  setGasCostPerTransaction(cost: number): void {
    this.gasCostPerTransaction = Math.max(0, cost);
  }

  setEstimatedTimePerBatch(seconds: number): void {
    this.estimatedTimePerBatch = Math.max(1, seconds);
  }
}