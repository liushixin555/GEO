/**
 * 手工调测脚本 - getAllRmResources
 *
 * 用法:
 *   npx ts-node --project tsconfig.api.json apis/utils/rmapi.utils/debug-getRmResources.ts
 *   npx ts-node --project tsconfig.api.json apis/utils/rmapi.utils/debug-getRmResources.ts --token YOUR_TOKEN
 */
import * as fs from 'fs';
import * as path from 'path';
import { getAllRmResources, getRmToken } from './index';

function parseArgs(): { token?: string; mobile?: string; password?: string } {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && args[i + 1] && !args[i + 1].startsWith('--')) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return {
    token: result.token,
    mobile: result.mobile,
    password: result.password,
  };
}

async function main() {
  const { token, mobile, password } = parseArgs();

  let accessToken = token;

  if (!accessToken) {
    if (!mobile || !password) {
      console.error('错误: 需要提供 --token 或 (--mobile + --password) 来获取 token');
      console.error('示例:');
      console.error('  npx ts-node --project tsconfig.api.json apis/utils/rmapi.utils/debug-getRmResources.ts --mobile 13800000000 --password xxx');
      console.error('  npx ts-node --project tsconfig.api.json apis/utils/rmapi.utils/debug-getRmResources.ts --token YOUR_TOKEN');
      process.exit(1);
    }
    console.log(`[1] 正在获取 token (mobile: ${mobile}) ...`);
    try {
      accessToken = await getRmToken({ mobile, password });
      console.log(`[1] token 获取成功: ${accessToken!.slice(0, 20)}...`);
    } catch (err: any) {
      console.error('[1] token 获取失败:', err.message);
      process.exit(1);
    }
  }

  console.log(`[2] 正在请求全部资源 (自动分页) ...`);
  const startTime = Date.now();

  try {
    const allItems = await getAllRmResources(accessToken!);
    const elapsed = Date.now() - startTime;

    console.log(`[2] 请求成功 (${elapsed}ms)`);
    console.log('─'.repeat(60));
    console.log(`  总数据条数: ${allItems.length}`);
    console.log('─'.repeat(60));

    if (allItems.length > 0) {
      console.log('\n前 5 条数据预览:');
      allItems.slice(0, 5).forEach((item, i) => {
        console.log(`  [${i + 1}] id=${item.id} | name="${item.name}" | price=${item.price} | taxonomy="${item.taxonomy}"`);
      });
      if (allItems.length > 5) {
        console.log(`  ... 还有 ${allItems.length - 5} 条`);
      }
    }

    const json = JSON.stringify(allItems, null, 2);
    const outPath = path.resolve(process.cwd(), `data/rmdata/rmResources-all.json`);
    fs.writeFileSync(outPath, json, 'utf-8');
    console.log(`\n完整响应已保存到: ${outPath}`);
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[2] 请求失败 (${elapsed}ms):`, err.message);
    if (err.response) {
      console.error('  HTTP status:', err.response.status);
      console.error('  响应数据:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
