import { MyReact } from './utils';

/** @jsx MyReact.createElement */
const element = <div id="foo">123</div>;

const container = document.getElementById('root');
MyReact.render(element, container);

setTimeout(() => {
  /** @jsx MyReact.createElement */
  const elementNew = <div id="foo">456</div>;

  MyReact.render(elementNew, container);
}, 5000);
