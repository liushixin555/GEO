#!/bin/bash

if [ "$1" != "--inner" ]; then
  mkdir -p logs
  nohup bash "$0" --inner >logs/run_tasks_$(date +%Y%m%d_%H%M%S).log 2>&1 &
  echo "已后台启动，PID: $!"
  exit 0
fi
mapfile -t tasks < <(find . -type f \( -name "dev*.md" \) | shuf)
for ((i=0; i<100; i++)); do
for f in "${tasks[@]}"; do

  claude -p "@$f 以软件质量专家评审此开发任务的所有交付代码，在tasks/review目录建一个与本文件同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以软件架构专家评审此开发任务的所有交付代码，在tasks/review目录建一个与本文件同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以软件后端开发专家评审此开发任务的所有交付代码，在tasks/review目录建一个与本文件同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以软件前端开发专家评审此开发任务的所有交付代码，在tasks/review目录建一个与本文件同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以committer专家评审前面4位专家提出的问题并质疑他们是否正确，在tasks/review目录建一个与本文件同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  
  echo "休眠 10秒..."
  sleep 10
done
echo "休眠 10 分钟..." 
sleep 600
done
echo "===== All tasks completed ====="