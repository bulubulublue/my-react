// ===================================================实现createElement方法开始=========================
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
export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => (typeof child === 'object' ? child : createTextNode(child))),
    },
  };
}

//*****************************************************实现createElement方法结束****************************************************

//====================================================实现render方法开始============================================================
/*
    传入参数:
    1. 由createElement生成的对象： {"type":"h1","props":{"title":"foo","children":[{type:'h1',props:{}}]}}
    2. 根节点
*/
function render(element, container) {
  // 挂载父节点
  const dom =
    element.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(element.type);

  // 添加除了children外的props属性
  Object.keys(element.props)
    .filter(key => key !== 'children')
    .forEach(key => {
      dom[key] = element.props[key];
    });

  // 挂载子节点
  element.props.children.forEach(item => {
    render(item, dom);
  });
  container.appendChild(dom);
}

//****************************************************实现render方法结束*************************************************************

export const MyReact = {
  createElement,
  render,
};
