import '@testing-library/jest-dom';

// Stable singletons — must be created ONCE and reused across all mock accesses
// Exported for test files that need to re-set mock implementations in beforeEach
export const STABLE_FORM = {
  getFieldValue: jest.fn(),
  getFieldsValue: jest.fn(() => ({})),
  setFieldValue: jest.fn(),
  setFieldsValue: jest.fn(),
  validateFields: jest.fn(() => Promise.resolve({})),
  isFieldsTouched: jest.fn(() => false),
};
const STABLE_APP = {
  message: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
  notification: { success: jest.fn(), error: jest.fn() },
  modal: { confirm: jest.fn() },
};
const STABLE_BREAKPOINTS = { xs: true, sm: true, md: true, lg: true, xl: true, xxl: true };

// Mock antd - compound components (Typography.Title, Form.Item, etc.) need sub-components
jest.mock('antd', () => {
  const React = require('react');

  const createComp = (name: string) => {
    const Comp: any = (props: any) => {
      if (name === 'Collapse' && Array.isArray(props.items)) {
        return React.createElement('div', { 'data-testid': name },
          ...props.items.map((item: any) =>
            React.createElement('div', { key: item.key, 'data-panel': item.key },
              React.createElement('div', null, item.label),
              typeof item.children === 'function' ? item.children() : item.children
            )
          )
        );
      }
      // Segmented: render option labels
      if (name === 'Segmented' && Array.isArray(props.options)) {
        return React.createElement('div', { 'data-testid': name },
          ...props.options.map((opt: any) =>
            React.createElement('span', { key: opt.value || opt.label }, opt.label)
          )
        );
      }
      // Popconfirm: render children + trigger onConfirm on click
      if (name === 'Popconfirm') {
        return React.createElement('div',
          { 'data-testid': name, onClick: () => props.onConfirm?.() },
          props.children
        );
      }
      // Render message/title/tip/label prop + action + children for text-based assertions
      const textContent = props.message || props.title || props.tip || props.label || null;
      // Forward common HTML attributes for realistic testing (href, target, rel, aria-*, etc.)
      const htmlAttrs: Record<string, any> = { 'data-testid': name };
      for (const key of ['href', 'target', 'rel', 'aria-label', 'aria-hidden', 'role', 'type', 'disabled', 'className', 'id', 'placeholder', 'value', 'src', 'alt', 'name']) {
        if (props[key] !== undefined) htmlAttrs[key] = props[key];
      }
      if (props.style) htmlAttrs.style = props.style;
      return React.createElement('div', htmlAttrs, textContent, props.action, props.children);
    };
    Comp.displayName = name;
    const cache: Record<string, any> = {};
    return new Proxy(Comp, {
      get: (target, prop) => {
        if (prop === 'useForm') return () => [STABLE_FORM];
        if (prop === 'useApp') return () => STABLE_APP;
        if (prop === 'useBreakpoint') return () => STABLE_BREAKPOINTS;
        if (prop === 'useToken') return () => ({ token: { colorBgBase: '#ffffff' } });
        if (typeof prop === 'string' && prop !== 'displayName' && prop !== 'prototype' && prop !== 'name') {
          if (!cache[prop]) {
            const subName = `${name}.${prop}`;
            const SubComp: any = (props?: any) => {
              if (!props) return React.createElement('div', { 'data-testid': subName });
              return React.createElement('div', { 'data-testid': subName }, props.children);
            };
            SubComp.displayName = subName;
            cache[prop] = SubComp;
          }
          return cache[prop];
        }
        return (target as any)[prop];
      },
    });
  };
  return new Proxy({}, {
    get: (_, name) => {
      if (name === '__esModule') return false;
      if (typeof name !== 'string') return undefined;
      return createComp(name);
    },
  });
});

jest.mock('@ant-design/icons', () => {
  const React = require('react');
  const createIcon = (name: string) => {
    const Comp: any = (props: any) => React.createElement('span', { 'data-icon': name });
    Comp.displayName = name;
    return Comp;
  };
  return new Proxy({}, {
    get: (_, name) => {
      if (name === '__esModule') return false;
      if (typeof name !== 'string') return undefined;
      return createIcon(String(name));
    },
  });
});
