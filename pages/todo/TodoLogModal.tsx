import React, { useState, useEffect } from 'react';
import { Modal, Timeline, Spin, Empty, Typography, App } from 'antd';
import apiClient from '../lib/apiClient';
import { formatDate } from '../utils/date';

interface TodoLogModalProps {
  visible: boolean;
  todoId: number | null;
  onClose: () => void;
}

interface TodoLogItem {
  id: number;
  operator_name: string;
  action: string;
  remark: string | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, string> = {
  submit: '提交',
  close: '关闭',
  reopen: '重新打开',
  transfer: '转交',
  reject: '驳回',
};

const TodoLogModal: React.FC<TodoLogModalProps> = ({ visible, todoId, onClose }) => {
  const [logs, setLogs] = useState<TodoLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && todoId) {
      fetchLogs();
    }
  }, [visible, todoId]);

  const fetchLogs = async () => {
    if (!todoId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/todos/${todoId}/logs`);
      setLogs(res.data.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="操作日志"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {logs.length === 0 ? (
          <Empty description="暂无操作日志" />
        ) : (
          <Timeline
            items={logs.map((log) => ({
              children: (
                <div>
                  <Typography.Text strong>{log.operator_name}</Typography.Text>
                  <Typography.Text type="secondary"> {ACTION_CONFIG[log.action] || log.action}</Typography.Text>
                  {log.remark && (
                    <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{log.remark}</Typography.Text></div>
                  )}
                  <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatDate(log.created_at)}</Typography.Text></div>
                </div>
              ),
            }))}
          />
        )}
      </Spin>
    </Modal>
  );
};

export default TodoLogModal;
