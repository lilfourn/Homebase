"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  // Function to parse markdown to HTML with custom styling
  const parseMarkdown = (text: string): string => {
    let html = text;

    // Escape HTML first
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headers
    html = html.replace(
      /^### (.*$)/gim,
      '<h3 class="text-base font-semibold text-gray-800 mt-4 mb-2">$1</h3>'
    );
    html = html.replace(
      /^## (.*$)/gim,
      '<h2 class="text-lg font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200">$1</h2>'
    );
    html = html.replace(
      /^# (.*$)/gim,
      '<h1 class="text-xl font-bold text-gray-900 mt-6 mb-4">$1</h1>'
    );

    // Bold and Italic
    html = html.replace(
      /\*\*\*(.+?)\*\*\*/g,
      '<strong class="font-bold italic">$1</strong>'
    );
    html = html.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-gray-900">$1</strong>'
    );
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

    // Code blocks
    html = html.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 border border-gray-200 rounded-md p-3 my-3 overflow-x-auto"><code class="text-xs">$1</code></pre>'
    );
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
    );

    // Blockquotes
    html = html.replace(
      /^&gt; (.*$)/gim,
      '<blockquote class="border-l-4 border-blue-500 pl-4 my-3 italic text-gray-700">$1</blockquote>'
    );

    // Lists - handle nested bullets
    const lines = html.split("\n");
    let inList = false;
    let listHtml = "";
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bulletMatch = line.match(/^(\s*)- (.+)$/);
      const numberedMatch = line.match(/^(\s*)(\d+)\. (.+)$/);

      if (bulletMatch) {
        if (!inList) {
          inList = true;
          listHtml =
            '<ul class="list-disc list-inside space-y-1 my-3 text-gray-700">';
        }
        const indent = bulletMatch[1].length;
        const content = bulletMatch[2];
        const marginClass = indent > 0 ? `ml-${Math.min(indent * 2, 8)}` : "";
        listHtml += `<li class="${marginClass}">${content}</li>`;
      } else if (numberedMatch) {
        if (!inList) {
          inList = true;
          listHtml =
            '<ol class="list-decimal list-inside space-y-1 my-3 text-gray-700">';
        }
        const indent = numberedMatch[1].length;
        const content = numberedMatch[3];
        const marginClass = indent > 0 ? `ml-${Math.min(indent * 2, 8)}` : "";
        listHtml += `<li class="${marginClass}">${content}</li>`;
      } else {
        if (inList) {
          listHtml += listHtml.includes("<ul") ? "</ul>" : "</ol>";
          processedLines.push(listHtml);
          inList = false;
          listHtml = "";
        }
        processedLines.push(line);
      }
    }

    if (inList) {
      listHtml += listHtml.includes("<ul") ? "</ul>" : "</ol>";
      processedLines.push(listHtml);
    }

    html = processedLines.join("\n");

    // Paragraphs
    html = html.replace(
      /\n\n/g,
      '</p><p class="text-gray-700 leading-relaxed mb-4">'
    );
    html = '<p class="text-gray-700 leading-relaxed mb-4">' + html + "</p>";

    // Clean up empty paragraphs
    html = html.replace(
      /<p class="text-gray-700 leading-relaxed mb-4"><\/p>/g,
      ""
    );
    html = html.replace(
      /<p class="text-gray-700 leading-relaxed mb-4">(<h[1-3])/g,
      "$1"
    );
    html = html.replace(/(<\/h[1-3]>)<\/p>/g, "$1");
    html = html.replace(
      /<p class="text-gray-700 leading-relaxed mb-4">(<ul|<ol|<blockquote|<pre)/g,
      "$1"
    );
    html = html.replace(/(<\/ul>|<\/ol>|<\/blockquote>|<\/pre>)<\/p>/g, "$1");

    return html;
  };

  const htmlContent = parseMarkdown(content);

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
