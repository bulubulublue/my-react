/*
        React.createElement参数说明
            - 1: 当前节点标签
            - 2: 需要添加到该节点上的属性
            - 3+: 节点的子节点

        输出:
             {"type":"h1","props":{"title":"foo","children":[{type:'h1',props:{}}]}}

        调用:
            const element = React.createElement(
                "div",
                { id: "foo" },
                React.createElement("h1", null, "bar"),
                React.createElement("h2"),
                'Hello'
            )

        */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => (typeof child === 'object' ? child : createTextNode(child))),
    },
  };
}

const TEXT_ELEMENT = 'text';

function createTextNode(text) {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text,
      // 这里为了方便，还是添加了children属性，在react中没有这个属性
      children: [],
    },
  };
}

const MyReact = {
  createElement,
};

// =====================================实际渲染===============================

/** @jsx MyReact.createElement */
const element = (
  <div id="foo">
    <h1>bar</h1>
    <span>test</span>
  </div>
);

console.log(element);
const container = document.getElementById('root');
ReactDOM.render(element, container);
