

import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App, { AppRef, DataChangeInfo, RawNode, OperationType, InteractionMode } from './App';
import { mockInitialData } from './mockData';
import { FiMousePointer, FiMove } from 'react-icons/fi';
import { RemarkDrawer } from './components/RemarkDrawer';
import './styles.css'

// 辅助函数：递归丰富数据，模拟后端处理逻辑
const enrichRawData = (node: RawNode): RawNode => {
    // 1. 如果节点没有 ID (说明是前端新加的或复制粘贴的)，模拟生成 ID
    if (!node.id) {
        node.id = Math.floor(Math.random() * 100000000);
        
        // 2. 模拟后端为特定类型的节点添加默认业务属性 (评审、备注、评分)
        // 这些属性会导致前端渲染图标，从而测试布局是否会自动适应
        if (['moduleNode', 'testPointNode', 'caseNode'].includes(node.nodeType || '')) {
             node.reviewStatusCode = 'pending_review'; 
             node.reviewStatusName = '待评审';
             // 强制设置为 true 以测试回显时的布局挤压问题
             node.hasRemark = true;
             node.hasScore = true;
             node.scoreInfo = { scoreValue: 5, scoreName: '优秀', scoreCode: 'EXCELLENT' };
        }

        // 3. 如果是用例节点，模拟添加功能用例 DTO，触发“功能”标签和状态显示
        if (node.nodeType === 'caseNode') {
            if (!node.functionTestCaseDTO) {
                node.functionTestCaseDTO = {
                    executionStatus: 'not_run', 
                    finalStatus: 'pending_execution',
                    testCaseName: node.name
                };
            }
        }
    }

    // 递归处理子节点
    if (node.childNodeList) {
        node.childNodeList = node.childNodeList.map(enrichRawData);
    }
    return node;
};

// 模拟一个后端 API
const fakeApi = {
  // 接收前端数据，处理后返回更新后的完整数据
  saveData: (data: RawNode): Promise<{ success: boolean, updatedData: RawNode }> => {
    console.log("☁️ [Backend] 正在向服务器后台保存数据...", data);
    
    const now = new Date().toLocaleTimeString();
    
    // 深拷贝以避免直接修改输入引用 (虽然在 App 外部是新的引用)
    let updatedDataFromServer = JSON.parse(JSON.stringify(data));

    // 1. 更新根节点名字以显示保存状态
    updatedDataFromServer.name = updatedDataFromServer.name ? (updatedDataFromServer.name.split(' (Last Saved:')[0] + ` (Last Saved: ${now})`) : 'Undefined';
    
    // 2. 调用辅助函数，模拟后端填充 ID 和业务字段
    updatedDataFromServer = enrichRawData(updatedDataFromServer);

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
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('zoom'); // 交互模式：缩放/滚动
    
    // State for Custom Remark Drawer
    const [remarkDrawerVisible, setRemarkDrawerVisible] = useState(false);
    const [activeRemarkNode, setActiveRemarkNode] = useState<RawNode | null>(null);

    // 递归查找节点 (用于在点击备注时获取节点信息)
    const findNodeByUuid = useCallback((node: RawNode, uuid: string): RawNode | null => {
        if (node.uuid === uuid) return node;
        if (node.childNodeList) {
            for (const child of node.childNodeList) {
                const found = findNodeByUuid(child, uuid);
                if (found) return found;
            }
        }
        return null;
    }, []);
    
    // 获取当前数据的 ref，以便在 callback 中访问最新状态
    const currentDataRef = useRef<RawNode>(mockInitialData);

    // 统一的保存处理逻辑 (无论是自动保存触发还是手动按钮触发)
    const handleSave = useCallback(async (info: DataChangeInfo) => {
        if (!mindMapRef.current) return;
        
        // 更新本地数据 ref
        currentDataRef.current = info.currentRawData;
        
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

                // 更新本地数据 ref
                currentDataRef.current = result.updatedData;

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
        // 更新本地数据 ref，确保后续点击备注时能查找到最新节点
        currentDataRef.current = info.currentRawData;

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

    // Handle opening the custom remark drawer
    const handleRemarkClick = useCallback((nodeUuid: string) => {
        // Find the full node data from current data source
        const node = findNodeByUuid(currentDataRef.current, nodeUuid);
        if (node) {
            setActiveRemarkNode(node);
            setRemarkDrawerVisible(true);
        }
    }, [findNodeByUuid]);

    // Handle saving the remark from the drawer
    const handleSaveRemark = useCallback((content: string) => {
        if (activeRemarkNode && mindMapRef.current) {
            // Use the imperative API to update the node's remark
            // This will trigger internal logic to add it to history
            mindMapRef.current.confirmRemark(activeRemarkNode.uuid!, content);
            setRemarkDrawerVisible(false);
            setStatusText('📝 备注已更新');
        }
    }, [activeRemarkNode]);

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

                    {/* 交互模式切换 (滚轮行为) - 在只读和编辑模式下均显示 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0f0f0', padding: '2px', borderRadius: '6px' }}>
                        <button 
                            onClick={() => setInteractionMode('zoom')}
                            title="缩放模式：滚轮缩放画布"
                            style={{
                                border: 'none',
                                background: interactionMode === 'zoom' ? '#fff' : 'transparent',
                                color: interactionMode === 'zoom' ? '#007aff' : '#666',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                boxShadow: interactionMode === 'zoom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'
                            }}
                        >
                            <FiMousePointer size={14} /> 缩放
                        </button>
                        <button 
                            onClick={() => setInteractionMode('scroll')}
                            title="滚动模式：滚轮移动画布"
                            style={{
                                border: 'none',
                                background: interactionMode === 'scroll' ? '#fff' : 'transparent',
                                color: interactionMode === 'scroll' ? '#007aff' : '#666',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                boxShadow: interactionMode === 'scroll' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'
                            }}
                        >
                            <FiMove size={14} /> 滚动
                        </button>
                    </div>
                    
                    <span style={{ color: '#ddd' }}>|</span>
                    
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

                    // 传递交互模式
                    interactionMode={interactionMode}
                    onInteractionModeChange={setInteractionMode}
                    
                    // 传递自定义备注点击回调
                    onRemarkClick={handleRemarkClick}

                    // 当自动保存开启时，可以隐藏保存按钮，或者保留它作为“立即保存”
                    topToolbarCommands={['undo', 'redo', 'separator', 'addSibling', 'addChild', 'delete', 'save', 'closeTop']}
                 />

                 {/* Custom Remark Drawer rendered at top level */}
                 <RemarkDrawer 
                    visible={remarkDrawerVisible}
                    node={activeRemarkNode}
                    onClose={() => setRemarkDrawerVisible(false)}
                    onSave={handleSaveRemark}
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
