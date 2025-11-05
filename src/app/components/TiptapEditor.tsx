// app/components/TiptapEditor.tsx

'use client'; 

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Blockquote from '@tiptap/extension-blockquote';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import { useRef, useState, useEffect } from 'react';
import { NodeSelection } from 'prosemirror-state';

// Custom Image Resize Extension
const ImageResize = Extension.create({
  name: 'imageResize',
  
  addGlobalAttributes() {
    return [
      {
        types: ['image'],
        attributes: {
          width: {
            default: null,
            parseHTML: element => element.getAttribute('width'),
            renderHTML: attributes => {
              if (!attributes.width) {
                return {};
              }
              return {
                width: attributes.width,
              };
            },
          },
          height: {
            default: null,
            parseHTML: element => element.getAttribute('height'),
            renderHTML: attributes => {
              if (!attributes.height) {
                return {};
              }
              return {
                height: attributes.height,
              };
            },
          },
        },
      },
    ];
  },
});

// Define the props for our editor component
interface TiptapEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
}

export default function TiptapEditor({ initialContent, onChange }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [selectedImagePos, setSelectedImagePos] = useState<number | null>(null);
  
  // Define extensions, including the crucial TextAlign extension
  const extensions = [
    StarterKit.configure({
      // Disable default extensions we might re-implement or conflict with
      bulletList: { keepAttributes: true },
      orderedList: { keepAttributes: true },
      blockquote: false, // We'll configure it separately
    }),
    
    // Crucial for RTL: Configure TextAlign to set 'right' as the default direction
    TextAlign.configure({
      types: ['heading', 'paragraph', 'blockquote'],
      defaultAlignment: 'right', // Forces initial alignment to the right for Arabic
    }),
    
    // Blockquote extension
    Blockquote.configure({
      HTMLAttributes: {
        class: 'border-r-4 border-gray-300 pr-4 my-4',
      },
    }),
    
    // Link extension
    Link.configure({
      openOnClick: true,
      HTMLAttributes: {
        class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    
    // Image extension with resize support
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          width: {
            default: null,
            parseHTML: element => element.getAttribute('width'),
            renderHTML: attributes => {
              if (!attributes.width) {
                return {};
              }
              return {
                width: attributes.width,
              };
            },
          },
          height: {
            default: null,
            parseHTML: element => element.getAttribute('height'),
            renderHTML: attributes => {
              if (!attributes.height) {
                return {};
              }
              return {
                height: attributes.height,
              };
            },
          },
          align: {
            default: 'center',
            parseHTML: element => element.getAttribute('data-align') || 'center',
            renderHTML: attributes => {
              if (!attributes.align) {
                return {};
              }
              return {
                'data-align': attributes.align,
              };
            },
          },
        };
      },
    }).configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'resizable-image rounded-lg my-4',
      },
    }),
    
    // Image resize extension
    ImageResize,
    
    // Placeholder extension
    Placeholder.configure({
      placeholder: 'ابدأ الكتابة من هنا...',
    }),
  ];

  const editor = useEditor({
    extensions,
    content: initialContent,
    immediatelyRender: false, // Prevent SSR hydration mismatches
    // This function runs on every content update and calls the parent's onChange prop
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML()); // We save the content as HTML string
    },
    onSelectionUpdate: ({ editor }) => {
      const { selection } = editor.state;
      const { $anchor } = selection;
      
      // Check if we're selecting an image node
      let imagePos: number | null = null;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image') {
          // Check if selection is within this image node
          if (pos <= $anchor.pos && pos + node.nodeSize > $anchor.pos) {
            imagePos = pos;
            return false; // Stop searching
          }
        }
      });
      
      setSelectedImagePos(imagePos);
    },
    // Enforce RTL direction at the editor level (ProseMirror container)
    editorProps: {
      attributes: {
        dir: 'rtl',
        class: 'prose prose-lg focus:outline-none min-h-[500px] w-full py-4',
        style: 'font-family: var(--font-almarai), sans-serif;',
      },
    },
  });

  // Update editor content when initialContent changes (for editing mode)
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== initialContent) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showImageOptions && !(event.target as Element).closest('.image-dropdown-container')) {
        setShowImageOptions(false);
      }
    };

    if (showImageOptions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showImageOptions]);

  // Handle image clicks to select them
  useEffect(() => {
    if (!editor) return;

    const handleImageClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'IMG' && target.closest('.ProseMirror')) {
        const img = target as HTMLImageElement;
        const { view } = editor;
        const { state } = view;
        
        // Find the image node position
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'image') {
            try {
              const posFromDOM = view.posAtDOM(img, 0);
              if (posFromDOM >= 0 && Math.abs(posFromDOM - pos) < 10) {
                // Select the image using NodeSelection
                const selection = NodeSelection.create(state.doc, pos);
                const tr = state.tr.setSelection(selection);
                view.dispatch(tr);
                setSelectedImagePos(pos);
                return false;
              }
            } catch (e) {
              // Fallback: match by src
              if (node.attrs.src === img.src) {
                const selection = NodeSelection.create(state.doc, pos);
                const tr = state.tr.setSelection(selection);
                view.dispatch(tr);
                setSelectedImagePos(pos);
                return false;
              }
            }
          }
        });
      }
    };

    const editorElement = editor.view.dom as HTMLElement;
    editorElement.addEventListener('click', handleImageClick, true);
    
    return () => {
      editorElement.removeEventListener('click', handleImageClick, true);
    };
  }, [editor]);

  // Image toolbar functions
  const getSelectedImageNode = (): { node: any; pos: number } | null => {
    if (!editor || selectedImagePos === null) return null;
    
    const { state } = editor.view;
    let imageNode: any = null;
    let imagePos = 0;
    
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && pos === selectedImagePos) {
        imageNode = node;
        imagePos = pos;
        return false;
      }
    });
    
    return imageNode ? { node: imageNode, pos: imagePos } : null;
  };

  const updateImageSize = (delta: number) => {
    const imageData = getSelectedImageNode();
    if (!imageData || !editor) return;
    
    const { node, pos } = imageData;
    const { view } = editor;
    
    // Get actual image dimensions from DOM if not in attributes
    let currentWidth = parseInt(node.attrs.width || '0');
    let currentHeight = parseInt(node.attrs.height || '0');
    
    if (!currentWidth || !currentHeight) {
      // Try to get from DOM
      try {
        const domNode = view.nodeDOM(pos);
        if (domNode && domNode instanceof HTMLImageElement) {
          currentWidth = domNode.naturalWidth || domNode.offsetWidth || 500;
          currentHeight = domNode.naturalHeight || domNode.offsetHeight || 300;
        }
      } catch (e) {
        currentWidth = 500;
        currentHeight = 300;
      }
    }
    
    const aspectRatio = currentWidth / currentHeight;
    const newWidth = Math.max(100, Math.min(currentWidth + delta, 2000));
    const newHeight = Math.round(newWidth / aspectRatio);
    
    const { state, dispatch } = view;
    const tr = state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      width: newWidth.toString(),
      height: newHeight.toString(),
    });
    dispatch(tr);
    view.focus();
  };

  const updateImageAlignment = (align: 'right' | 'center' | 'left') => {
    const imageData = getSelectedImageNode();
    if (!imageData || !editor) return;
    
    const { node, pos } = imageData;
    
    const { state, dispatch } = editor.view;
    const tr = state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      align: align,
    });
    dispatch(tr);
    editor.view.focus();
  };

  // Medium-style menu bar
  const MenuBar = () => {
    if (!editor) return null;

    const setLink = () => {
      const previousUrl = editor.getAttributes('link').href;
      const url = window.prompt('أدخل الرابط:', previousUrl || '');

      if (url === null) {
        return;
      }

      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }

      // Ensure URL has protocol
      const finalUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;

      // If text is selected, apply link to selection, otherwise insert link
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<a href="${finalUrl}">${finalUrl}</a>`).run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
      }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('الرجاء اختيار ملف صورة صحيح');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          // Create image element to get dimensions
          const img = document.createElement('img');
          img.onload = () => {
            const maxWidth = 600;
            const aspectRatio = img.naturalHeight / img.naturalWidth;
            const width = Math.min(img.naturalWidth, maxWidth);
            const height = Math.round(width * aspectRatio);
            editor.chain().focus().setImage({ 
              src: base64,
              width: width,
              height: height
            }).run();
            
            // Set alignment separately
            setTimeout(() => {
              const { state } = editor.view;
              state.doc.descendants((node, pos) => {
                if (node.type.name === 'image' && node.attrs.src === base64) {
                  const { dispatch } = editor.view;
                  const tr = state.tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    align: 'center'
                  });
                  dispatch(tr);
                  return false;
                }
              });
            }, 50);
          };
          img.src = base64;
        }
      };
      reader.onerror = () => {
        alert('حدث خطأ أثناء قراءة الملف');
      };
      reader.readAsDataURL(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowImageOptions(false);
    };

    const handleImageFromUrl = () => {
      const url = window.prompt('أدخل رابط الصورة:', '');

      if (url && url.trim() !== '') {
        // Ensure URL has protocol
        const finalUrl = url.startsWith('http://') || url.startsWith('https://') 
          ? url 
          : `https://${url}`;
        // Create image element to get dimensions
        const img = document.createElement('img');
        img.onload = () => {
          const maxWidth = 600;
          const aspectRatio = img.naturalHeight / img.naturalWidth;
          const width = Math.min(img.naturalWidth, maxWidth);
          const height = Math.round(width * aspectRatio);
          editor.chain().focus().setImage({ 
            src: finalUrl,
            width: width,
            height: height
          }).run();
          
          // Set alignment separately
          setTimeout(() => {
            const { state } = editor.view;
            state.doc.descendants((node, pos) => {
              if (node.type.name === 'image' && node.attrs.src === finalUrl) {
                const { dispatch } = editor.view;
                const tr = state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  align: 'center'
                });
                dispatch(tr);
                return false;
              }
            });
          }, 50);
        };
        img.onerror = () => {
          // If image fails to load, insert without dimensions
          editor.chain().focus().setImage({ 
            src: finalUrl
          }).run();
        };
        img.src = finalUrl;
      }
      setShowImageOptions(false);
    };

    const handleImageUpload = () => {
      fileInputRef.current?.click();
    };

    return (
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-3 mb-6">
        {/* BOLD Button */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('bold') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="عريض"
        >
          <strong>B</strong>
        </button>

        {/* ITALIC Button */}
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('italic') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="مائل"
        >
          <em>i</em>
        </button>

        {/* Strike Button */}
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('strike') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="يتوسطه خط"
        >
          <span className="line-through">S</span>
        </button>

        {/* Heading 1 Button */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="عنوان رئيسي"
        >
          H1
        </button>

        {/* Heading 2 Button */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="عنوان فرعي"
        >
          H2
        </button>
        
        {/* Heading 3 Button */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="عنوان صغير"
        >
          H3
        </button>

        {/* Blockquote Button */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('blockquote') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="اقتباس"
        >
          ❝
        </button>

        {/* Code Block Button */}
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('codeBlock') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="كود"
        >
          &lt;/&gt;
        </button>

        {/* Bullet List Button */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="قائمة نقطية"
        >
          •
        </button>

        {/* Ordered List Button */}
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="قائمة مرقمة"
        >
          1.
        </button>

        {/* Link Button */}
        <button
          onClick={setLink}
          type="button"
          className={`py-2 px-3 text-sm rounded transition-colors ${
            editor.isActive('link') ? 'bg-gray-200 text-black font-semibold' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="رابط"
        >
          🔗
        </button>

        {/* Image Button with dropdown */}
        <div className="relative image-dropdown-container">
          <button
            onClick={() => setShowImageOptions(!showImageOptions)}
            type="button"
            className="py-2 px-3 text-sm rounded transition-colors text-gray-600 hover:bg-gray-100"
            title="إضافة صورة"
          >
            🖼️
          </button>
          
          {showImageOptions && (
            <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]" dir="rtl">
              <button
                onClick={handleImageUpload}
                type="button"
                className="w-full text-right px-4 py-2 hover:bg-gray-100 text-sm rounded-t-lg"
              >
                📁 رفع من الجهاز
              </button>
              <button
                onClick={handleImageFromUrl}
                type="button"
                className="w-full text-right px-4 py-2 hover:bg-gray-100 text-sm rounded-b-lg border-t border-gray-200"
              >
                🔗 إدراج رابط
              </button>
            </div>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  };

  // Image toolbar component
  const ImageToolbar = () => {
    if (!editor || selectedImagePos === null) return null;
    
    const imageData = getSelectedImageNode();
    if (!imageData) return null;
    
    const { node } = imageData;
    const currentAlign = node.attrs.align || 'center';
    
    return (
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 z-50">
        <span className="text-xs text-gray-600 mr-2">حجم الصورة:</span>
        <button
          onClick={() => updateImageSize(-50)}
          type="button"
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="تصغير"
        >
          −
        </button>
        <button
          onClick={() => updateImageSize(50)}
          type="button"
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="تكبير"
        >
          +
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <span className="text-xs text-gray-600 mr-2">محاذاة:</span>
        <button
          onClick={() => updateImageAlignment('right')}
          type="button"
          className={`px-3 py-1 text-sm rounded ${
            currentAlign === 'right' ? 'bg-gray-200 text-black' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title="يمين"
        >
          ↶
        </button>
        <button
          onClick={() => updateImageAlignment('center')}
          type="button"
          className={`px-3 py-1 text-sm rounded ${
            currentAlign === 'center' ? 'bg-gray-200 text-black' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title="وسط"
        >
          ↕
        </button>
        <button
          onClick={() => updateImageAlignment('left')}
          type="button"
          className={`px-3 py-1 text-sm rounded ${
            currentAlign === 'left' ? 'bg-gray-200 text-black' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title="يسار"
        >
          ↷
        </button>
      </div>
    );
  };

  return (
    <div className="editor-container relative">
      <MenuBar />
      {/* EditorContent container uses the styling defined in editorProps */}
      <EditorContent editor={editor} className="focus:outline-none" />
      <ImageToolbar />
    </div>
  );
}