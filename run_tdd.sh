#!/bin/bash

if [ "$1" != "--inner" ]; then
  mkdir -p logs
  nohup bash "$0" --inner >logs/run_tasks_$(date +%Y%m%d_%H%M%S).log 2>&1 &
  echo "已后台启动，PID: $!"
  exit 0
fi
mapfile -t tasks < <(find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/.agents/*" ! -path "*/.claude/*" ! -path "*/node_modules/*" | sort)
for ((i=0; i<100; i++)); do
for f in "${tasks[@]}"; do
  echo "===== 处理: $f =====" 
  claude -p "@$f 根据此文件代码补全测试用例，进行测试，输出测试结果，并分析测试覆盖率。每完成一个任务，在tasks/tdd目录建一个文件写入该文件的tdd执行情况。注意任务结束铁律每次任务结束后必须执行"
  echo "休眠 10秒..."
  sleep 10
done
echo "休眠 10 分钟..." 
sleep 600
done
echo "===== All tasks completed ====="