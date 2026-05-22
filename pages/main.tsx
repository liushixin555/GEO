import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import App from './App';
import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import './styles/global.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0f62fe',
          borderRadius: 0,
          fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f4f4f4',
          colorBorder: '#e0e0e0',
          colorText: '#161616',
          colorTextSecondary: '#525252',
          colorTextQuaternary: '#8c8c8c',
          colorError: '#da1e28',
          colorSuccess: '#24a148',
          colorWarning: '#f1c21b',
        },
        components: {
          Button: {
            borderRadius: 0,
            controlHeight: 40,
            paddingInline: 16,
          },
          Input: {
            borderRadius: 0,
            controlHeight: 40,
            paddingInline: 16,
            colorBgContainer: '#f4f4f4',
            activeBorderColor: '#0f62fe',
          },
          Select: {
            borderRadius: 0,
            controlHeight: 40,
          },
          Card: {
            borderRadius: 0,
          },
          Modal: {
            borderRadius: 0,
          },
          Menu: {
            borderRadius: 0,
            itemBorderRadius: 0,
            activeBarBorderWidth: 3,
          },
          Tag: {
            borderRadiusSM: 0,
          },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
