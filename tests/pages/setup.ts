import '@testing-library/jest-dom';

// Stable singletons — must be created ONCE and reused across all mock accesses
// Exported for test files that need to re-set mock implementations in beforeEach
const formFieldStore: Record<string, any> = { write_mode: 'ai' };

export const STABLE_FORM = {
  getFieldValue: jest.fn((name?: string) => name ? formFieldStore[name] : { ...formFieldStore }),
  getFieldsValue: jest.fn(() => ({ ...formFieldStore })),
  setFieldValue: jest.fn((name: string, value: any) => { formFieldStore[name] = value; }),
  setFieldsValue: jest.fn((values: Record<string, any>) => { Object.assign(formFieldStore, values); }),
  validateFields: jest.fn(() => Promise.resolve({ ...formFieldStore })),
  isFieldsTouched: jest.fn(() => false),
  resetFields: jest.fn((names?: string[]) => {
    if (names) { names.forEach((n: string) => { formFieldStore[n] = undefined; }); }
    else { Object.keys(formFieldStore).forEach(k => { formFieldStore[k] = undefined; }); }
  }),
  __store: formFieldStore,
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
      // Segmented: render option labels as clickable buttons
      if (name === 'Segmented' && Array.isArray(props.options)) {
        return React.createElement('div', { 'data-testid': name },
          ...props.options.map((opt: any) =>
            React.createElement('button', {
              key: opt.value || opt.label,
              'data-testid': `segmented-${opt.value}`,
              disabled: props.disabled,
              onClick: () => props.onChange?.(opt.value),
            }, opt.label)
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
      // Form: intercept submit to trigger onFinish with form values
      if (name === 'Form') {
        const formAttrs: Record<string, any> = { 'data-testid': name, className: props.className, style: props.style };
        formAttrs.onSubmit = (e: any) => {
          e?.preventDefault?.();
          if (props.onFinish) {
            Promise.resolve(STABLE_FORM.validateFields()).then(props.onFinish).catch(() => {});
          }
        };
        return React.createElement('form', formAttrs, props.children);
      }
      // Render message/title/tip/label prop + action + children for text-based assertions
      const textContent = props.message || props.title || props.tip || props.label || null;
      // Forward common HTML attributes for realistic testing (href, target, rel, aria-*, etc.)
      const htmlAttrs: Record<string, any> = { 'data-testid': name };
      // Alert always gets role="alert" when it has content
      if (name === 'Alert' && textContent) htmlAttrs.role = 'alert';
      for (const key of ['href', 'target', 'rel', 'aria-label', 'aria-hidden', 'role', 'type', 'disabled', 'className', 'id', 'placeholder', 'value', 'src', 'alt', 'name', 'onClick', 'loading', 'mode']) {
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
        if (prop === 'useWatch') return (fieldName: string) => formFieldStore[fieldName];
        if (typeof prop === 'string' && prop !== 'displayName' && prop !== 'prototype' && prop !== 'name') {
          if (!cache[prop]) {
            const subName = `${name}.${prop}`;
            const SubComp: any = (props?: any) => {
              if (!props) return React.createElement('div', { 'data-testid': subName });
              const text = props.label || props.message || props.title || props.tip || null;
              const attrs: Record<string, any> = { 'data-testid': subName };
              for (const k of ['placeholder', 'disabled', 'loading', 'mode', 'value', 'className']) {
                if (props[k] !== undefined) attrs[k] = props[k];
              }
              return React.createElement('div', attrs, text, props.children, props.extra);
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
      return createComp(String(name));
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
