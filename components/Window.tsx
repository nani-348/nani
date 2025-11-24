import React, { useRef, useCallback } from 'react';
import { type WindowState, type SnapTarget } from '../types';

interface WindowProps {
  state: WindowState;
  isActive: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onToggleFullScreen: () => void;
  onFocus: () => void;
  onUpdate: (updates: Partial<WindowState>) => void;
  onSnapPreview: (target: SnapTarget | null) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

export const Window: React.FC<WindowProps> = ({
  state,
  isActive,
  onClose,
  onMinimize,
  onToggleFullScreen,
  onFocus,
  onUpdate,
  onSnapPreview,
  children,
  style
}) => {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const initialPos = useRef<{ x: number; y: number } | null>(null);
  const snapTargetRef = useRef<SnapTarget | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (state.isFullScreen) return;
    e.preventDefault();
    onFocus();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialPos.current = state.position;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current || !initialPos.current) return;
      const dx = moveEvent.clientX - dragStartPos.current.x;
      const dy = moveEvent.clientY - dragStartPos.current.y;
      
      const { clientX, clientY } = moveEvent;
      const { innerWidth, innerHeight } = window;
      const menuBarHeight = 28;
      const SNAP_THRESHOLD = 5;

      let currentSnapTarget: SnapTarget | null = null;
      
      // Top snap (fullscreen)
      if (clientY <= SNAP_THRESHOLD) {
          currentSnapTarget = {
              x: 0, y: menuBarHeight, width: innerWidth, height: innerHeight - menuBarHeight, isFullScreen: true,
          };
      } 
      // Left snap
      else if (clientX <= SNAP_THRESHOLD) {
          currentSnapTarget = {
              x: 0, y: menuBarHeight, width: Math.round(innerWidth / 2), height: innerHeight - menuBarHeight,
          };
      } 
      // Right snap
      else if (clientX >= innerWidth - SNAP_THRESHOLD) {
          currentSnapTarget = {
              x: Math.round(innerWidth / 2), y: menuBarHeight, width: Math.round(innerWidth / 2), height: innerHeight - menuBarHeight,
          };
      }

      // Only update preview if it changes
      if (JSON.stringify(snapTargetRef.current) !== JSON.stringify(currentSnapTarget)) {
        onSnapPreview(currentSnapTarget);
      }
      snapTargetRef.current = currentSnapTarget;

      // If not snapping, perform normal drag
      if (!currentSnapTarget) {
          onUpdate({ position: { x: initialPos.current.x + dx, y: initialPos.current.y + dy } });
      }
    };

    const handleMouseUp = () => {
      if (snapTargetRef.current) {
          if (snapTargetRef.current.isFullScreen) {
              onUpdate({ isFullScreen: true });
          } else {
              const { x, y, width, height } = snapTargetRef.current;
              onUpdate({
                  position: { x, y },
                  size: { width, height },
                  isFullScreen: false,
              });
          }
      }

      onSnapPreview(null);
      snapTargetRef.current = null;
      dragStartPos.current = null;
      initialPos.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onFocus, onUpdate, state.position, state.size, state.isFullScreen, onSnapPreview, onToggleFullScreen]);


  const handleResizeMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    if (state.isFullScreen) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus();

    const startPos = { x: e.clientX, y: e.clientY };
    const initialSize = state.size;
    const initialPosition = state.position;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startPos.x;
        const dy = moveEvent.clientY - startPos.y;
        
        let newWidth = initialSize.width;
        let newHeight = initialSize.height;
        let newX = initialPosition.x;
        let newY = initialPosition.y;

        if (direction.includes('right')) newWidth = initialSize.width + dx;
        if (direction.includes('left')) {
            newWidth = initialSize.width - dx;
            newX = initialPosition.x + dx;
        }
        if (direction.includes('bottom')) newHeight = initialSize.height + dy;
        if (direction.includes('top')) {
            newHeight = initialSize.height - dy;
            newY = initialPosition.y + dy;
        }

        const finalWidth = Math.max(MIN_WIDTH, newWidth);
        const finalHeight = Math.max(MIN_HEIGHT, newHeight);

        // Adjust position if width/height was clamped on left/top resize
        if (finalWidth === MIN_WIDTH && direction.includes('left')) newX = initialPosition.x + initialSize.width - MIN_WIDTH;
        if (finalHeight === MIN_HEIGHT && direction.includes('top')) newY = initialPosition.y + initialSize.height - MIN_HEIGHT;


        onUpdate({
            size: { width: finalWidth, height: finalHeight },
            position: { x: newX, y: newY }
        });
    };
    
    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onFocus, onUpdate, state.size, state.position, state.isFullScreen]);


  const windowStyle: React.CSSProperties = state.isFullScreen
    ? {
        top: '28px',
        left: '0px',
        width: '100vw',
        height: 'calc(100vh - 28px)',
        zIndex: state.zIndex,
      }
    : {
        top: `${state.position.y}px`,
        left: `${state.position.x}px`,
        width: `${state.size.width}px`,
        height: `${state.size.height}px`,
        zIndex: state.zIndex,
      };
      
  const resizeHandles = [
    { direction: 'top-left', cursor: 'nwse-resize', className: 'top-0 left-0' },
    { direction: 'top', cursor: 'ns-resize', className: 'top-0 left-1/2 -translate-x-1/2' },
    { direction: 'top-right', cursor: 'nesw-resize', className: 'top-0 right-0' },
    { direction: 'left', cursor: 'ew-resize', className: 'top-1/2 -translate-y-1/2 left-0' },
    { direction: 'right', cursor: 'ew-resize', className: 'top-1/2 -translate-y-1/2 right-0' },
    { direction: 'bottom-left', cursor: 'nesw-resize', className: 'bottom-0 left-0' },
    { direction: 'bottom', cursor: 'ns-resize', className: 'bottom-0 left-1/2 -translate-x-1/2' },
    { direction: 'bottom-right', cursor: 'nwse-resize', className: 'bottom-0 right-0' },
  ];

  const windowClasses = [
    'absolute',
    'bg-gray-100 dark:bg-gray-800',
    'shadow-2xl border border-black/10',
    'flex flex-col overflow-hidden',
    state.isFullScreen ? 'rounded-none transition-all duration-300 ease-in-out' : 'rounded-lg',
    !state.isFullScreen && !state.minimizing && 'transition-all duration-100 ease-in-out',
    !isActive && 'opacity-95',
    state.minimizing && 'animate-minimize',
    state.closing && 'animate-close-pop',
  ].filter(Boolean).join(' ');


  return (
    <div
      className={windowClasses}
      style={{...windowStyle, ...style}}
      onMouseDown={onFocus}
    >
       {!state.isFullScreen && resizeHandles.map(handle => (
        <div
            key={handle.direction}
            onMouseDown={(e) => handleResizeMouseDown(e, handle.direction)}
            style={{ 
                position: 'absolute', 
                cursor: handle.cursor,
                width: handle.direction.includes('left') || handle.direction.includes('right') ? '8px' : '100%',
                height: handle.direction.includes('top') || handle.direction.includes('bottom') ? '8px' : '100%',
                zIndex: 50,
            }}
            className={handle.className}
         />
       ))}

      <header
        className="h-8 bg-gray-200 dark:bg-gray-700 flex items-center px-3 flex-shrink-0"
        onMouseDown={handleDragStart}
        onDoubleClick={onToggleFullScreen}
        style={{ cursor: state.isFullScreen ? 'default' : 'move' }}
      >
        <div className="flex space-x-2">
          <button onClick={onClose} className="w-3.5 h-3.5 bg-red-500 rounded-full hover:bg-red-600"></button>
          <button onClick={onMinimize} className="w-3.5 h-3.5 bg-yellow-500 rounded-full hover:bg-yellow-600"></button>
          <button onClick={onToggleFullScreen} className="w-3.5 h-3.5 bg-green-500 rounded-full hover:bg-green-600"></button>
        </div>
        <div className="flex-1 text-center text-sm font-medium text-gray-800 dark:text-gray-200 pr-16">
          {state.title}
        </div>
      </header>
      <div className="flex-1 bg-white dark:bg-gray-900 overflow-auto">
        {children}
      </div>
    </div>
  );
};