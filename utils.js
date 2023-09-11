/*
    fiber工作流程:
    1. 调用createElement方法，将jsx编译为对象形式： {"type":"h1","props":{"title":"foo","children":[{type:'h1',props:{}}]}}
    2. 调用render方法，赋值wipRoot和nextUnitOfWork,即由id为root的节点对应的fiber对象
    3. 由于触发nextUnitOfWork有了值，因而触发workLoop中的performUnitOfWork方法
    4. performUnitOfWork:
        i) 调用createDom,生成真实dom，并添加到fiber对象的dom属性上
        ii) 如果当前节点有子节点，遍历子节点，添加parent和sibling属性
        iii) 判断下一个需要处理的节点
    5. 回到workLoop，如果所有节点都处理完毕，则调用commitRoot方法，将每个fiber对象上的真实dom，挂载到对应的父元素上
*/

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

//====================================================createDom方法开始=============================================================

//该方法用于创建真实的html标签和添加属性
function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT ? document.createTextNode('') : document.createElement(fiber.type);

  // 添加除了children外的props属性
  Object.keys(fiber.props)
    .filter(key => key !== 'children')
    .forEach(key => {
      dom[key] = fiber.props[key];
    });

  return dom;
}

//****************************************************createDom方法结束*************************************************************

//====================================================实现concurrent mode开始========================================================

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // 如果所有节点已经遍历并创建为了fiber对象，并且有根元素，则挂载真实dom
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop); // 这里需要先调用一次，才能触发工作

// 该方法用于创建fiber对象
// 遍历顺序：深度优先，当前节点A->子节点B->当前节点A的兄弟节点->当前节点的父节点的兄弟节点
/* 
fiber参数：即使用createElement方法的返回值: {"type":"h1","props":{"title":"foo","children":[{type:'h1',props:{}}]}}
返回值
{
  type:h1,
  props:{title:'foo',children:[]}
  dom:<div></div>  // 真实的dom结构
  parent: fiber, // 父fiber对象，包含相同的结构属性
  child: fiber,
  sibling:fiber
}

*/
function performUnitOfWork(fiber) {
  // 1.创建真实html节点
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // 2. 将html节点添加到父节点上：如果在这个节点就直接挂载真实dom，那么由于该操作可能会被浏览器打断，因而会看到不完整的页面
  //   if (fiber.parent) {
  //     fiber.parent.dom.appendChild(fiber.dom);
  //   }

  // 3. 将所有子节点都创建为fiber对象
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    };

    if (index === 0) {
      fiber.child = newFiber; // 在当前节点上存储第一个子节点
    } else {
      prevSibling.sibling = newFiber; //如果不是第一个子节点，则在前一个子节点上存储当前子节点为sibling
    }

    prevSibling = newFiber;
    index++;
  }

  //4. 返回下一个需要工作的fiber对象
  if (fiber.child) {
    return fiber.child; // 如果有子节点，则返回第一个子节点
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling; // 如果有兄弟节点，则返回兄弟节点
    }
    nextFiber = nextFiber.parent; // 如果都没有则遍历上一层（返回上一层的兄弟节点）
  }
}
//*************************************************实现concurrent mode结束**********************************************************

//================================================commit方法开始====================================================================
function commitRoot() {
  commitWork(wipRoot.child); // wipRoot:指id为root的根节点
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  const domParent = fiber.parent.dom;

  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

//*****************************************************commit方法结束***************************************************************

//====================================================实现render方法开始============================================================
let nextUnitOfWork = null;
let wipRoot = null; // 当前需要渲染的fiber树

// 该方法用于赋值nextUnitOfWork
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };
  nextUnitOfWork = wipRoot;
}

//****************************************************实现render方法结束*************************************************************

export const MyReact = {
  createElement,
  render,
};
