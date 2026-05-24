import React from 'react';
import { Alert, Button, Popconfirm } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ArticleReviewActionsProps {
  onReview: (approved: boolean) => void;
}

const ArticleReviewActions: React.FC<ArticleReviewActionsProps> = ({ onReview }) => (
  <Alert
    type="warning"
    message="该文章待审核"
    showIcon
    style={{ marginBottom: 12 }}
    action={
      <div style={{ display: 'flex', gap: 8 }}>
        <Popconfirm title="确认审核通过？" description="通过后将自动进入发布流程" onConfirm={() => onReview(true)} okText="确认" cancelText="取消">
          <Button size="small" type="primary" icon={<CheckCircleOutlined />}>审核通过</Button>
        </Popconfirm>
        <Popconfirm title="确认审核不通过？" description="不通过后将退回为草稿" onConfirm={() => onReview(false)} okText="确认" cancelText="取消">
          <Button size="small" danger icon={<CloseCircleOutlined />}>审核不通过</Button>
        </Popconfirm>
      </div>
    }
  />
);

export default React.memo(ArticleReviewActions);
