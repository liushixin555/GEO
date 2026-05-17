import React from 'react';
import { Typography, Button, Breadcrumb } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

const ApiDocsPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-breadcrumb"><Breadcrumb items={[{ title: 'API 文档' }]} /></div>
      <Typography.Paragraph className="page-subtitle">
        请访问 Swagger API 文档查看完整的 API 接口说明。
      </Typography.Paragraph>
      <Button
        type="primary"
        icon={<LinkOutlined />}
        href="/api-docs"
        target="_blank"
      >
        Swagger API 文档
      </Button>
    </div>
  );
};

export default ApiDocsPage;
