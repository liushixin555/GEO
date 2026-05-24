import React, { useEffect } from 'react';
import { Typography, Button, Card, Space, Breadcrumb } from 'antd';
import { LinkOutlined, ApiOutlined } from '@ant-design/icons';

const ApiDocsPage: React.FC = () => {
  useEffect(() => {
    document.title = 'API 文档 - 薄云商机倍增服务';
  }, []);

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: 'API 文档' }]} />
      </div>
      <Card bordered={false} style={{ maxWidth: 600 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            <ApiOutlined style={{ marginRight: 8 }} />
            Swagger API 文档
          </Typography.Title>
          <Typography.Text type="secondary">
            通过 Swagger UI 查看、测试和管理所有 API 接口。
            支持在线调试、参数说明和响应示例查看。
          </Typography.Text>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            href="/api-docs/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在新窗口打开 Swagger API 文档"
          >
            打开 Swagger 文档
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default ApiDocsPage;
