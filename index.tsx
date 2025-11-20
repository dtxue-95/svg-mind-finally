import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App, { AppRef, DataChangeInfo, RawNode, OperationType } from './App';
import { mockInitialData } from './mockData';
import './styles.css'

// 模拟一个后端 API
const fakeApi = {
  // 接收前端数据，处理后返回更新后的完整数据
  saveData: (data: RawNode): Promise<{ success: boolean, updatedData: RawNode }> => {
    console.log("☁️ [Backend] 正在向服务器后台保存数据...", data);
    
    // 模拟后端处理：
    // 1. 给根节点名称加上时间戳表明保存时间
    // 2. 实际业务中，这里会为新节点生成数据库 ID
    const now = new Date().toLocaleTimeString();
    const updatedDataFromServer = {
      ...data,
      // 仅为了演示：更新根节点名字以显示保存状态
      name: data.name ? (data.name.split(' (Last Saved:')[0] + ` (Last Saved: ${now})`) : 'Undefined', 
    };

    return new Promise(resolve => {
      setTimeout(() => {
        console.log("✅ [Backend] 保存成功！后端返回了更新后的数据。");
        resolve({ success: true, updatedData: updatedDataFromServer });
      }, 600); // 模拟 0.6秒 网络延迟
    });
  },
};


function ComprehensiveExample() {
    const mindMapRef = useRef<AppRef>(null);
    const [statusText, setStatusText] = useState('只读模式。点击右下角锁图标或使用 Shift+W 切换编辑模式。');
    const [lastSavedTime, setLastSavedTime] = useState<string>('-');
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false); // 默认关闭自动保存
    const [isReadOnly, setIsReadOnly] = useState(true); // 追踪 xmind 的只读状态

    // 统一的保存处理逻辑 (无论是自动保存触发还是手动按钮触发)
    const handleSave = useCallback(async (info: DataChangeInfo) => {
        if (!mindMapRef.current) return;
        
        const isAutoSave = info.description === 'Auto-save triggered';
        const triggerType = isAutoSave ? '自动' : '手动';
        setStatusText(`⏳ 正在${triggerType}保存...`);
        
        // 获取当前的层级数据
        const dataToSave = info.currentRawData;

        try {
            // 2. 发送给后端
            const result = await fakeApi.saveData(dataToSave);

            if (result.success) {
                // 3. 后端返回成功后，使用 syncData 无感同步
                // 如果是自动保存，第二个参数传 true，保留撤销/重做历史
                if (isAutoSave) {
                    mindMapRef.current.syncData(result.updatedData, true);
                    // 自动保存不调用 resetHistory，以便用户可以继续撤销
                } else {
                    // 手动保存，视为一个“提交点”，可以清除历史记录 (或者也可以选择保留)
                    mindMapRef.current.syncData(result.updatedData, false);
                    mindMapRef.current.resetHistory();
                }

                setStatusText('✅ 已保存');
                setLastSavedTime(new Date().toLocaleTimeString());
            }
        } catch (error) {
            setStatusText('❌ 保存失败');
            console.error(error);
        }
    }, []);

    // 监听数据变化的回调 (仅用于更新 UI 状态)
    const handleDataChange = useCallback((info: DataChangeInfo) => {
        const ignoredOperations = [
            OperationType.SELECT_NODE,
            OperationType.LOAD_DATA,
            OperationType.SYNC_DATA,
            OperationType.LAYOUT,
            OperationType.EXPAND_NODES,
            OperationType.TOGGLE_NODE_COLLAPSE,
            OperationType.SAVE
        ];

        if (!ignoredOperations.includes(info.operationType)) {
            setStatusText('📝 检测到更改...');
        }
    }, []);

    const handleReadOnlyChange = useCallback((readOnly: boolean) => {
        setIsReadOnly(readOnly);
        if (readOnly) {
            setStatusText('只读模式');
        } else {
            setStatusText('编辑模式');
        }
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
                padding: '10px 20px', 
                background: '#fff', 
                borderBottom: '1px solid #e1e4e8', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                fontSize: '14px',
                color: '#333',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <strong style={{ fontSize: '16px' }}>React Mind Map Demo</strong>
                    <span style={{ color: '#ddd' }}>|</span>
                    
                    {/* 仅在编辑模式下显示自动保存开关 */}
                    {!isReadOnly && (
                        <>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                                <input 
                                    type="checkbox" 
                                    checked={isAutoSaveEnabled} 
                                    onChange={(e) => setIsAutoSaveEnabled(e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 500 }}>自动保存</span>
                            </label>
                            <span style={{ color: '#ddd' }}>|</span>
                        </>
                    )}
                    
                    <span style={{ color: '#555' }}>{statusText}</span>
                </div>
                <div style={{ color: '#888', fontSize: '12px' }}>
                    最后保存时间: {lastSavedTime}
                </div>
            </div>
            <div style={{ flexGrow: 1, position: 'relative' }}>
                 <App
                    ref={mindMapRef}
                    initialData={mockInitialData}
                    onDataChange={handleDataChange}
                    onSave={handleSave}
                    // 启用新的 API Prop
                    enableAutoSave={isAutoSaveEnabled}
                    autoSaveDelay={1000} // 1秒防抖
                    
                    // 监听只读状态变化
                    onReadOnlyChange={handleReadOnlyChange}

                    // 当自动保存开启时，可以隐藏保存按钮，或者保留它作为“立即保存”
                    topToolbarCommands={['undo', 'redo', 'separator', 'addSibling', 'addChild', 'delete', 'save', 'closeTop']}
                 />
            </div>
        </div>
    );
}


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ComprehensiveExample />
  </React.StrictMode>
);