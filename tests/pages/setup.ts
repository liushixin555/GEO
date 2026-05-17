import '@testing-library/jest-dom';

// Mock antd - compound components (Typography.Title, Form.Item, etc.) need sub-components
jest.mock('antd', () => {
  const React = require('react');
  const createComp = (name: string) => {
    const Comp: any = (props: any) => React.createElement(name, props, props.children);
    Comp.displayName = name;
    return new Proxy(Comp, {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          const subName = `${name}.${String(prop)}`;
          target[prop] = (props: any) => React.createElement(subName, props, props.children);
          target[prop].displayName = subName;
          return target[prop];
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
    const Comp: any = (props: any) => React.createElement('span', { ...props, 'data-icon': name });
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
