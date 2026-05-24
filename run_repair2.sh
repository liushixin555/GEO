#!/bin/bash

if [ "$1" != "--inner" ]; then
  mkdir -p logs
  nohup bash "$0" --inner >logs/run_tasks_$(date +%Y%m%d_%H%M%S).log 2>&1 &
  echo "已后台启动，PID: $!"
  exit 0
fi
for ((i=0; i<100; i++)); do
mapfile -t tasks < <(find ./tasks/review -type f -name "*.md" | sort)
for f in "${tasks[@]}"; do

  claude -p "@$f 根据此文件修复代码。每次开始前都执行git pull.注意铁律每次任务前后必须遵守"
  echo "休眠 10秒..."
  sleep 10
done
echo "休眠 10 分钟..." 
sleep 600
done
echo "===== All tasks completed ====="