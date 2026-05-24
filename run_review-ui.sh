#!/bin/bash

if [ "$1" != "--inner" ]; then
  mkdir -p logs
  nohup bash "$0" --inner >logs/run_tasks_$(date +%Y%m%d_%H%M%S).log 2>&1 &
  echo "已后台启动，PID: $!"
  exit 0
fi
mapfile -t tasks < <(find . -type f \( -name "*.tsx" \) ! -path "*/.agents/*" ! -path "*/.claude/*" ! -path "*/node_modules/*" | shuf)
for ((i=0; i<100; i++)); do
for f in "${tasks[@]}"; do

  claude -p "@$f 以软件质量专家评审此代码文件，在tasks/review目录建一个与本代码同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以软件架构专家评审此代码文件，在tasks/review目录建一个与本代码同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以代码安全专家评审此代码文件，在tasks/review目录建一个与本代码同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以软件UI专家评审此代码文件，根据DESIGN.md和antd规则、UI/UX规范评审，在tasks/review目录建一个与本代码同名的md文件写入评审结果。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以代码committer审核专家审核tasks/review目录建一个与本代码同名的md文件的评审结果，提出审核意见和最终裁决。注意任务结束铁律每次任务结束后必须执行"
  claude -p "@$f 以软件开发专家根据在tasks/review目录的与本代码同名的md文件的评审结果，修复评审问题。注意任务结束铁律每次任务结束后必须执行"
  
  echo "休眠 10秒..."
  sleep 10
done
echo "休眠 10 分钟..." 
sleep 600
done
echo "===== All tasks completed ====="