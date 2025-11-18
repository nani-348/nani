import React, { useState, useCallback, useMemo } from 'react';
import { GeneratedCode } from '../types';
import { Clipboard, Check, CodeXml, Brush, FileJson } from 'lucide-react';

interface CodeViewerProps {
  code: GeneratedCode;
  isLoading: boolean;
}

type CodeType = 'html' | 'css' | 'js';

const icons: Record<CodeType, React.ReactNode> = {
  html: <CodeXml className="w-4 h-4 mr-2" />,
  css: <Brush className="w-4 h-4 mr-2" />,
  js: <FileJson className="w-4 h-4 mr-2" />,
};

// Refined highlight function to prevent nested spans and improve order/regexes
const highlight = (code: string, language: CodeType) => {
    let highlightedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Helper to apply span tags
    const applySpan = (text: string, className: string) => `<span class="token ${className}">${text}</span>`;

    // Regex to skip already processed spans when matching top-level content
    // This is used as the first alternative in a regex to prevent matching within existing spans.
    const skipSpan = '(<span[^>]*>.*?<\\/span>)|';

    // 1. Comments (highest priority, should not contain other tokens usually)
    highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(&lt;!--[\\s\\S]*?--&gt;)', 'g'), (m, span, comment) => span || applySpan(comment, 'comment')); // HTML
    highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(\\/\\*[\\s\\S]*?\\*\\/)', 'g'), (m, span, comment) => span || applySpan(comment, 'comment')); // CSS/JS block
    highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(\\/\\/.*)', 'g'), (m, span, comment) => span || applySpan(comment, 'comment')); // JS line

    // 2. Strings (next highest priority, to prevent internal highlighting)
    if (language === 'js') {
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + "(['\"`])(?:(?!\\1)[^\\\\\\n]|\\\\.)*\\1", 'g'), (m, span, str) => span || applySpan(str, 'string'));
    }

    // 3. Language-specific tokenizing
    if (language === 'html') {
        // Tags with attributes: <tag attr="value"> or </tag>
        // This regex attempts to capture the entire tag and process its parts
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(&lt;\\/?)([a-zA-Z0-9-]+)((?:\\s+[a-zA-Z-]+(?:=&quot;[^&quot;]*&quot;)?)*)(\\s*\\/?)?(&gt;)', 'g'),
            (match, span, openBracket, tagName, attributes, selfClosing, closeBracket) => {
                if (span) return span; // If already a span, return as-is
                let result = applySpan(openBracket, 'punctuation') + applySpan(tagName, 'tag');
                if (attributes) {
                    // Process attributes within the captured group (no need for skipSpan here as it's a substring)
                    result += attributes.replace(/(\s+)([a-zA-Z-]+)((?:=)(&quot;[^&quot;]*&quot;))?/g, (attrMatch, ws, attrName, eqGroup, eq, attrValue) => {
                        let attrResult = ws + applySpan(attrName, 'attr-name');
                        if (eqGroup) { // If value exists
                            attrResult += applySpan(eq, 'punctuation') + applySpan(attrValue, 'string');
                        }
                        return attrResult;
                    });
                }
                if (selfClosing) result += selfClosing; // Keep self-closing slash
                result += applySpan(closeBracket, 'punctuation');
                return result;
            }
        );

        // General HTML punctuation not covered by comprehensive tag regex (e.g., standalone '=')
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '([=])', 'g'), (m, span, punc) => span || applySpan(punc, 'punctuation'));

    } else if (language === 'css') {
        // At-rules
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(@[a-zA-Z-]+)', 'g'), (m, span, atrule) => span || applySpan(atrule, 'atrule'));

        // CSS strings (e.g., url())
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(url\\([\'"]?.*?[\'"]?\\))', 'g'), (m, span, str) => span || applySpan(str, 'string'));
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + "(['\"](?:(?!\\1)[^\\\\\\n]|\\\\.)*\\1)", 'g'), (m, span, str) => span || applySpan(str, 'string')); // generic CSS strings

        // Selectors (.class, #id, element, pseudo-classes/elements)
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(\\.[a-zA-Z0-9_-]+)', 'g'), (m, span, selector) => span || applySpan(selector, 'selector')); // Class
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(\\\#[a-zA-Z0-9_-]+)', 'g'), (m, span, selector) => span || applySpan(selector, 'selector')); // ID
        // Element selectors and pseudo-classes/elements
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '([a-zA-Z-]+(?:[:][a-zA-Z-]+(?:\\([^\\)]*\\))?)*)(?=\\s*\\{)', 'g'), (m, span, selector) => {
            if (span) return span;
            let processedSelector = selector;
            // Highlight pseudo-classes/elements within the selector (no skipSpan needed here)
            processedSelector = processedSelector.replace(/(::?[a-zA-Z-]+(?:\\([^\\)]*\\))?)/g, m => applySpan(m, 'function')); // e.g., :hover, ::before
            return applySpan(processedSelector.trim(), 'selector');
        });

        // Properties and values (match property, colon, value, and terminator)
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '([a-zA-Z-]+)(\\s*:)(\\s*)(.+?)(;|}?)', 'g'), (match, span, prop, colon, ws, val, terminator) => {
            if (span) return span;
            let processedVal = val.trim();
            // Numbers in values (no skipSpan needed here)
            processedVal = processedVal.replace(/\b(\d+(\.\d+)?(px|em|rem|%|vh|vw|ch|fr|deg|s|ms)?)\b/g, m => applySpan(m, 'number'));
            // Keywords in values (no skipSpan needed here)
            const cssValueKeywords = ['!important', 'inherit', 'initial', 'unset', 'auto', 'none', 'block', 'inline', 'flex', 'grid', 'relative', 'absolute', 'fixed', 'static'];
            processedVal = processedVal.replace(new RegExp(`\\b(${cssValueKeywords.join('|')})\\b`, 'g'), m => applySpan(m, 'keyword'));

            return applySpan(prop, 'property') + applySpan(colon, 'punctuation') + ws + processedVal + (terminator ? applySpan(terminator, 'punctuation') : '');
        });

        // Remaining punctuation
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '([\\{\\},])', 'g'), (m, span, punc) => span || applySpan(punc, 'punctuation'));

    } else if (language === 'js') {
        // Keywords
        const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'async', 'await', 'import', 'from', 'export', 'default', 'new', 'document', 'window', 'console', 'class', 'extends', 'this', 'super', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'in', 'of', 'debugger', 'try', 'catch', 'finally', 'throw'];
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + `\\b(${keywords.join('|')})\\b`, 'g'), (m, span, keyword) => span || applySpan(keyword, 'keyword'));

        // Numbers
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '\\b(\\d+(\\.\\d+)?)\\b', 'g'), (m, span, num) => span || applySpan(num, 'number'));

        // Function names
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '(\\b[a-zA-Z_$][\\w$]*\\b)(?=\\s*\\()', 'g'), (m, span, funcName) => span || applySpan(funcName, 'function'));

        // Punctuation
        highlightedCode = highlightedCode.replace(new RegExp(skipSpan + '([{\\}\\\\(\\)\\[\\]\\.,;=\\+\\-\\*\\/&\\|!~])', 'g'), (m, span, punc) => span || applySpan(punc, 'punctuation'));
    }

    return highlightedCode;
};


export const CodeViewer: React.FC<CodeViewerProps> = ({ code, isLoading }) => {
  const [activeTab, setActiveTab] = useState<CodeType>('html');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code[activeTab]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code, activeTab]);

  const highlightedCode = useMemo(() => {
      return highlight(code[activeTab], activeTab);
  }, [code, activeTab]);

  return (
    <div className="bg-gray-800 flex flex-col h-full">
      <div className="flex justify-between items-center p-2 border-b border-gray-700 bg-gray-900">
        <div className="flex space-x-1">
          {(['html', 'css', 'js'] as CodeType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {icons[tab]}
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-400" /> Copied!
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4 mr-2" /> Copy
                </>
              )}
            </button>
        </div>
      </div>
      <div className="relative flex-1 overflow-auto p-4 font-mono">
        <pre className="text-sm h-full w-full">
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </div>
  );
};