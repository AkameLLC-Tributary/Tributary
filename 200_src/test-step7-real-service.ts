import { PublicKey, Keypair } from '@solana/web3.js';

// 実際のTributary DistributionServiceを直接使用
import { DistributionService } from './src/application/services/DistributionService';

// Tributaryの型定義を使用
import { DistributionRequest, TokenHolder } from './src/domain/types';

// テスト実行
async function main() {
  try {
    console.log('🚀 Step 7: Real Tributary DistributionService');
    console.log('==============================================');

    // 1. キーペア作成
    const privateKeyArray = [150,246,237,252,156,214,60,223,98,126,155,100,109,247,100,224,243,44,239,204,5,25,218,224,48,55,64,22,103,62,60,201,180,88,17,191,20,144,160,45,223,50,74,128,194,98,67,174,100,192,92,255,61,156,47,177,30,244,17,75,206,29,195,159];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

    console.log('✅ Admin wallet:', adminKeypair.publicKey.toString());

    // 2. 実際のTributary DistributionServiceを作成
    const service = new DistributionService('testnet', adminKeypair);

    console.log('✅ DistributionService created');

    // 3. テストデータ作成
    const tokenAddress = new PublicKey('9Rnhbcw63WchEesvNP1KR5BBtRBSMdZNmjDCdgbKTKEa');
    const recipients = [new PublicKey('22XkWSj5b7MT47ubmmFWjWr8jMDCgE5szc8wiVL79xv1')];

    const holders: TokenHolder[] = recipients.map(addr => ({
      address: addr,
      balance: 1000,
      percentage: 100 / recipients.length
    }));

    const request: DistributionRequest = {
      amount: 0.05, // 0.05トークン
      tokenAddress,
      holders,
      mode: 'proportional',
      batchSize: 10
    };

    console.log('✅ Test data prepared');
    console.log('Token:', tokenAddress.toString());
    console.log('Recipients:', recipients.length);
    console.log('Amount:', request.amount);

    // 4. 実際のTributary executeDistributionを実行
    console.log('\n🚀 Starting distribution...');

    const result = await service.executeDistribution(request);

    console.log('\n📊 Final Result:');
    console.log('Distribution ID:', result.id);
    console.log('Created at:', result.createdAt);

    const results = result.getResults();
    if (results && results.length > 0) {
      console.log('Results count:', results.length);

      results.forEach((res: any, index: number) => {
        console.log(`\n${index + 1}. ${res.recipient.toString()}`);
        console.log(`   Status: ${res.status}`);
        console.log(`   Amount: ${res.amount}`);
        if (res.transactionId) {
          console.log(`   TX: ${res.transactionId}`);
          console.log(`   Explorer: https://explorer.solana.com/tx/${res.transactionId}?cluster=testnet`);
        }
        if (res.error) {
          console.log(`   Error: ${res.error}`);
        }
      });

      const successful = result.getSuccessfulCount();
      const failed = result.getFailedCount();
      const totalAmount = result.getTotalAmount();

      console.log(`\n📈 Summary:`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Total: ${results.length}`);
      console.log(`   Total Amount: ${totalAmount}`);
    } else {
      console.log('No results returned');
      console.log('Full result:', result);
    }

    if (results.length > 0 && result.getSuccessfulCount() > 0) {
      console.log('\n🎉 TRIBUTARY DISTRIBUTION SERVICE WORKING CORRECTLY!');
    } else {
      console.log('\n❌ Distribution failed or no successful transfers');
    }

  } catch (error) {
    console.log('\n❌ Test failed with error:', error instanceof Error ? error.message : 'Unknown error');
    console.log('Error details:', error);

    // エラーの詳細分析
    if (error instanceof Error) {
      console.log('\nError Analysis:');
      console.log('Name:', error.name);
      console.log('Message:', error.message);
      console.log('Stack:', error.stack);

      if (error.message.includes('owner.toBuffer')) {
        console.log('\n🔍 FOUND THE ISSUE!');
        console.log('This is the exact error from T031 test!');
        console.log('The error occurs when using the real Tributary DistributionService');
      }
    }
  }
}

main().catch(console.error);