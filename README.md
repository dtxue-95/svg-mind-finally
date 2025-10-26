# React SVG 思维导图组件

一个使用 React, TypeScript 和 SVG 构建的交互式思维导图组件。它允许用户以可视化方式创建、组织和编辑层级化的思想节点。

## 核心功能

- **节点操作**:
    - **添加/删除**: 支持添加子节点、同级节点和删除节点（包括所有后代）。
    - **编辑文本**: 双击节点即可编辑其文本内容。
    - **移动与排序**:
        - **自由拖拽 (`isDraggable`)**: 自由移动节点位置，不改变其父子关系。
        - **结构化拖拽 (`enableStrictDrag`)**: 根据预设规则拖拽节点以更改其父节点。
        - **同级排序 (`enableNodeReorder`)**: 通过拖拽对同级节点进行排序。
    - **键盘快捷键**: 支持 `Tab` (子节点), `Enter` (同级节点), `Delete` (删除), `Cmd/Ctrl+Z/Y` (撤销/重做) 等。
- **评审与反馈系统**:
    - **评审状态**: 支持为节点设置“待评审”、“通过”、“未通过”状态，状态会从子节点向上聚合。
    - **一键评审**: 支持在父节点上批量更新所有后代用例的评审状态。
    - **节点备注**: 允许用户为节点添加多条带时间戳和用户信息的备注。
    - **节点评分**: 支持对节点进行五星评分并附带评语。
- **视图控制**:
    - **缩放与平移**: 支持鼠标滚輪缩放和画布拖拽平移。
    - **视图命令**: 一键适应视图、视图居中、全屏模式。
    - **小地图 (Minimap)**: 提供全局概览和快速导航功能。
- **布局与结构**:
    - **自动布局**: 一键整理所有节点，使其排列整齐。
    - **折叠/展开**: 支持单个节点或所有节点的折叠与展开。
    - **按层级折叠/展开**: 支持按节点类型（如模块、测试点、用例）批量折叠或展开节点。
- **状态管理**:
    - **历史记录**: 无限次撤销和重做。
    - **“未保存”状态 (`isDirty`)**: 自动追踪是否有未保存的更改，用于控制“保存”按钮的可用性。
    - **命令式 API**: 通过 `ref` 提供 `setData`, `resetHistory`, `setReadOnly` 等方法，允许外部在保存成功后重置组件状态。
- **高度可定制**:
    - **工具栏**: 可完全自定义顶部和底部工具栏的按钮及其顺序。
    - **上下文菜单**: 为节点和画布提供功能丰富的右键菜单。
    - **节点属性**: 支持修改节点类型和优先级。
    - **回调函数**: 提供强大的 `onDataChange`, `onSave`, `onExecuteUseCase` 及评审相关回调，轻松与外部应用状态集成。
    - **外观**: 可自定义画布背景、节点背景色、AI 标签等。
    - **自定义面板 (`Panel`)**: 允许在画布的任意位置渲染自定义 React 组件。

---

## 快速上手

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { mockInitialData } from './mockData';
import './styles.css';

function SimpleExample() {
    return (
        <div style={{width: '100%', height: '100vh'}}>
            <App initialData={mockInitialData} />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SimpleExample />
  </React.StrictMode>
);
```

---

## 综合用法示例

这个示例演示了更高级的用法，包括异步数据加载、处理保存逻辑、使用 `ref` 和各种回调。

```jsx
import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App, { AppRef, Panel, DataChangeInfo, MindMapNodeData, RawNode, OperationType } from './App';
import './styles.css';

// 模拟一个 API 调用
const fakeApi = {
  fetchData: (): Promise<RawNode> => new Promise(resolve => setTimeout(() => resolve({
    uuid: "async-root-uuid",
    name: "从 API 加载的数据",
    nodeType: "rootNode",
    childNodeList: [{ uuid: "async-child-1", name: "第一个子节点", nodeType: "moduleNode" }]
  }), 1500)),
  saveData: (data: RawNode): Promise<{success: boolean}> => new Promise(resolve => {
    console.log("正在向服务器保存数据...", data);
    const isSuccess = Math.random() > 0.2;
    setTimeout(() => {
      console.log(isSuccess ? "保存成功！" : "保存失败！");
      resolve({ success: isSuccess });
    }, 1000);
  }),
};


function ComprehensiveExample() {
    const mindMapRef = useRef<AppRef>(null);
    const [mindMapData, setMindMapData] = useState<RawNode | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. 异步加载初始数据
    useEffect(() => {
      fakeApi.fetchData().then(data => {
        setMindMapData(data);
        setIsLoading(false);
      });
    }, []);

    // 2. onDataChange 回调：监听所有内部变更
    const handleDataChange = (info: DataChangeInfo) => {
        if (info.operationType !== OperationType.LOAD_DATA) {
            console.log(`操作类型: ${info.operationType}`, info);
        }
    };

    // 3. onSave 回调：处理用户点击“保存”按钮的逻辑
    const handleSave = async (info: DataChangeInfo) => {
        console.log("UI 保存按钮被点击，准备保存...");
        
        try {
            const result = await fakeApi.saveData(info.currentRawData);

            if (result.success) {
                // 4. 保存成功：重置历史记录并设为只读
                alert("保存成功！");
                mindMapRef.current?.resetHistory();
                mindMapRef.current?.setReadOnly(true);
            } else {
                // 5. 保存失败：提示用户，并保持编辑状态
                alert("保存失败，请检查网络后重试。");
            }
        } catch (error) {
            alert("保存时发生未知错误。");
            console.error(error);
        }
    };
    
    // 6. 评审与反馈回调
    const handleConfirmReview = (info: DataChangeInfo) => {
      console.log('评审状态已确认:', info);
      // 在这里可以调用 API 更新后端状态
    };
    const handleConfirmRemark = (info: DataChangeInfo) => {
      console.log('备注已添加:', info);
    };
    const handleConfirmScore = (info: DataChangeInfo) => {
      console.log('评分已提交:', info);
    };
    
    // 7. 使用 ref API 从外部触发操作
    const handleSetNewData = () => {
        const newData = { uuid: "new-data-root", name: "由外部设置的全新数据", nodeType: "rootNode" };
        mindMapRef.current?.setData(newData);
    };

    if (isLoading) {
        return <div>正在加载思维导图...</div>;
    }

    return (
        <div style={{width: '100%', height: '100vh', position: 'relative'}}>
            <div style={{ position: 'absolute', top: 5, left: 5, zIndex: 100, background: '#fff', padding: '5px', borderRadius: '5px' }}>
              <button onClick={handleSetNewData}>从外部设置新数据</button>
            </div>

            <App
              ref={mindMapRef}
              initialData={mindMapData!}
              onDataChange={handleDataChange}
              onSave={handleSave}
              onConfirmReviewStatus={handleConfirmReview}
              onConfirmRemark={handleConfirmRemark}
              onConfirmScore={handleConfirmScore}
              showMinimap={true}
              connectorStyle="curve"
            >
              <Panel position="top-left">
                <div style={{padding: '10px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', border: '1px solid #ddd', marginTop: '30px'}}>
                    <h3>综合示例</h3>
                    <p>尝试编辑节点，然后点击保存。</p>
                </div>
              </Panel>
            </App>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ComprehensiveExample />);
```

---

## API 参考

### Props (`App` 组件)

#### 数据与回调

| Prop 名称               | 类型                                     | 描述                                                                                                                                                                                                                                                                | 默认值                       |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `initialData`           | `RawNode`                                | 用于初始化思维导图的层级化数据结构。**注意：** 这是一个受控属性。在组件挂载后，若此 prop 的引用发生变化（例如，父组件状态更新），将导致思维导图**完全重新加载**，当前的所有状态（包括编辑内容和历史记录）都将被**清空**。如需以命令式方式加载新数据，请使用 `ref.current.setData()` 方法。 | 内置的示例数据               |
| `children`              | `React.ReactNode`                        | 在画布上渲染自定义子组件，通常与 `<Panel>` 组件结合使用。                                                                                                                                                                                                           | `undefined`                  |
| `onDataChange`          | `(info: DataChangeInfo) => void`         | **核心回调**。当导图数据发生任何变更时触发。                                                                                                                                                                                                                        | `(info) => console.log(...)` |
| `onSave`                | `(info: DataChangeInfo) => void`         | 当用户点击工具栏中的“保存”按钮时触发的回调函数。**这是实现保存逻辑的主要入口。**                                                                                                                                                                                      | `(info) => console.log(...)` |
| `onExecuteUseCase`      | `(info: DataChangeInfo) => void`         | 当用户通过上下文菜单或 API 执行用例时触发的回调函数。                                                                                                                                                                                                                 | `(info) => console.log(...)` |
| `onConfirmReviewStatus` | `(info: DataChangeInfo) => void`         | 当用户在评审弹窗中点击“确定”后触发。`info` 对象包含了此次变更的完整上下文。                                                                                                                                                                                           | `(info) => console.log(...)` |
| `onConfirmRemark`       | `(info: DataChangeInfo) => void`         | 当用户在备注弹窗中添加新备注后触发。                                                                                                                                                                                                                                  | `(info) => console.log(...)` |
| `onConfirmScore`        | `(info: DataChangeInfo) => void`         | 当用户在评分弹窗中提交评分后触发。                                                                                                                                                                                                                                    | `(info) => console.log(...)` |
| `getNodeBackgroundColor`| `(node: MindMapNodeData) => string`      | 一个回调函数，接收每个节点的数据并返回一个 CSS 颜色字符串作为节点背景色。                                                                                                                                                                                             | `undefined`                  |

#### 功能开关

| Prop 名称                         | 类型                                     | 描述                                                                                                                                                             | 默认值                                                   |
| --------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `isDraggable`                     | `boolean`                                | 是否允许用户通过拖拽自由移动节点位置（不改变父子关系）。                                                                                                         | `false`                                                  |
| `enableStrictDrag`                | `boolean`                                | 是否启用结构化拖拽模式，允许节点根据规则重新父级化。                                                                                                             | `true`                                                   |
| `enableNodeReorder`               | `boolean`                                | 是否允许通过拖拽来对同级节点进行排序。                                                                                                                           | `true`                                                   |
| `reorderableNodeTypes`            | `NodeType[]`                             | 定义了哪些节点类型可以被拖拽挂载和排序。                                                                                                                         | `['MODULE', 'TEST_POINT', 'USE_CASE', 'STEP']`           |
| `enableUseCaseExecution`          | `boolean`                                | 是否启用“执行用例”功能。                                                                                                                                         | `true`                                                   |
| `enableReadOnlyUseCaseExecution`  | `boolean`                                | 在只读模式下，是否允许通过右键菜单执行用例。                                                                                                                     | `true`                                                   |
| `enableExpandCollapseByLevel`     | `boolean`                                | 是否在画布右键菜单中启用“按节点类型展开/收起”的功能。                                                                                                            | `true`                                                   |
| `enableReviewStatus`              | `boolean`                                | 是否为指定类型的节点启用评审状态图标（待评审、通过、拒绝）。                                                                                                     | `true`                                                   |
| `reviewStatusNodeTypes`           | `NodeType[]`                             | 一个节点类型数组，用于指定哪些节点应显示评审状态图标。                                                                                                           | `['DEMAND', 'MODULE', 'TEST_POINT', 'USE_CASE']`         |
| `enableNodeRemarks`               | `boolean`                                | 是否为指定类型的节点启用备注图标。                                                                                                                               | `true`                                                   |
| `nodeRemarksNodeTypes`            | `NodeType[]`                             | 一个节点类型数组，用于指定哪些节点应显示备注图标。                                                                                                               | `['MODULE', 'TEST_POINT', 'USE_CASE']`                   |
| `enableNodeScoring`               | `boolean`                                | 是否为指定类型的节点启用评分图标和分数。                                                                                                                         | `true`                                                   |
| `nodeScoringNodeTypes`            | `NodeType[]`                             | 一个节点类型数组，用于指定哪些节点应显示评分。                                                                                                                   | `['MODULE', 'TEST_POINT', 'USE_CASE']`                   |
| `enableBulkReviewContextMenu`     | `boolean`                                | 是否在 `DEMAND`, `MODULE`, `TEST_POINT` 节点的右键菜单中显示“一键评审用例”选项。                                                                                 | `true`                                                   |
| `enableSingleReviewContextMenu`   | `boolean`                                | 是否在 `USE_CASE` 节点的右键菜单中显示“评审用例”选项。                                                                                                           | `true`                                                   |
| `strictMode`                      | `boolean`                                | 是否启用严格模式，强制执行节点层级规则。                                                                                                                         | `true`                                                   |
| `priorityEditableNodeTypes`       | `NodeType[]`                             | 定义了哪些节点类型可以编辑其优先级。                                                                                                                             | `['MODULE', 'TEST_POINT', 'USE_CASE', 'GENERAL']`        |

#### UI 自定义

| Prop 名称                   | 类型                                     | 描述                                                                                                                                                             | 默认值                                                     |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `connectorStyle`            | `'elbow' \| 'curve'`                     | 设置节点连接线的样式。`elbow` 为直角折线，`curve` 为平滑贝塞尔曲线。                                                                                               | `'elbow'`                                                  |
| `showAITag`                 | `boolean`                                | 是否显示 `generateModeName: 'AI'` 节点的 AI 标识。                                                                                                                   | `true`                                                     |
| `showNodeType`              | `boolean`                                | 是否在节点上显示其类型标签。                                                                                                                                     | `true`                                                     |
| `showPriority`              | `boolean`                                | 是否在节点上显示其优先级标签。                                                                                                                                   | `true`                                                     |
| `showMinimap`               | `boolean`                                | 是否显示右下角的小地图预览。                                                                                                                                     | `false`                                                    |
| `canvasBackgroundColor`     | `string`                                 | 自定义画布的背景颜色。                                                                                                                                           | `'#f7f7f7'`                                                |
| `showBackgroundDots`        | `boolean`                                | 是否在画布背景上显示网格点。                                                                                                                                     | `true`                                                     |
| `showTopToolbar`            | `boolean`                                | 是否显示顶部工具栏。                                                                                                                                             | `true`                                                     |
| `showBottomToolbar`         | `boolean`                                | 是否显示底部工具栏。                                                                                                                                             | `true`                                                     |
| `showReadOnlyToggleButtons` | `boolean`                                | 是否在右上角显示“只读模式/编辑模式”的切换按钮。                                                                                                                  | `true`                                                     |
| `showShortcutsButton`       | `boolean`                                | 是否在右上角显示“快捷键”按钮。                                                                                                                                   | `true`                                                     |
| `topToolbarCommands`        | `CommandId[]`                            | 自定义顶部工具栏中显示的按钮及其顺序。                                                                                                                           | `['undo', 'redo', ..., 'closeTop']`                        |
| `bottomToolbarCommands`     | `CommandId[]`                            | 自定义底部工具栏中显示的按钮及其顺序。                                                                                                                           | `['zoomOut', 'zoomDisplay', ..., 'closeBottom']`           |
| `showContextMenu`           | `boolean`                                | 是否显示节点的右键上下文菜单。                                                                                                                                   | `true`                                                     |
| `showCanvasContextMenu`     | `boolean`                                | 是否显示画布的右键上下文菜单。                                                                                                                                   | `true`                                                     |

---

### 命令式 API (`ref`)

通过 `ref` 访问组件实例上的方法，以实现对组件的外部控制。

```typescript
export interface AppRef {
  // --- 数据操作 ---
  save: () => DataChangeInfo;
  setData: (newData: RawNode) => void;
  syncData: (newData: RawNode) => void;
  partialUpdateNodeData: (nodeUuid: string, partialData: Partial<MindMapNodeData>) => void;

  // --- 状态控制 ---
  resetHistory: () => void;
  setReadOnly: (isReadOnly: boolean) => void;
  
  // --- 用例与评审 ---
  executeUseCase: (nodeUuid: string) => void;
  confirmReviewStatus: (nodeUuid: string, newStatus: ReviewStatusCode) => void;
  getReviewStatusUpdateInfo: (nodeUuid: string, newStatus: ReviewStatusCode) => DataChangeInfo | null;
  confirmRemark: (nodeUuid: string, content: string) => void;
  confirmScore: (nodeUuid: string, scoreInfo: ScoreInfo) => void;
}
```

-   **`save(): DataChangeInfo`**
    -   **作用**: 命令式地触发一次数据获取。
    -   **返回**: 包含当前思维导图完整数据的 `DataChangeInfo` 对象。
    -   **用途**: 当你需要从外部按钮或其他非思维导图UI触发保存时调用。它**不会**触发 `onSave` 回调。

-   **`setData(newData: RawNode)`**
    -   **作用**: **硬重置**。完全替换思维导图中的所有数据，并重置视图（缩放/平移）和历史记录。
    -   **用途**: 用于首次加载数据或需要完全丢弃当前状态并加载一个全新导图的场景。

-   **`syncData(newData: RawNode)`**
    -   **作用**: **智能同步**。使用新数据更新导图，但**保留当前的视图（缩放/平移）和现有节点的布局信息**。
    -   **用途**: **推荐用于保存成功后回显后端数据**。它会平滑地添加、删除或更新节点，而不会让用户的视图跳回初始位置，极大地提升了用户体验。

-   **`resetHistory()`**
    -   **作用**: **清空撤销/重做历史记录**，并将当前状态设为新的“原始”状态。
    -   **用途**: **在外部保存操作成功后调用**。这将使 `isDirty` 状态变为 `false`，并禁用“保存”按钮，直到用户再次进行修改。

-   **`setReadOnly(isReadOnly: boolean)`**
    -   **作用**: 命令式地设置思维导图的只读状态。
    -   **用途**: **在外部保存操作成功后调用**，将 `isReadOnly` 设为 `true`，以防止用户在确认保存成功前进行新的编辑。

-   **`executeUseCase(nodeUuid: string)`**
    -   **作用**: 触发指定 `uuid` 的用例节点的 `onExecuteUseCase` 回调。
    -   **用途**: 从外部UI（如测试用例列表）触发用例执行。
    
-   **`partialUpdateNodeData(nodeUuid, partialData)`**
    -   **作用**: **局部增量更新**指定节点的数据，而**不会触发界面重绘或创建撤销/重做历史记录**。它会直接合并 `partialData` 到现有节点数据中。
    -   **用途**: **核心用途**是从后端同步数据（如数据库 `id`）回写到节点中，而不会干扰用户的当前操作。例如，在用户评分后，API 返回了该评分记录的 `id`，可以使用此方法将其无缝地更新到节点的 `scoreInfo` 对象中。
    -   **注意**: 尽管此更新是“静默的”（无重绘、无历史记录），但它**仍然会触发 `onDataChange` 回调**，`operationType` 为 `PARTIAL_UPDATE_NODE`。

---

## 核心工作流详解

### 1. 数据加载与更新 (setData vs syncData)

-   **初始加载**: 使用 `initialData` prop 或在 `useEffect` 中获取数据后调用 `ref.current.setData(data)`。两者效果类似，都会进行一次完整的渲染和布局。
-   **保存后数据同步 (重要)**:
    -   **旧方式 (不推荐)**: 调用 `ref.current.setData(newData)`。这会**重置视图**，用户的缩放和平移状态会丢失，体验不佳。
    -   **新方式 (推荐)**: 调用 `ref.current.syncData(newData)`。这会**保留视图**，并智能地更新数据，只对新增或有结构变化的节点重新计算布局，为用户提供无缝的更新体验。

### 2. 保存与状态管理（重要）

为了实现健壮的保存功能，组件内部的 `isDirty` 状态与外部的 `onSave` 回调和 `ref` 方法协同工作。

**推荐的保存流程如下：**

1.  **用户编辑**: 用户对思维导图进行任何修改（添加、删除、编辑文本等）。组件内部的 `isDirty` 状态变为 `true`。顶部工具栏的“保存”按钮自动变为可用状态。

2.  **触发保存**: 用户点击“保存”按钮。
    -   这会触发你传入的 `onSave` prop，并将包含最新数据的 `DataChangeInfo` 对象作为参数传递给你。

3.  **处理保存逻辑**: 在你的 `onSave` 函数中：
    -   调用你的后端 API 来保存 `info.currentRawData`。
    -   `await` API 的返回结果。
    -   **(可选) API 成功后，重新请求一次最新的全量数据**，以确保与后端完全同步。

4.  **处理 API 结果**:
    -   **如果 API 调用成功**:
        -   向用户显示成功提示（如 `alert` 或 `toast`）。
        -   **(可选) 如果上一步重新请求了数据**，调用 `ref.current.syncData(latestDataFromServer)` 来无缝更新UI。
        -   调用 `ref.current.resetHistory()`。这会清空撤销/重做栈，并将 `isDirty` 状态重置为 `false`，“保存”按钮会再次变为不可用。
        -   调用 `ref.current.setReadOnly(true)`。将思维导图设为只读模式，这是一个好习惯，可以防止用户在确认保存成功前进行新的修改。
    -   **如果 API 调用失败**:
        -   向用户显示错误提示。
        -   **什么都不做**。不要调用 `syncData`, `resetHistory` 或 `setReadOnly`。这样，思维导图将保持在可编辑状态，`isDirty` 仍为 `true`，“保存”按钮也依然可用，用户可以修正问题或重试保存。

这个流程确保了组件的状态能够准确反映数据是否已成功持久化，并提供了最佳的用户体验。

### 3. 评审、备注与评分工作流

1.  **启用功能**: 通过 `enableReviewStatus`, `enableNodeRemarks`, `enableNodeScoring` 等 props 启用相应功能，并可通过 `...NodeTypes` props 指定哪些节点类型适用。
2.  **用户交互**:
    -   用户点击节点上的状态图标或通过右键菜单，会打开相应的弹窗（评审、备注或评分）。
    -   用户在弹窗中进行操作并点击“确定”或“提交”。
3.  **触发回调**:
    -   组件内部状态会立即更新。
    -   相应的 `onConfirm...` 回调（如 `onConfirmReviewStatus`）会被触发，并附带包含变更详情的 `DataChangeInfo` 对象。
4.  **外部处理**: 在回调函数中，你可以获取 `info` 对象并调用 API 将变更同步到后端。
5.  **命令式操作**: 你也可以通过 `ref` 上的相应方法（如 `ref.current.confirmRemark(...)`）从外部直接触发这些操作。

---

## 高级工作流：实现评分与ID回写

这是一个常见的真实场景：用户在界面上进行操作（如评分），前端将数据发送到后端保存，后端返回一个数据库 `id`，前端需要将这个 `id` 更新回对应的数据项中，以便后续的更新或删除操作。`partialUpdateNodeData` 方法正是为此设计的。

**工作流程如下:**

1.  **用户操作**: 用户点击节点上的评分图标，打开评分弹窗，选择星级、填写备注，然后点击“提交”。
2.  **触发回调**: 组件触发 `onConfirmScore` 回调。此时传递的 `DataChangeInfo` 中的 `currentNode.scoreInfo` 对象包含了用户输入的所有信息，但**没有 `id`**。
3.  **调用API**: 在 `onConfirmScore` 函数内部，你调用后端 API 来保存这个 `scoreInfo` 数据。
4.  **API返回ID**: 后端处理请求，将评分数据存入数据库，并返回生成的唯一 `id`。
5.  **回写ID**: API 调用成功后，在 `onConfirmScore` 函数中，使用 `ref.current.partialUpdateNodeData()` 方法，将包含新 `id` 的 `scoreInfo` 对象“静默”地更新回对应的节点中。

这个过程对用户是无感的，不会导致画布重绘或历史状态污染，但能确保前端数据与后端保持同步。

### 示例代码

```jsx
import React, { useRef, useEffect } from 'react';
import App, { AppRef, DataChangeInfo, RawNode } from './App';
import { mockInitialData } from './mockData'; // 假设 mockData 存在

// 模拟一个保存评分的后端 API
const fakeScoreApi = {
  saveScore: (nodeUuid: string, scoreInfo: any): Promise<{ success: boolean; id: number }> => {
    console.log(`正在为节点 ${nodeUuid} 保存评分:`, scoreInfo);
    return new Promise(resolve => {
      setTimeout(() => {
        const newId = Math.floor(Math.random() * 1000) + 1; // 生成一个随机 ID
        console.log(`API 返回成功，新的评分 ID 是: ${newId}`);
        resolve({ success: true, id: newId });
      }, 500); // 模拟网络延迟
    });
  }
};

function ScoringExample() {
  const mindMapRef = useRef<AppRef>(null);

  // 组件加载后自动进入编辑模式，方便演示
  useEffect(() => {
    setTimeout(() => {
        mindMapRef.current?.setReadOnly(false);
    }, 100);
  }, []);

  // 核心逻辑：处理评分确认事件
  const handleConfirmScore = async (info: DataChangeInfo) => {
    // 1. 从回调信息中获取当前操作的节点和评分数据
    const currentNode = info.currentNode; // 这是 RawNode 格式
    if (!currentNode || !currentNode.uuid || !currentNode.scoreInfo) {
      console.error("无法获取评分节点信息。");
      return;
    }
    
    // scoreInfo 在回调时还没有 id
    console.log("onConfirmScore 触发，此时 scoreInfo:", currentNode.scoreInfo);

    try {
      // 2. 调用后端 API 保存评分，并等待返回结果
      const result = await fakeScoreApi.saveScore(currentNode.uuid, currentNode.scoreInfo);

      if (result.success) {
        // 3. API 调用成功，获取返回的 id
        const newScoreId = result.id;
        
        // 4. 使用 partialUpdateNodeData 将 id 回写到节点的 scoreInfo 中
        //    注意：这里需要构造一个符合 MindMapNodeData 结构的 partialData
        const partialDataToUpdate = {
          scoreInfo: {
            ...currentNode.scoreInfo, // 保留用户输入的其他评分信息
            id: newScoreId,         // 添加后端返回的 id
          }
        };

        console.log(`准备使用 partialUpdateNodeData 回写 ID，更新数据:`, partialDataToUpdate);
        mindMapRef.current?.partialUpdateNodeData(currentNode.uuid, partialDataToUpdate);
        
        // 你可以在 onDataChange 回调中监听 OperationType.PARTIAL_UPDATE_NODE
        // 来验证数据是否已在内部状态中更新。
      } else {
        alert("评分保存失败！");
      }
    } catch (error) {
      console.error("保存评分时出错:", error);
      alert("评分保存时发生网络错误。");
    }
  };

  return (
    <div style={{width: '100%', height: '100vh'}}>
      <App
        ref={mindMapRef}
        initialData={mockInitialData}
        onConfirmScore={handleConfirmScore}
      />
    </div>
  );
}
```

---

## 深入 `onDataChange` 回调

`onDataChange` 是一个强大的 prop，它会在思维导图内部发生**任何**有意义的变更时触发。

-   **用途**: 实现自动保存、与外部状态（如 Redux）同步、驱动外部 UI（如显示选中节点的详细信息面板）、记录用户操作日志等。
-   **与 `onSave` 的区别**: `onSave` 仅在用户**点击保存按钮**时触发，是用户意图明确的保存操作。而 `onDataChange` 在**每次变更**时都会触发，频率更高。
-   **`DataChangeInfo` 对象**: 每次回调都会收到一个 `DataChangeInfo` 对象，它包含了关于变更的丰富上下文信息，是与外部应用集成的关键。

### 深入 `DataChangeInfo` 回调对象

`onDataChange`, `onSave` 和其他回调函数都会接收一个 `DataChangeInfo` 对象。

```typescript
interface DataChangeInfo {
  // --- 核心元数据 ---
  operationType: OperationType;
  timestamp: number;
  description: string;
  
  // --- 数据快照 ---
  // 变更后的完整层级数据 (推荐用于保存)
  currentRawData: RawNode; 
  // 变更前的完整层级数据
  previousRawData: RawNode;
  // 变更后的完整扁平化数据 (回调专用格式)
  currentData: RawCallbackMindMapData; 
  // 变更前的完整扁平化数据 (回调专用格式)
  previousData: RawCallbackMindMapData;
  
  // --- 变更详情 ---
  // 受影响节点的 UUID 列表
  affectedNodeUuids?: string[];
  // 新增节点的子树 (层级结构)
  addedNodes?: RawNode[];
  // 删除节点的子树 (层级结构)
  deletedNodes?: RawNode[];
  // 更新节点的子树 (层级结构)
  updatedNodes?: RawNode[];
  
  // --- 上下文节点 ---
  // 当前操作的主要节点 (层级结构, 包含其所有后代)
  currentNode?: RawNode; 
  // 当前操作节点的父节点 (仅父节点本身, 不含后代)
  parentNode?: RawNode;
  
  // --- 节点链 (从根节点到当前节点的路径) ---
  uuidChain?: string[];
  uuidChainNodes?: RawNode[]; // 路径上的节点数组 (不含后代)
  
  // --- 特定操作的附带信息 ---
  executeId?: number | string; // 用于 EXECUTE_USE_CASE
  useCaseIds?: (string | number)[]; // 用于 BULK_UPDATE_REVIEW_STATUS
}
```

**关键字段解析:**

-   **`operationType`**: **最关键的字段**。它告知你发生了什么操作（例如 `ADD_NODE`, `UPDATE_NODE_TEXT`, `SELECT_NODE`）。
-   **`currentRawData`**: 变更**之后**整个思维导图的完整、**层级化**数据。**这是用于保存或与外部状态同步的最理想的数据格式。**
-   **`previousRawData`**: 变更**之前**的层级化数据快照，用于对比。
-   `addedNodes`, `deletedNodes`, `updatedNodes`: 提供了变更节点的**完整子树**，而不仅仅是节点本身。例如，当删除一个模块时，`deletedNodes` 将包含该模块及其下所有测试点、用例等的层级结构。
-   `currentNode`: 操作中涉及的主要节点。例如，在 `UPDATE_NODE_TEXT` 操作中，`currentNode` 就是被编辑的那个节点（及其子树）。
-   `uuidChainNodes`: 一个从根节点到 `currentNode` 的路径节点数组，让你轻松了解节点的层级上下文。

---

## 其他导出组件

### `<Panel>`

`<Panel>` 组件允许你在思维导图画布的指定位置渲染自定义内容。

-   **Props**:
    -   `position: PanelPosition`: 面板位置，如 `'top-left'`, `'bottom-center'` 等。
    -   `children: React.ReactNode`: 要渲染的内容。
    -   `className?: string`: 自定义 CSS 类。
    -   `style?: React.CSSProperties`: 自定义内联样式。

---

## 数据结构

#### `RawNode` (输入/输出数据)

用于初始化或导出思维导图的层级数据对象。

```typescript
interface RawNode {
    id?: number | string;
    uuid?: string;
    name?: string;
    nodeType?: 'rootNode' | 'moduleNode' | 'testPointNode' | 'caseNode' | 'preconditionNode' | 'stepNode' | 'resultNode' | string;
    priorityLevel?: "0" | "1" | "2" | "3";
    childNodeList?: RawNode[];
    // ... 其他自定义字段也会被保留
}
```

#### `OperationType`

`operationType` 字段用于标识发生了何种类型的变更。

| 值                                 | 描述                                     |
| ---------------------------------- | ---------------------------------------- |
| `ADD_NODE`                         | 添加了一个新节点                         |
| `DELETE_NODE`                      | 删除了一个或多个节点                     |
| `UPDATE_NODE_TEXT`                 | 更新了节点的文本和尺寸                   |
| `UPDATE_NODE_TYPE`                 | 更新了节点的类型                         |
| `UPDATE_NODE_PRIORITY`             | 更新了节点的优先级                       |
| `MOVE_NODE`                        | 移动了节点位置                           |
| `REORDER_NODE`                     | 对同级节点进行了排序                     |
| `TOGGLE_NODE_COLLAPSE`             | 展开或折叠了节点                         |
| `LAYOUT`                           | 应用了自动布局                           |
| `UNDO` / `REDO`                    | 执行了撤销/重做操作                      |
| `LOAD_DATA`                        | 初始数据加载完成                         |
| `SELECT_NODE`                      | 选中或取消选中了一个节点                 |
| `SAVE`                             | 触发了保存操作                           |
| `SYNC_DATA`                        | 智能同步了外部数据（保留视图）           |
| `EXECUTE_USE_CASE`                 | 触发了用例执行操作                       |
| `BULK_UPDATE_REVIEW_STATUS`        | 批量更新了评审状态（由父节点发起）       |
| `UPDATE_SINGLE_NODE_REVIEW_STATUS` | 更新了单个用例的评审状态（并向上聚合）   |
| `ADD_REMARK`                       | 添加了备注                               |
| `UPDATE_SCORE_INFO`                | 更新了评分                               |
| `PARTIAL_UPDATE_NODE`              | 执行了局部增量更新                       |

### 可定制命令 (`CommandId`)

你可以通过 `topToolbarCommands` 和 `bottomToolbarCommands` props 来自定义工具栏中显示的按钮。

**顶部工具栏可用命令:**
`'undo'`, `'redo'`, `'separator'`, `'addSibling'`, `'addChild'`, `'delete'`, `'save'`, `'closeTop'`

**底部工具栏可用命令:**
`'zoomOut'`, `'zoomIn'`, `'zoomDisplay'`, `'separator'`, `'toggleReadOnly'`, `'fitView'`, `'centerView'`, `'layout'`, `'fullscreen'`, `'search'`, `'closeBottom'`