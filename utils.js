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

//====================================================新增/修改真实dom节点=============================================================

/*
  该方法用于创建真实的html标签和添加属性
  参数：{type: string, props:{children?:[],[key]:value}}
*/
function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT ? document.createTextNode('') : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom;
}

const isProperty = key => key !== 'children'; // 如果是children属性，则不处理
const isNew = (prev, next) => key => prev[key] !== next[key]; // 如果新旧属性不一致，则表示需要更新属性值
const isGone = next => key => !(key in next); // 如果旧属性key不在新属性中，则需要删除旧属性
const isEvent = key => key.startsWith('on');

/*
  输入参数
  1. dom: 需要修改的dom（新节点）
  2. prevProps: 旧的节点的属性
  3. nextProps: 新节点的属性
*/
function updateDom(dom, prevProps, nextProps) {
  // 移除旧监听事件， 因为属性是onClick, addEventListener中对应的是'click'
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => {
      return isGone(nextProps) || isNew(prevProps, nextProps)(key);
    })
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 删除已移除的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps))
    .forEach(name => {
      dom[name] = '';
    });

  //添加新增或者修改的属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });

  // 添加新监听事件
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
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

/* 该方法用于创建fiber对象
   遍历顺序：深度优先，当前节点A->子节点B->当前节点A的兄弟节点->当前节点的父节点的兄弟节点
   fiber参数：
    1. 如果是纯html，即使用createElement方法的返回值: {"type":"h1","props":{"title":"foo","children":[{type:'h1',props:{}}]}}
    2. 如果是方法函数，则是{type:App, props:{ name: "foo"}}, 其中App是一个函数，如下：
        function App(props) {
          return MyReact.createElement(
            "h1",
            null,
            "Hi ",
            props.name
          )
        }
*/
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
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

function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)]; // 通过调用fiber.type方法来获取子节点对象
  reconcilChild(fiber, children);
}

function updateHostComponent(fiber) {
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

  reconcilChild(fiber, elements);
}
//*************************************************实现concurrent mode结束**********************************************************

//=================================================reconcil方法开始=================================================================

/*
  输入参数：
  1. 当前的fiber对象, {"type":"h1","props":{"title":"foo","children":[{type:'h1',props:{}}]}}
  2. 当前fiber的children属性

  对比规则：
  1. 如果有新旧节点，新旧节点标签类型相同，则更新节点
  2. 如果有新节点，新旧节点标签类型不同，则创建新节点及其所有子节点，删除旧节点
  

  fiber对象格式变为:
  {
    type:'h1',
    props:{"title":"foo","children":[{type:'h1',props:{}}]}}，
    dom: <div></div>, // 和旧节点dom保持一致，或者为null,
    parent: fiber,
    alternateL fiber, // 对应结构的旧节点
    effectTag:'UPDATE' | 'DELETETION' | 'PLACEMENT,
    child: fiber,
    sibling:fiber
  }
*/
function reconcilChild(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child; // wipFiber.alternate: 第一个循环的时候即root节点
  let prevSibling = null;

  while (index < elements.length || oldFiber) {
    // index > elements.length且oldFiber!==null的情况：同一层children中，新节点已遍历完毕，而仍有旧节点
    const element = elements[index];
    let newFiber = null;

    //对比旧的节点和新的节点，第一个循环的时候，即对比旧的root节点的第一个子节点，和新的root节点的第一个子节点

    const sameType = oldFiber && element && element.type === oldFiber.type; // 新旧节点标签相同

    if (sameType) {
      // 如果新旧节点标签相同，则更新新节点
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom, // 直接复用旧节点的dom
        parent: wipFiber,
        alternate: oldFiber, // 当前节点位置对应的旧节点
        effectTag: 'UPDATE',
      };
    }

    if (element && !sameType) {
      // 如果有新节点，且新旧节点标签不同，则创建该节点
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null, // 需要在performUnitOfWork中创建真实的dom节点
        parent: wipFiber,
        alternate: null, // 如果没有当前节点，则他的全部子节点都会重新创建dom对象
        effectTag: 'PLACEMENT',
      };
    }

    if (oldFiber && !sameType) {
      // 如果有旧节点，且新旧节点标签不同，则删除旧节点
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber; // 在当前节点上存储第一个子节点
    } else {
      prevSibling.sibling = newFiber; //如果不是第一个子节点，则在前一个子节点上存储当前子节点为sibling
    }
    prevSibling = newFiber;
    index++;
  }
}

//*************************************************reconcil方法结束*****************************************************************

//================================================commit方法开始====================================================================
/*
  如果是函数组件，最后的fiber树结构类似：
  {
    alternat: null
    child: 
      {
        alternate: null
        child: {type: 'h1', props: {…}, dom: h1, parent: {…}, alternate: null, …} // 在child里存储实际函数返回的dom结构
        dom: null //这里的dom会是null
        effectTag: "PLACEMENT"
        parent: {dom: div#root, props: {…}, alternate: null, child: {…}}
        props: {name: 'foo', children: Array(0)}
        type: ƒ App(props) // type是个函数
      }
    dom: div#root
    props: {children: Array(1)}
  }
*/
function commitRoot() {
  deletions.forEach(commitWork);
  // console.log(wipRoot);
  commitWork(wipRoot.child); // wipRoot:指id为root的根节点

  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  // 如果是函数组件，则没有dom属性，所以需要一路向上找到有dom属性的父组件
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  //添加节点
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom) {
    //修改节点
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    //删除节点
    commitDeletion(fiber, domParent);
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  // fiber如果是函数组件，则没有dom结构，dom结构会存储在child上
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}
//*****************************************************commit方法结束***************************************************************

//====================================================实现render方法开始============================================================
let nextUnitOfWork = null;
let wipRoot = null; // 当前需要渲染的fiber树
let currentRoot = null; // 上一次渲染的fiber树
let deletions = null;

// 该方法用于参数的初始化
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot, // 上一次渲染的fiber树
  };
  nextUnitOfWork = wipRoot;
  deletions = [];
}

//****************************************************实现render方法结束*************************************************************

export const MyReact = {
  createElement,
  render,
};
