import { MyReact } from './utils';

/** @jsx MyReact.createElement */
function App(props) {
  return <h1>Hi {props.name}</h1>;
}

const element = <App name="foo" />;

/*
  以上代码jsx转化之后，会变成：
  function App(props) {
    return MyReact.createElement(
      "h1",
      null,
      "Hi ",
      props.name
    )
  }
  const element = MyReact.createElement(App, {
    name: "foo",
  })

  这个和一般的jsx元素区别在于：
  1. 节点对象需要通过调用方法获取，而不是直接从props的children对象中获得
  2. 函数组件的fiber对象没有dom属性

*/

const container = document.getElementById('root');
MyReact.render(element, container);
