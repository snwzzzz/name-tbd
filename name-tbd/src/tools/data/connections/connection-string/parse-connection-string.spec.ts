import { describe, expect, it } from 'vitest';
import { formatConnectionString, parseConnectionString } from './parse-connection-string';

const ok = (text: string) => {
  const result = parseConnectionString(text);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};
const error = (text: string) => {
  const result = parseConnectionString(text);
  if (result.ok) throw new Error('expected an error');
  return result.error;
};

describe('parseConnectionString', () => {
  it('reads a PostgreSQL URI', () => {
    const c = ok('postgresql://alice:s3cret@db.example.com:6543/shop');
    expect(c.kind).toBe('postgres');
    expect(c.settings).toEqual({ host: 'db.example.com', port: 6543, database: 'shop', user: 'alice', ssl: true });
    expect(c.password).toBe('s3cret');
  });

  it('accepts the postgres:// and mariadb:// schemes in any case', () => {
    expect(ok('POSTGRES://u@h.example.com/d').kind).toBe('postgres');
    expect(ok('mariadb://u@h.example.com/d').kind).toBe('mysql');
  });

  it('fills in the default port', () => {
    expect(ok('postgres://u@h.example.com/d').settings.port).toBe(5432);
    expect(ok('mysql://u@h.example.com/d').settings.port).toBe(3306);
  });

  it('decodes an escaped user and password, including @ and :', () => {
    const c = ok('mysql://me%40corp:p%40ss%3Aw%2Frd@h.example.com/d');
    expect(c.settings.user).toBe('me@corp');
    expect(c.password).toBe('p@ss:w/rd');
  });

  it('copes with a raw @ in the password', () => {
    expect(ok('postgres://u:p@ss@h.example.com/d').password).toBe('p@ss');
  });

  it('allows a missing password, and an empty one', () => {
    expect(ok('postgres://u@h.example.com/d').password).toBe('');
    expect(ok('postgres://u:@h.example.com/d').password).toBe('');
  });

  it('ignores a trailing slash, whitespace and quotes', () => {
    expect(ok('  "postgres://u@h.example.com/d/"  ').settings.database).toBe('d');
  });

  it('reads IPv6 hosts', () => {
    const c = ok('postgres://u@[2001:db8::1]:5433/d');
    expect(c.settings.host).toBe('[2001:db8::1]');
    expect(c.settings.port).toBe(5433);
  });

  it('reads JDBC URLs with user and password as parameters', () => {
    const c = ok('jdbc:mysql://h.example.com:3307/d?user=bob&password=pw&useSSL=false');
    expect(c.settings).toMatchObject({ host: 'h.example.com', port: 3307, user: 'bob', ssl: false });
    expect(c.password).toBe('pw');
  });

  it('maps SSL parameters', () => {
    expect(ok('postgres://u@h.example.com/d?sslmode=disable').settings.ssl).toBe(false);
    expect(ok('postgres://u@h.example.com/d?sslmode=verify-full').settings.ssl).toBe(true);
    expect(ok('mysql://u@h.example.com/d?ssl-mode=DISABLED').settings.ssl).toBe(false);
  });

  it('maps the PostgreSQL schema', () => {
    expect(ok('postgres://u@h.example.com/d?currentSchema=sales').settings.schema).toBe('sales');
    expect(ok('postgres://u@h.example.com/d?options=-c%20search_path%3Dsales').settings.schema).toBe('sales');
  });

  it('warns about parameters it ignores', () => {
    expect(ok('postgres://u@h.example.com/d?application_name=x').warnings).toEqual(['Ignored: application_name']);
  });

  it('reads libpq key=value strings', () => {
    const c = ok("host=h.example.com port=5433 dbname=shop user=alice password='a b\\'c' sslmode=disable");
    expect(c.kind).toBe('postgres');
    expect(c.settings).toEqual({ host: 'h.example.com', port: 5433, database: 'shop', user: 'alice', ssl: false });
    expect(c.password).toBe("a b'c");
  });

  it('rejects what the server cannot reach or does not support', () => {
    expect(error('postgres://u@localhost/d')).toMatch(/this computer/);
    expect(error('postgres://u@127.0.0.1/d')).toMatch(/this computer/);
    expect(error('postgres://u@a.example.com,b.example.com/d')).toMatch(/one host/);
    expect(error('postgres://u@%2Fvar%2Frun%2Fpg/d')).toBeTruthy();
    expect(error('mongodb://u@h.example.com/d')).toMatch(/not supported/);
    expect(error('postgres://u@h.example.com')).toMatch(/database name/);
    expect(error('postgres://u@h.example.com:99999/d')).toMatch(/port/);
    expect(error('')).toMatch(/Enter/);
    expect(error('hello')).toMatch(/not a connection string/);
  });

  it('rejects a broken escape', () => {
    expect(error('postgres://u:100%@h.example.com/d')).toMatch(/%25/);
  });
});

describe('formatConnectionString', () => {
  it('round-trips and leaves the password out unless asked', () => {
    const c = ok('postgresql://alice:pw@h.example.com:5433/shop?sslmode=disable&currentSchema=sales');
    const text = formatConnectionString(c.kind, c.settings);
    expect(text).toBe('postgresql://alice@h.example.com:5433/shop?sslmode=disable&currentSchema=sales');
    expect(text).not.toContain('pw');
    expect(ok(formatConnectionString(c.kind, c.settings, c.password))).toMatchObject({ settings: c.settings, password: 'pw' });
  });
});
