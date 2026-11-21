import type { XmlAttributeMap, XmlNode } from './types.js';

const MAX_XML_BYTES = 5 * 1024 * 1024;
const MAX_NODES = 100_000;
const MAX_DEPTH = 128;

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function localName(name: string): string {
  const idx = name.indexOf(':');
  return idx >= 0 ? name.slice(idx + 1) : name;
}

function parseAttributes(source: string): XmlAttributeMap {
  const out: XmlAttributeMap = {};
  const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const raw = match[3] ?? match[4] ?? '';
    out[match[1]!] = decodeXml(raw);
  }
  return out;
}

export function parseSafeXml(xml: string): XmlNode {
  if (Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) throw new Error('bxf_xml_too_large');
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) throw new Error('bxf_xml_doctype_or_entity_forbidden');

  const documentRoot: XmlNode = { name: '#document', localName: '#document', attributes: {}, text: '', children: [] };
  const stack: XmlNode[] = [documentRoot];
  const tokens = xml.match(/<\?[^?]*\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g) ?? [];
  let nodeCount = 0;

  for (const token of tokens) {
    if (token.startsWith('<?') || token.startsWith('<!--')) continue;
    if (token.startsWith('<![CDATA[')) {
      stack[stack.length - 1]!.text += token.slice(9, -3);
      continue;
    }
    if (token.startsWith('</')) {
      const closing = token.slice(2, -1).trim();
      const current = stack.pop();
      if (!current || current.name !== closing) throw new Error(`bxf_xml_mismatched_close:${closing}`);
      continue;
    }
    if (token.startsWith('<')) {
      if (/^<!/.test(token)) throw new Error('bxf_xml_declaration_forbidden');
      const selfClosing = /\/\s*>$/.test(token);
      const inner = token.slice(1, selfClosing ? token.lastIndexOf('/') : -1).trim();
      const firstSpace = inner.search(/\s/);
      const name = firstSpace < 0 ? inner : inner.slice(0, firstSpace);
      if (!name) throw new Error('bxf_xml_empty_tag');
      const attrSource = firstSpace < 0 ? '' : inner.slice(firstSpace + 1);
      const node: XmlNode = { name, localName: localName(name), attributes: parseAttributes(attrSource), text: '', children: [] };
      stack[stack.length - 1]!.children.push(node);
      nodeCount++;
      if (nodeCount > MAX_NODES) throw new Error('bxf_xml_too_many_nodes');
      if (!selfClosing) {
        stack.push(node);
        if (stack.length > MAX_DEPTH) throw new Error('bxf_xml_too_deep');
      }
      continue;
    }
    const text = decodeXml(token).trim();
    if (text) stack[stack.length - 1]!.text += (stack[stack.length - 1]!.text ? ' ' : '') + text;
  }

  if (stack.length !== 1) throw new Error('bxf_xml_unclosed_tag');
  if (documentRoot.children.length !== 1) throw new Error('bxf_xml_requires_single_root');
  return documentRoot.children[0]!;
}

export function walkXml(root: XmlNode, visit: (node: XmlNode, path: string) => void, path = ''): void {
  const here = `${path}/${root.localName}`;
  visit(root, here);
  for (let i = 0; i < root.children.length; i++) walkXml(root.children[i]!, visit, `${here}[${i}]`);
}
