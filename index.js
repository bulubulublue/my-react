import { MyReact } from './utils';

/** @jsx MyReact.createElement */
function Counter() {
  const [state, setState] = MyReact.useState(1);
  const clickCallback = () => {
    setState(c => c + 1);
  };
  return <h1 onClick={clickCallback}>Count: {state}</h1>;
}
const element = <Counter />;

const container = document.getElementById('root');
MyReact.render(element, container);

/*
  hooks


*/
