import React, { useEffect, useState } from 'react';
import { ThemeConfig } from '../types';
import { ChatMessage } from '../services/geminiService';
import { Bot, User } from 'lucide-react';
import Markdown from 'react-markdown';

interface ChatBubbleProps {
  message: ChatMessage;
  theme: ThemeConfig;
}

const ContentRenderer: React.FC<{ text: string }> = ({ text }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for Katex availability
    if ((window as any).katex) {
        setReady(true);
    } else {
        const t = setInterval(() => {
            if ((window as any).katex) {
                setReady(true);
                clearInterval(t);
            }
        }, 300);
        return () => clearInterval(t);
    }
  }, []);

  if (!text) return null;

  // Split text by LaTeX delimiters
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([^\n\)]+?\\\))/g;
  const parts = text.split(regex);

  return (
    <div className="text-sm md:text-[15px] leading-7 break-words w-full">
      {parts.map((part, index) => {
        const isBlockMath = (part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('\\[') && part.endsWith('\\]'));
        const isInlineMath = (part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\(') && part.endsWith('\\)'));

        if (isBlockMath) {
           const tex = part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2);
           try {
              const html = (window as any).katex?.renderToString(tex, { displayMode: true, throwOnError: false });
              return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2 py-1 overflow-x-auto max-w-full" />;
           } catch { 
              return <code key={index} className="block bg-black/30 p-2 rounded my-2 text-xs font-mono overflow-x-auto">{tex}</code>; 
           }
        } 
        else if (isInlineMath) {
           const tex = part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2);
           try {
              const html = (window as any).katex?.renderToString(tex, { displayMode: false, throwOnError: false });
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="mx-0.5" />;
           } catch { 
               return <span key={index} className="bg-black/30 px-1 rounded text-xs font-mono">{tex}</span>; 
           }
        } 
        else {
           if (!part) return null;
           return (
             <span key={index} className="markdown-content">
                <Markdown 
                    components={{
                        p: ({node, ...props}) => <span className="block mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-yellow-400 font-bold" {...props} />,
                        code: ({node, ...props}) => <code className="bg-white/10 text-pink-300 px-1.5 py-0.5 rounded text-xs font-mono border border-white/5" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-400 underline break-all" target="_blank" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-[#111] p-3 rounded-lg overflow-x-auto my-2 border border-white/10" {...props} />
                    }}
                >
                    {part}
                </Markdown>
             </span>
           );
        }
      })}
    </div>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, theme }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`flex max-w-[92%] md:max-w-[88%] gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-auto mb-1 shadow-lg ${isUser ? `bg-gradient-to-br ${theme.buttonGradient}` : 'bg-indigo-600 border border-white/10'}`}>
            {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
        </div>

        {/* Bubble Box */}
        <div 
            className={`px-4 py-3 rounded-2xl shadow-md min-w-0 overflow-hidden relative ${
                isUser 
                ? `bg-white/10 text-white rounded-br-none border border-white/10` 
                : 'bg-[#252540] text-gray-100 rounded-bl-none border border-indigo-500/20'
            }`}
        >
            {/* Ảnh */}
            {message.image && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                    <img 
                        src={message.image} 
                        alt="Attachment" 
                        className="w-full h-auto max-h-[250px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => {
                             const w = window.open("");
                             w?.document.write(`<body style="margin:0;background:black;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${message.image}" style="max-width:100%;max-height:100%;"/></body>`);
                        }}
                    />
                </div>
            )}
            
            <ContentRenderer text={message.text} />
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;