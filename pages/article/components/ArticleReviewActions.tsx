import React, { useState } from 'react';
import { Alert, Button, Popconfirm, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const TEXT = {
  ALERT_MSG: '该文章待审核',
  APPROVE_TITLE: '确认审核通过？',
  APPROVE_DESC: '通过后将自动进入发布流程',
  REJECT_TITLE: '确认审核不通过？',
  REJECT_DESC: '不通过后将退回为草稿',
  APPROVE_BTN: '审核通过',
  REJECT_BTN: '审核不通过',
  CONFIRM: '确认',
  CANCEL: '取消',
} as const;

interface ArticleReviewActionsProps {
  visible: boolean;
  onReview: (approved: boolean) => Promise<void>;
}

const ArticleReviewActions: React.FC<ArticleReviewActionsProps> = ({ visible, onReview }) => {
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const handleReview = async (approved: boolean) => {
    setLoading(true);
    try {
      await onReview(approved);
    } catch {
      // Error already handled by parent (useArticleActions)
    } finally {
      setLoading(false);
    }
  };

  return (
    <Alert
      type="warning"
      message={TEXT.ALERT_MSG}
      showIcon
      style={{ marginBottom: 12 }}
      action={
        <Space size={8}>
          <Popconfirm title={TEXT.APPROVE_TITLE} description={TEXT.APPROVE_DESC} onConfirm={() => handleReview(true)} okText={TEXT.CONFIRM} cancelText={TEXT.CANCEL}>
            <Button type="primary" icon={<CheckCircleOutlined />} loading={loading} disabled={loading}>{TEXT.APPROVE_BTN}</Button>
          </Popconfirm>
          <Popconfirm title={TEXT.REJECT_TITLE} description={TEXT.REJECT_DESC} onConfirm={() => handleReview(false)} okText={TEXT.CONFIRM} cancelText={TEXT.CANCEL}>
            <Button danger icon={<CloseCircleOutlined />} loading={loading} disabled={loading}>{TEXT.REJECT_BTN}</Button>
          </Popconfirm>
        </Space>
      }
    />
  );
};

ArticleReviewActions.displayName = 'ArticleReviewActions';

export default React.memo(ArticleReviewActions);
