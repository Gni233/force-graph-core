import type { GraphData } from './data/storage';

export const DEMO_DATA: GraphData = {
  nodes: [
    // 根节点和核心概念
    { id: "root", label: "动态思考工具", radius: 18, headingLevel: 1, tags: ["概念"], color: "#5B8FF9", x: -100, y: -100 },
    { id: "n1", label: "可视化引擎", radius: 14, headingLevel: 2, tags: ["技术"], color: "#5AD8A6", x: -300, y: -200 },
    { id: "n2", label: "数据存储", radius: 14, headingLevel: 2, tags: ["技术"], color: "#5AD8A6", x: -300, y: 0 },
    { id: "n3", label: "交互设计", radius: 14, headingLevel: 2, tags: ["设计"], color: "#F6BD16", x: 100, y: -200 },
    { id: "n4", label: "插件系统", radius: 14, headingLevel: 2, tags: ["技术"], color: "#5AD8A6", x: 100, y: 0 },

    // 子节点
    { id: "n1a", label: "Canvas 2D", radius: 11, headingLevel: 3, tags: ["渲染"], color: "#7262FD", x: -420, y: -280 },
    { id: "n1b", label: "WebGL / PixiJS", radius: 11, headingLevel: 3, tags: ["渲染"], color: "#7262FD", x: -420, y: -200 },
    { id: "n1c", label: "D3 力导向", radius: 11, headingLevel: 3, tags: ["布局"], color: "#FF9845", x: -420, y: -120 },

    { id: "n2a", label: "本地 JSON", radius: 11, headingLevel: 3, tags: ["存储"], color: "#F6BD16", x: -420, y: -30 },
    { id: "n2b", label: "SQLite", radius: 11, headingLevel: 3, tags: ["存储"], color: "#F6BD16", x: -420, y: 50 },

    { id: "n3a", label: "拖拽固定", radius: 11, headingLevel: 3, tags: ["交互"], color: "#E8684A", x: 50, y: -280 },
    { id: "n3b", label: "右键菜单", radius: 11, headingLevel: 3, tags: ["交互"], color: "#E8684A", x: 50, y: -200 },
    { id: "n3c", label: "框选批量操作", radius: 11, headingLevel: 3, tags: ["交互"], color: "#E8684A", x: 50, y: -120 },

    { id: "n4a", label: "自定义节点样式", radius: 11, headingLevel: 3, tags: ["扩展"], color: "#1E9494", x: 200, y: -50 },
    { id: "n4b", label: "自定义布局算法", radius: 11, headingLevel: 3, tags: ["布局", "扩展"], color: "#1E9494", x: 200, y: 50 },

    // 跨领域连接
    { id: "n5", label: "Markdown 同步", radius: 13, headingLevel: 2, tags: ["数据", "设计"], color: "#FF6B6B", x: -100, y: -250 },
    { id: "n6", label: "本地优先", radius: 12, headingLevel: 2, tags: ["概念"], color: "#5B8FF9", x: -100, y: 80 },
    { id: "n7", label: "多媒体节点", radius: 13, headingLevel: 2, tags: ["渲染", "设计"], color: "#D460BF", x: 220, y: -120, mediaType: "image", mediaUrl: "https://picsum.photos/300/200" },
    { id: "n8", label: "说明文档", radius: 12, headingLevel: 2, tags: ["概念"], color: "#1E9494", x: 220, y: -30, mediaType: "md", mediaUrl: "## 功能介绍\n- **拖拽**节点自由布局\n- **右键**设置媒体类型\n- **展开**查看图片/文档\n- 支持图片、音频、视频、Markdown" },
    { id: "n9", label: "示例视频", radius: 12, headingLevel: 2, tags: ["渲染"], color: "#FF6B6B", x: 220, y: 60, mediaType: "video", mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { id: "n10", label: "示例音频", radius: 11, headingLevel: 2, tags: ["设计"], color: "#FF9845", x: 220, y: 150, mediaType: "audio", mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  ],
  edges: [
    { source: "root", target: "n1", label: "核心模块", color: "#BFBFBF" },
    { source: "root", target: "n2", label: "核心模块", color: "#BFBFBF" },
    { source: "root", target: "n3", label: "核心模块", color: "#BFBFBF" },
    { source: "root", target: "n4", label: "核心模块", color: "#BFBFBF" },
    { source: "root", target: "n6", label: "设计原则", color: "#BFBFBF" },

    { source: "n1", target: "n1a", label: "子技术", color: "#CCC" },
    { source: "n1", target: "n1b", label: "子技术", color: "#CCC" },
    { source: "n1", target: "n1c", label: "子技术", color: "#CCC" },
    { source: "n2", target: "n2a", label: "子技术", color: "#CCC" },
    { source: "n2", target: "n2b", label: "子技术", color: "#CCC" },
    { source: "n3", target: "n3a", label: "子功能", color: "#CCC" },
    { source: "n3", target: "n3b", label: "子功能", color: "#CCC" },
    { source: "n3", target: "n3c", label: "子功能", color: "#CCC" },
    { source: "n4", target: "n4a", label: "子功能", color: "#CCC" },
    { source: "n4", target: "n4b", label: "子功能", color: "#CCC" },

    // 跨连接
    { source: "n5", target: "n2", label: "依赖", color: "#F6BD16" },
    { source: "n5", target: "root", label: "同步", color: "#F6BD16" },
    { source: "n7", target: "n1b", label: "渲染方式", color: "#D460BF" },
    { source: "n7", target: "n3", label: "交互需求", color: "#D460BF" },
    { source: "n8", target: "root", label: "说明", color: "#1E9494" },
    { source: "n9", target: "n1", label: "演示", color: "#FF6B6B" },
    { source: "n9", target: "n7", label: "相关", color: "#AAA", lineStyle: "dash-4" },
    { source: "n10", target: "n3", label: "交互", color: "#FF9845" },
    { source: "n1", target: "n3", label: "协作", color: "#87CEEB" },
    { source: "n4", target: "n1", label: "扩展渲染", color: "#87CEEB" },
  ],
  groups: [
    { id: "g_tech", label: "技术", color: "#5AD8A6", borderColor: "#3CB882", opacity: 0.12, displayMode: "fluid", nodeColorMode: "off", fluidRadius: 10, fluidOpacity: 0.3 },
    { id: "g_design", label: "设计", color: "#F6BD16", borderColor: "#D49B00", opacity: 0.12, displayMode: "fluid", nodeColorMode: "off", fluidRadius: 8, fluidOpacity: 0.3 },
    { id: "g_render", label: "渲染", color: "#7262FD", borderColor: "#5B4FE0", opacity: 0.1, displayMode: "rect", nodeColorMode: "fill", nodeColor: "#7262FD" },
  ],
  settings: {
    linkDist: 120, labelSize: 18, charge: -100, linkStr: 0.3, collideR: 10,
    centerS: 0.02, groupBound: 0.8, heatingTime: 2, alphaTarget: 0.3,
    editPanelOpacity: 0.9, useRAFL: true, nodeExpand: 8, lineExpand: 6,
    showGLabels: true, glMin: 10, glMax: 28, gridVis: false, axisVis: false,
    axisTicks: true, gridSp: 30, gridWidth: 0.5, gravityGrid: false, ar: 0.75, graphTheme: "nord-dark", focusMode: false, fluidAppearance: false, glowAppearance: false, categoryLayout: false,
  },
};
