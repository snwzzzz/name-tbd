import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('turns headings, paragraphs and lists into HTML', () => {
    expect(renderMarkdown('# Title\n\nFirst line\nsecond line\n\n- one\n- two\n\n1. a\n2. b')).toBe(
      '<h1>Title</h1><p>First line<br>second line</p><ul><li>one</li><li>two</li></ul><ol><li>a</li><li>b</li></ol>',
    );
  });

  it('understands bold, italic, code, quotes and links', () => {
    expect(renderMarkdown('**bold** and *italic* and `x < 2`')).toBe('<p><strong>bold</strong> and <em>italic</em> and <code>x &lt; 2</code></p>');
    expect(renderMarkdown('> said')).toBe('<blockquote>said</blockquote>');
    expect(renderMarkdown('[Docs](https://example.com/a?b=1&c=2)')).toBe(
      '<p><a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">Docs</a></p>',
    );
    expect(renderMarkdown('[Top](#top)')).toBe('<p><a href="#top">Top</a></p>');
  });

  it('escapes HTML and drops links that could run code', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(renderMarkdown('[click](javascript:alert(1))')).not.toContain('href');
    expect(renderMarkdown('[x](" onmouseover="alert(1))')).not.toContain('onmouseover="');
  });
});
